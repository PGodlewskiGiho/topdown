#!/usr/bin/env python3
"""Generate detailed top-down tree sprites (Pillow → PNG).

Default output: assets/trees-preview/  (review before swapping into the game)
Use --production to write assets/trees/ directly.
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"

OUT_W, OUT_H = 96, 128
SS = 1
W, H = OUT_W * SS, OUT_H * SS
CX = W // 2
SPLIT_Y = round(86 / 128 * H)


def set_supersample(ss: int):
    """Switch canvas resolution (SS=4 → 384×512 native PNG)."""
    global SS, W, H, CX, SPLIT_Y
    SS = max(1, ss)
    W, H = OUT_W * SS, OUT_H * SS
    CX = W // 2
    SPLIT_Y = round(86 / 128 * H)


def s(v: float) -> float:
    return v * SS


def sc(base: int) -> int:
    return int(base * SS * 1.55)


def rng_for(name: str, variant: int = 0) -> random.Random:
    h = sum(ord(c) * (i + 1) for i, c in enumerate(name)) + variant * 997
    return random.Random(h)


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_col(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


def blob_points(
    cx: float, cy: float, rx: float, ry: float, r: random.Random,
    n: int = 24, wobble: float = 0.14,
) -> list[tuple[float, float]]:
    pts = []
    phase = r.random() * 6.283
    for i in range(n):
        a = (i / n) * 6.283
        rad = 1.0 + wobble * math.sin(a * 3 + phase) + wobble * 0.6 * math.sin(a * 5 + phase * 1.7)
        pts.append((cx + math.cos(a) * rx * rad, cy + math.sin(a) * ry * rad))
    return pts


def in_ellipse(x: float, y: float, cx: float, cy: float, rx: float, ry: float, margin: float = 1.0) -> bool:
    dx, dy = (x - cx) / (rx * margin), (y - cy) / (ry * margin)
    return dx * dx + dy * dy <= 1.0


def pick_foliage_color(
    x: float, y: float, cx: float, cy: float, palette: dict[str, tuple[int, int, int]], r: random.Random,
) -> tuple[int, int, int]:
    scale = max(SS, 1)
    lit = -0.55 * ((x - cx) / (28.0 * scale)) - 0.65 * ((y - cy) / (24.0 * scale))
    roll = r.random()
    if lit > 0.28:
        return palette["hi"] if roll < 0.38 else palette["h"]
    if lit > 0.06:
        return palette["l"] if roll < 0.42 else palette["m"]
    if lit > -0.18:
        return palette["m"] if roll < 0.48 else palette["d"]
    return palette["d"] if roll < 0.58 else palette["dk"]


def draw_cluster_foliage(
    draw: ImageDraw.ImageDraw,
    cx: float, cy: float, rx: float, ry: float,
    r: random.Random,
    palette: dict[str, tuple[int, int, int]],
    stroke_count: int,
):
    """Build one leafy mass: dark base → dense interior strokes → mid body → lit cap with more strokes."""
    # 1 — structural under-mass (jagged outer wobble)
    pts = blob_points(cx, cy, rx * 1.05, ry * 1.03, r, wobble=0.22)
    draw.polygon(pts, fill=palette["dk"])

    # 2 — interior texture strokes (radial + tangential, clipped to ellipse)
    for _ in range(stroke_count):
        a = r.random() * 6.283
        rad = math.sqrt(r.random()) * 0.88
        x = cx + math.cos(a) * rx * rad
        y = cy + math.sin(a) * ry * rad
        if not in_ellipse(x, y, cx, cy, rx, ry, 0.96):
            continue
        col = pick_foliage_color(x, y, cx, cy, palette, r)
        # mostly tangential (leaf clusters follow surface), slight outward bias on lit side
        tangent = a + math.pi / 2 + (r.random() - 0.5) * 0.35
        length = r.uniform(s(1.8), s(4.8))
        if col in (palette["hi"], palette["h"], palette["l"]):
            tangent += -0.25  # lit leaves tilt NW
        x2 = x + math.cos(tangent) * length
        y2 = y + math.sin(tangent) * length * 0.82
        if in_ellipse(x2, y2, cx, cy, rx * 1.02, ry * 1.02, 1.05):
            draw.line([(x, y), (x2, y2)], fill=col, width=1)

    # 3 — mid body (smaller blob, sits on top of stroke texture)
    pts = blob_points(cx, cy, rx * 0.92, ry * 0.90, r, wobble=0.13)
    draw.polygon(pts, fill=palette["m"])

    # 4 — second pass of finer strokes in mid/upper volume
    for _ in range(stroke_count // 2):
        a = r.random() * 6.283
        rad = math.sqrt(r.random()) * 0.78
        x = cx + math.cos(a) * rx * rad * 0.92
        y = cy + math.sin(a) * ry * rad * 0.88 - ry * 0.08
        col = pick_foliage_color(x, y, cx, cy, palette, r)
        tangent = a + math.pi / 2 + (r.random() - 0.5) * 0.4
        length = r.uniform(s(1.2), s(3.2))
        x2 = x + math.cos(tangent) * length
        y2 = y + math.sin(tangent) * length * 0.8
        draw.line([(x, y), (x2, y2)], fill=col, width=1)

    # 5 — NW lit cap integrated with short highlight strokes (not a separate shiny dome)
    lx, ly = cx - rx * 0.22, cy - ry * 0.28
    for cap_rx, cap_ry, tone in [(rx * 0.58, ry * 0.48, palette["l"]), (rx * 0.32, ry * 0.24, palette["h"])]:
        pts = blob_points(lx, ly, cap_rx, cap_ry, r, n=14, wobble=0.07)
        draw.polygon(pts, fill=tone)
        for _ in range(max(12, int(cap_rx * 1.8))):
            a = r.random() * 6.283
            rad = math.sqrt(r.random()) * 0.85
            x = lx + math.cos(a) * cap_rx * rad
            y = ly + math.sin(a) * cap_ry * rad
            col = palette["hi"] if r.random() < 0.45 else palette["h"]
            tangent = a + math.pi / 2 - 0.3
            length = r.uniform(s(1.0), s(2.8))
            x2 = x + math.cos(tangent) * length
            y2 = y + math.sin(tangent) * length * 0.75
            draw.line([(x, y), (x2, y2)], fill=col, width=1)

    # 6 — jagged outer fringe: mostly outward leaf/twig strokes on the silhouette
    n_fr = max(28, int(rx * 2.4))
    for _ in range(n_fr):
        a = r.uniform(0, 6.283)
        edge = r.uniform(0.88, 1.06)
        x = cx + math.cos(a) * rx * edge
        y = cy + math.sin(a) * ry * edge
        if r.random() < 0.72:
            outward = a + r.uniform(-0.65, 0.65)
            length = r.uniform(s(2.5), s(7.0))
            col = palette["m"] if r.random() < 0.45 else palette["d"]
            if r.random() < 0.22:
                col = palette["l"]
        else:
            outward = a + math.pi + r.uniform(-0.35, 0.35)
            length = r.uniform(s(1.5), s(3.5))
            col = palette["dk"] if r.random() < 0.6 else palette["d"]
        x2 = x + math.cos(outward) * length
        y2 = y + math.sin(outward) * length * 0.76
        draw.line([(x, y), (x2, y2)], fill=col, width=max(1, SS - 1))


def draw_trunk_join(
    draw: ImageDraw.ImageDraw,
    browns: dict[str, tuple[int, int, int]],
    width: float,
):
    """Brown wedge at the trunk–canopy join; always hidden under foliage."""
    top_y = SPLIT_Y - s(10)
    mid_y = SPLIT_Y + s(12)
    hw = width * 0.85
    draw.polygon(
        [(CX - hw, mid_y), (CX + hw, mid_y), (CX + hw * 0.35, top_y), (CX - hw * 0.35, top_y)],
        fill=browns["d"],
    )
    draw.polygon(
        [(CX - hw * 0.7, mid_y), (CX + hw * 0.7, mid_y), (CX + hw * 0.25, top_y + s(4)), (CX - hw * 0.25, top_y + s(4))],
        fill=browns["m"],
    )


def draw_canopy_clusters(
    draw: ImageDraw.ImageDraw,
    clusters: list[tuple[float, float, float, float]],
    r: random.Random,
    palette: dict[str, tuple[int, int, int]],
    strokes_per_cluster: int,
    *,
    trunk_collar: tuple[float, float, float, float] | None = None,
    browns: dict[str, tuple[int, int, int]] | None = None,
    trunk_w: float = 9,
    birch_trunk: bool = False,
):
    """Trunk + join wedge first, then foliage on top."""
    if browns is not None:
        draw_trunk(draw, r, browns, trunk_w, birch=birch_trunk)
        draw_trunk_join(draw, browns, trunk_w)
    for cx, cy, rx, ry in clusters:
        draw_cluster_foliage(draw, cx, cy, rx, ry, r, palette, strokes_per_cluster)
    if trunk_collar:
        cx, cy, rx, ry = trunk_collar
        draw_cluster_foliage(draw, cx, cy, rx, ry, r, palette, max(40, strokes_per_cluster // 2))


def draw_pine_tier(
    draw: ImageDraw.ImageDraw,
    cx: float, y0: float, y1: float, hw: float,
    r: random.Random,
    palette: dict[str, tuple[int, int, int]],
    ti: int, tiers: int,
):
    """One fir bough: sawtooth silhouette + interior needle texture (no floating fringe)."""
    teeth = max(7, int(hw * 0.65))
    # dark outer silhouette with jagged bottom
    outer = [(cx, y0 + s(1))]
    for i in range(teeth, -1, -1):
        fx = (i / teeth) * 2 - 1
        x = cx + fx * hw * 0.93
        dip = s(2.5) if i % 2 == 0 else 0.0
        outer.append((x, y1 + dip))
    outer.append((cx, y0 + s(1)))
    draw.polygon(outer, fill=palette["dk"])

    # mid body — slightly inset, needles grow inside this volume
    mid_y1 = y1 - s(1)
    draw.polygon([(cx, y0 + s(3)), (cx - hw * 0.80, mid_y1), (cx + hw * 0.72, mid_y1)], fill=palette["m"])

    # lit upper facet
    u_mid = y0 + (y1 - y0) * 0.42
    draw.polygon([(cx, y0 + s(4)), (cx - hw * 0.42, u_mid), (cx + hw * 0.32, u_mid)], fill=palette["l"])

    # interior needles — downward-ish, tied to tier geometry
    n = max(14, int(hw * 2.2))
    for _ in range(n):
        fx = (r.random() * 2 - 1) * hw * 0.82
        u = r.random()
        x = cx + fx
        y = lerp(y0 + s(4), y1, u)
        # stay inside the tier wedge
        max_hw = hw * lerp(0.35, 0.88, u)
        if abs(fx) > max_hw:
            continue
        lit = -fx / hw * 0.4 - (y - y0) / max(y1 - y0, 1) * 0.35
        if lit > 0.12:
            col = palette["hi"] if r.random() < 0.35 else palette["h"]
        elif lit > -0.1:
            col = palette["l"] if r.random() < 0.4 else palette["m"]
        else:
            col = palette["d"] if r.random() < 0.5 else palette["dk"]
        length = r.uniform(s(2.5), s(5.5))
        x2 = x + fx * 0.06 + r.uniform(-s(0.8), s(0.8))
        y2 = y + length
        draw.line([(x, y), (x2, y2)], fill=col, width=max(1, SS // 2))

    # bottom-edge needles integrated into silhouette (start on edge, not below it)
    for i in range(teeth):
        fx = (i / max(teeth - 1, 1)) * 2 - 1
        x = cx + fx * hw * 0.90
        y = y1 + (s(2.0) if i % 2 == 0 else 0.0)
        length = r.uniform(s(2.0), s(4.5))
        col = palette["h"] if fx < -0.15 else palette["m"] if fx < 0.25 else palette["d"]
        draw.line([(x, y), (x + fx * s(1.2), y + length)], fill=col, width=max(1, SS // 2))


def draw_trunk(
    draw: ImageDraw.ImageDraw,
    r: random.Random,
    browns: dict[str, tuple[int, int, int]],
    width: float,
    birch: bool = False,
):
    base_y = H - s(2)
    top_y = SPLIT_Y - s(8)  # extend well into foliage; leaves drawn after cover this
    hw = width * 0.5
    thw = hw * 0.72

    rw, rh = hw * 2.1, hw * 1.5
    draw.polygon([(CX - rw, base_y), (CX - hw * 0.4, base_y - rh), (CX - hw * 0.1, base_y)], fill=browns["dk"])
    draw.polygon([(CX + rw, base_y), (CX + hw * 0.4, base_y - rh), (CX + hw * 0.1, base_y)], fill=browns["dk"])
    draw.polygon([(CX - hw * 1.2, base_y), (CX, base_y - rh * 0.9), (CX + hw * 0.25, base_y)], fill=browns["d"])

    body = [(CX - hw, base_y), (CX + hw, base_y), (CX + thw, top_y), (CX - thw, top_y)]
    draw.polygon(body, fill=browns["m"])

    if birch:
        draw.polygon([(CX - hw, base_y), (CX - thw, top_y), (CX - thw + 4, top_y), (CX - hw + 3, base_y)], fill=browns["d"])
        for i in range(7):
            u = 0.12 + i * 0.12
            y = lerp(base_y, top_y, u)
            x = CX + (r.random() - 0.5) * hw * 0.3
            draw.line([(x - hw * 0.35, y), (x + hw * 0.35, y)], fill=(40, 35, 30), width=1)
        return

    draw.polygon([(CX - hw, base_y), (CX - thw, top_y), (CX - thw + hw * 0.35, top_y), (CX - hw + hw * 0.3, base_y)], fill=browns["dk"])
    draw.polygon([(CX + hw, base_y), (CX + thw, top_y), (CX + thw - hw * 0.28, top_y), (CX + hw - hw * 0.26, base_y)], fill=browns["l"])

    n = max(6, int(hw * 1.6))
    for i in range(n):
        f = (i + 0.5) / n * 2 - 1
        wob = (r.random() - 0.5) * hw * 0.12
        x0 = CX + f * hw * 0.88
        x1 = CX + (f + wob / hw) * thw * 0.88
        col = browns["dk"] if i % 2 == 0 else (browns["l"] if f > 0.05 else browns["m"])
        draw.line([(x0, base_y - 1), (x1, top_y)], fill=col, width=max(1, int(hw * 0.22)))

    if r.random() < 0.7:
        u = 0.38 + r.random() * 0.28
        ky = lerp(base_y, top_y, u)
        kx = CX + (r.random() - 0.5) * hw * 0.5
        kr = hw * (0.28 + r.random() * 0.18)
        draw.ellipse([kx - kr, ky - kr * 1.2, kx + kr, ky + kr * 1.2], fill=browns["dk"])
        draw.ellipse([kx - kr * 0.4, ky - kr * 0.5, kx + kr * 0.15, ky + kr * 0.2], fill=browns["l"])


def make_deciduous(variant: int = 0) -> Image.Image:
    r = rng_for("deciduous", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#0a2010", "d": "#183820", "m": "#286830", "l": "#388838", "h": "#50a848", "hi": "#70c858"
    }.items()}
    browns = {k: hex_rgb(v) for k, v in {"dk": "#2a1810", "d": "#403020", "m": "#584830", "l": "#786048"}.items()}
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    clusters = [
        (CX - s(22), s(36), s(24), s(20)), (CX + s(20), s(34), s(22), s(18)), (CX, s(24), s(26), s(22)),
        (CX - s(18), s(66), s(26), s(22)), (CX + s(14), s(68), s(22), s(20)),
    ]
    draw_canopy_clusters(
        draw, clusters, r, pal, sc(95),
        trunk_collar=(CX, s(82), s(26), s(18)), browns=browns, trunk_w=s(9),
    )
    return img


def make_oak(variant: int = 0) -> Image.Image:
    r = rng_for("oak", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#081808", "d": "#142818", "m": "#204828", "l": "#306830", "h": "#488840", "hi": "#60a850"
    }.items()}
    browns = {k: hex_rgb(v) for k, v in {"dk": "#281808", "d": "#382818", "m": "#503828", "l": "#685040"}.items()}
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    clusters = [
        (CX - s(28), s(40), s(28), s(22)), (CX + s(26), s(38), s(26), s(20)), (CX, s(28), s(30), s(24)),
        (CX - s(20), s(66), s(30), s(24)), (CX + s(18), s(68), s(26), s(22)),
    ]
    draw_canopy_clusters(
        draw, clusters, r, pal, sc(110),
        trunk_collar=(CX, s(84), s(28), s(20)), browns=browns, trunk_w=s(11),
    )
    return img


def make_birch(variant: int = 0) -> Image.Image:
    r = rng_for("birch", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#0c2010", "d": "#183820", "m": "#286830", "l": "#409040", "h": "#58a848", "hi": "#78c860"
    }.items()}
    browns = {k: hex_rgb(v) for k, v in {"dk": "#b8b4a8", "d": "#d8d4c8", "m": "#ece8dc", "l": "#faf8f0"}.items()}
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    clusters = [
        (CX, s(44), s(26), s(28)),
        (CX - s(16), s(58), s(22), s(24)),
        (CX + s(14), s(60), s(20), s(22)),
        (CX, s(74), s(26), s(22)),
    ]
    draw_canopy_clusters(draw, clusters, r, pal, sc(80), trunk_collar=(CX, s(86), s(22), s(16)), browns=browns, trunk_w=s(7), birch_trunk=True)
    return img


def make_bush(variant: int = 0) -> Image.Image:
    r = rng_for("bush", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#0a2010", "d": "#183820", "m": "#287830", "l": "#409040", "h": "#58a848", "hi": "#70c050"
    }.items()}
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    clusters = [(CX - s(12), s(68), s(20), s(14)), (CX + s(10), s(66), s(18), s(12)), (CX, s(58), s(22), s(16))]
    draw_canopy_clusters(draw, clusters, r, pal, sc(65))
    return img


def make_conifer(
    r: random.Random,
    palette: dict[str, tuple[int, int, int]],
    browns: dict[str, tuple[int, int, int]],
    *,
    tiers: int = 5,
    top_y: float = 14,
    base_extra: float = 8,
    trunk_w: float = 7,
    hw_base: float = 6,
    hw_grow: float = 38,
) -> Image.Image:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    top = s(top_y)
    base_y = SPLIT_Y + s(base_extra)
    tw = s(trunk_w)
    draw_trunk(draw, r, browns, tw)
    draw_trunk_join(draw, browns, tw)
    for ti in range(tiers):
        t0 = ti / tiers
        t1 = (ti + 1) / tiers
        y0 = lerp(top, base_y, t0)
        y1 = lerp(top, base_y, t1 + 0.06)
        hw = s(hw_base) + s(hw_grow) * t1
        draw_pine_tier(draw, CX, y0, y1, hw, r, palette, ti, tiers)
    return img


def make_pine(variant: int = 0) -> Image.Image:
    r = rng_for("pine", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#081008", "d": "#102818", "m": "#183820", "l": "#286830", "h": "#388840", "hi": "#50a848"
    }.items()}
    browns = {k: hex_rgb(v) for k, v in {"dk": "#281808", "d": "#382818", "m": "#483020", "l": "#604830"}.items()}
    return make_conifer(r, pal, browns, tiers=5, top_y=14, base_extra=8, trunk_w=7, hw_base=6, hw_grow=38)


def make_spruce(variant: int = 0) -> Image.Image:
    r = rng_for("spruce", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#060c08", "d": "#0c1810", "m": "#142820", "l": "#1e3830", "h": "#286040", "hi": "#387850"
    }.items()}
    browns = {k: hex_rgb(v) for k, v in {"dk": "#221810", "d": "#302418", "m": "#403028", "l": "#584838"}.items()}
    return make_conifer(r, pal, browns, tiers=6, top_y=10, base_extra=5, trunk_w=6, hw_base=4, hw_grow=28)


def make_maple(variant: int = 0) -> Image.Image:
    r = rng_for("maple", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#141008", "d": "#283018", "m": "#405028", "l": "#607838", "h": "#88a048", "hi": "#c08838"
    }.items()}
    browns = {k: hex_rgb(v) for k, v in {"dk": "#281808", "d": "#3a2818", "m": "#503828", "l": "#6a5040"}.items()}
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    clusters = [
        (CX - s(24), s(34), s(26), s(22)), (CX + s(22), s(32), s(24), s(20)), (CX, s(22), s(28), s(24)),
        (CX - s(20), s(62), s(28), s(24)), (CX + s(16), s(64), s(26), s(22)), (CX, s(48), s(22), s(18)),
    ]
    draw_canopy_clusters(
        draw, clusters, r, pal, sc(108),
        trunk_collar=(CX, s(82), s(24), s(18)), browns=browns, trunk_w=s(9),
    )
    return img


def make_willow(variant: int = 0) -> Image.Image:
    r = rng_for("willow", variant)
    pal = {k: hex_rgb(v) for k, v in {
        "dk": "#182818", "d": "#283828", "m": "#385838", "l": "#507848", "h": "#689858", "hi": "#88b868"
    }.items()}
    browns = {k: hex_rgb(v) for k, v in {"dk": "#3a3020", "d": "#504028", "m": "#685038", "l": "#806848"}.items()}
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Drooping crown: wide low masses + smaller upper cap
    clusters = [
        (CX - s(30), s(72), s(30), s(18)), (CX + s(28), s(74), s(28), s(16)),
        (CX, s(78), s(34), s(20)), (CX - s(18), s(58), s(22), s(20)), (CX + s(16), s(56), s(20), s(18)),
        (CX, s(38), s(18), s(16)),
    ]
    draw_canopy_clusters(
        draw, clusters, r, pal, sc(92),
        trunk_collar=(CX, s(84), s(22), s(14)), browns=browns, trunk_w=s(6),
    )
    return img


GENERATORS = {
    "deciduous": make_deciduous,
    "oak": make_oak,
    "birch": make_birch,
    "pine": make_pine,
    "spruce": make_spruce,
    "maple": make_maple,
    "willow": make_willow,
    "bush": make_bush,
}


def hd_kind_meta(fname: str) -> dict:
    return {
        "file": fname,
        "width": W,
        "height": H,
        "splitY": SPLIT_Y,
        "anchorX": W // 2,
        "anchorY": H - 1,
        "hd": True,
    }


def write_preview_html(out: Path, meta: dict):
    html = ROOT / "tree-preview.html"
    rel = out.relative_to(ROOT).as_posix()
    kinds = list(meta["kinds"].keys())
    cards = "\n".join(
        f'    <figure><img src="{rel}/{meta["kinds"][k]["file"]}" alt="{k}"><figcaption>{k}</figcaption></figure>'
        for k in kinds
    )
    html.write_text(f"""<!DOCTYPE html>
<html lang="pl"><head>
<meta charset="utf-8"><title>Tree preview — TOPDOWN CITY</title>
<style>
  body {{ margin:0; background:#1a2418; color:#c8dcc0; font:14px/1.4 monospace; }}
  header {{ padding:16px 20px; border-bottom:1px solid #2a4030; }}
  h1 {{ margin:0 0 6px; font-size:18px; font-weight:600; }}
  p {{ margin:0; opacity:.75; max-width:720px; }}
  .grid {{ display:flex; flex-wrap:wrap; gap:28px; padding:24px; justify-content:center; }}
  figure {{ margin:0; text-align:center; background:#0e160c; border:1px solid #2a4030; border-radius:8px; padding:16px; }}
  figure img {{ image-rendering: pixelated; image-rendering: crisp-edges; width:192px; height:256px; }}
  figcaption {{ margin-top:10px; letter-spacing:.06em; text-transform:uppercase; font-size:12px; }}
</style></head><body>
<header>
  <h1>Podgląd drzew (v3 — połączony pień z koroną)</h1>
  <p>Korona nachodzi na pień (pień + brązowy klin pod spodem, potem liście). Poprzednia wersja miała przerwę, bo klastry były za wysoko, a pień rysowany <em>po</em> koronie. Folder: <strong>{rel}/</strong> — gra bez zmian.</p>
</header>
<div class="grid">
{cards}
</div>
</body></html>
""", encoding="utf-8")
    print("wrote", html)


def main():
    ap = argparse.ArgumentParser(description="Generate tree PNG sprites")
    ap.add_argument("--production", action="store_true", help="Write to assets/trees/ (game) instead of preview folder")
    ap.add_argument("--out", type=Path, help="Custom output directory")
    ap.add_argument("--trial", metavar="KIND", help="Generate one hi-res trial PNG (e.g. deciduous)")
    ap.add_argument("--hd-all", action="store_true", help="Generate all kinds at hi-res into assets/trees/")
    ap.add_argument("--supersample", type=int, default=4, help="Supersample factor for --trial/--hd-all (default 4 → 384×512)")
    args = ap.parse_args()

    if args.hd_all:
        set_supersample(args.supersample)
        out = args.out or (ROOT / "assets" / "trees")
        out.mkdir(parents=True, exist_ok=True)
        meta = {
            "width": W,
            "height": H,
            "splitY": SPLIT_Y,
            "anchorX": W // 2,
            "anchorY": H - 1,
            "crownR": 36 * SS,
            "kinds": {},
        }
        for kind, fn in GENERATORS.items():
            fname = f"{kind}.png"
            path = out / fname
            fn(0).save(path, "PNG")
            meta["kinds"][kind] = hd_kind_meta(fname)
            print("wrote", path, f"({W}×{H})")
        meta_path = out / "meta.json"
        meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        print("wrote", meta_path)
        return

    if args.trial:
        kind = args.trial
        if kind not in GENERATORS:
            ap.error(f"unknown kind {kind!r}; choose from {', '.join(GENERATORS)}")
        set_supersample(args.supersample)
        out = args.out or (ROOT / "assets" / "trees")
        out.mkdir(parents=True, exist_ok=True)
        fname = f"{kind}-hd.png"
        path = out / fname
        img = GENERATORS[kind](0)
        img.save(path, "PNG")
        kind_meta = {
            "file": fname,
            "width": W,
            "height": H,
            "splitY": SPLIT_Y,
            "anchorX": W // 2,
            "anchorY": H - 1,
            "hd": True,
        }
        print("wrote", path, f"({W}×{H})")
        print("meta snippet for kinds.%s:" % kind)
        print(json.dumps(kind_meta, indent=2))
        return

    if args.out:
        out = args.out
    elif args.production:
        out = ROOT / "assets" / "trees"
    else:
        out = ROOT / "assets" / "trees-preview"

    out.mkdir(parents=True, exist_ok=True)
    meta = {
        "width": OUT_W,
        "height": OUT_H,
        "splitY": round(86 / 128 * OUT_H),
        "anchorX": OUT_W // 2,
        "anchorY": OUT_H - 1,
        "crownR": 36,
        "kinds": {},
    }
    for kind, fn in GENERATORS.items():
        path = out / f"{kind}.png"
        img = fn(0)
        if SS > 1:
            img = img.resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
        img.save(path, "PNG")
        meta["kinds"][kind] = {"file": f"{kind}.png"}
        print("wrote", path)

    meta_path = out / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("wrote", meta_path)

    if not args.production and not args.out:
        write_preview_html(out, meta)


if __name__ == "__main__":
    main()
