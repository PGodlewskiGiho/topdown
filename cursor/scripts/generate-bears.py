#!/usr/bin/env python3
"""Top-down bear sprites — single unified silhouette (not stacked circles)."""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"
OUT = ROOT / "assets" / "bears"

FW, FH = 88, 88
SS = 4
W, H = FW * SS, FH * SS
N_WALK = 4
N_FRAMES = N_WALK + 1
ANCHOR_X = W // 2
ANCHOR_Y = H - SS * 3


def s(v: float) -> float:
    return v * SS


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def inset_poly(pts: list[tuple[float, float]], cx: float, cy: float, k: float):
    return [(cx + (x - cx) * k, cy + (y - cy) * k) for x, y in pts]


def bear_outline(cx: float, cy: float, *, attack: bool = False, walk_t: float = 0.0) -> list[tuple[float, float]]:
    """One closed rug-silhouette: head, barrel chest, haunches — not separate blobs."""
    step = math.sin(walk_t * math.pi * 2) * 0.06
    nose_x = 34 if attack else 30
    nose_y = 0
    spread = 1.12 if attack else 1.0

    def p(x, y):
        return (cx + s(x * spread), cy + s(y * spread + y * step * 0.15))

    # clockwise from nose — continuous bear pelt shape
    return [
        p(nose_x, nose_y),           # snout tip
        p(nose_x - 4, -5),           # upper jaw
        p(22, -14),                  # shoulder / neck right
        p(6, -18),                   # rib cage right
        p(-10, -16),                 # flank right
        p(-20, -10 - step * 8),      # haunch right (walk shift)
        p(-24, -2),                  # rear top
        p(-26, 5),                   # rump
        p(-24, 12),                  # rear bottom
        p(-20, 16 + step * 8),       # haunch left
        p(-10, 18),                  # flank left
        p(6, 20),                    # rib left
        p(22, 16),                   # shoulder left
        p(nose_x - 3, 7),            # lower jaw
    ]


def leg_quads(cx: float, cy: float, *, attack: bool = False, walk_t: float = 0.0) -> list[list[tuple[float, float]]]:
    """Four legs as small trapezoids attached to body, not circles."""
    ph = walk_t * math.pi * 2
    fwd = [math.sin(ph), math.sin(ph + math.pi), math.sin(ph + math.pi), math.sin(ph)]
    legs = []
    bases = [
        (14, 13, 1.0 if attack else 0.55),
        (14, -13, 1.0 if attack else 0.55),
        (-14, 14, 0.35),
        (-14, -14, 0.35),
    ]
    for i, (bx, by, reach) in enumerate(bases):
        fx = fwd[i] * (10 if attack else 6)
        lx, ly = cx + s(bx + fx * reach), cy + s(by)
        hw, hl = s(5.5), s(7.5)
        sign = 1 if by > 0 else -1
        legs.append([
            (lx - hw, ly - hl * 0.3),
            (lx + hw, ly - hl * 0.3),
            (lx + hw * 0.7 + s(fx * 0.4), ly + hl * sign),
            (lx - hw * 0.7 + s(fx * 0.4), ly + hl * sign),
        ])
    return legs


def fur_strokes_in_shape(draw, pts, r, palette, count: int):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    rx = (max(xs) - min(xs)) * 0.38
    ry = (max(ys) - min(ys)) * 0.38
    for _ in range(count):
        a = r.random() * 6.283
        rad = math.sqrt(r.random()) * 0.82
        x = cx + math.cos(a) * rx * rad
        y = cy + math.sin(a) * ry * rad
        lit = -0.42 * ((x - cx) / rx) - 0.48 * ((y - cy) / ry)
        col = palette["l" if lit > 0.05 else "d" if lit > -0.15 else "dk"]
        if lit > 0.18 and r.random() < 0.35:
            col = palette["h"]
        tangent = a + math.pi / 2 + (r.random() - 0.5) * 0.4
        ln = r.uniform(s(1.0), s(2.8))
        x2 = x + math.cos(tangent) * ln
        y2 = y + math.sin(tangent) * ln * 0.75
        draw.line([(x, y), (x2, y2)], fill=col, width=max(1, SS // 2))


def fringe_strokes(draw, pts, palette, r, n: int = 48):
    m = len(pts)
    for i in range(n):
        t = (i + r.random() * 0.3) / n
        idx = int(t * m) % m
        x0, y0 = pts[idx]
        x1, y1 = pts[(idx + 1) % m]
        u = r.random()
        x, y = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
        nx, ny = x1 - x0, y1 - y0
        ln = math.hypot(nx, ny) or 1
        ox, oy = -ny / ln, nx / ln
        outward = r.uniform(-1, 1)
        x2 = x + ox * outward * s(r.uniform(2.5, 6))
        y2 = y + oy * outward * s(r.uniform(2.5, 6))
        col = palette["m"] if r.random() < 0.5 else palette["d"]
        draw.line([(x, y), (x2, y2)], fill=col, width=max(1, SS // 2))


def draw_claws(draw, quad, palette):
    bx = sum(p[0] for p in quad) / 4
    by = sum(p[1] for p in quad) / 4
    for i in range(-1, 3):
        fx = bx + i * s(2.8)
        fy = by + s(5)
        draw.line([(fx, fy), (fx + s(0.8), fy + s(3.8))], fill=(30, 24, 18), width=max(2, SS // 2))


def draw_bear_frame(draw, r, palette, *, walk_i: int = 0, attack: bool = False):
    cx, cy = W * 0.48, H * 0.50
    walk_t = 0 if attack else walk_i / N_WALK

    draw.ellipse([cx - s(24), cy + s(15), cx + s(24), cy + s(22)], fill=(0, 0, 0, 55))

    outline = bear_outline(cx, cy, attack=attack, walk_t=walk_t)
    mid = inset_poly(outline, cx, cy, 0.82)
    inner = inset_poly(outline, cx, cy, 0.58)

    # single body mass
    draw.polygon(outline, fill=palette["dk"])
    draw.polygon(mid, fill=palette["m"])
    draw.polygon(inner, fill=palette["l"])
    fur_strokes_in_shape(draw, mid, r, palette, int(38 * SS))
    fringe_strokes(draw, outline, palette, r, int(36 * SS))

    # legs — trapezoids, darker
    for quad in leg_quads(cx, cy, attack=attack, walk_t=walk_t):
        draw.polygon(quad, fill=palette["d"])
        draw_claws(draw, quad, palette)

    # muzzle wedge on front of same mass (not a circle)
    mx = cx + s(26 if attack else 24)
    my = cy
    muzzle = [
        (mx, my - s(5)),
        (mx + s(8 if attack else 6), my - s(2)),
        (mx + s(9 if attack else 7), my + s(3)),
        (mx + s(4), my + s(6)),
        (mx - s(2), my + s(4)),
    ]
    draw.polygon(muzzle, fill=palette["snout"])
    draw.ellipse([mx + s(3), my + s(1), mx + s(6), my + s(4)], fill=(20, 14, 10))

    if attack:
        draw.polygon(
            [
                (mx + s(2), my + s(2)),
                (mx + s(10), my + s(3)),
                (mx + s(7), my + s(9)),
                (mx + s(1), my + s(7)),
            ],
            fill=(110, 35, 28),
        )
        draw.line([(mx + s(4), my + s(3)), (mx + s(8), my + s(5))], fill=(230, 220, 200), width=max(1, SS // 2))

    # small ear bumps on silhouette — part of outline feel, not circles
    for ex, ey in [(cx + s(16), cy - s(13)), (cx + s(16), cy + s(13))]:
        draw.polygon(
            [(ex, ey - s(3)), (ex + s(4), ey), (ex, ey + s(3)), (ex - s(3), ey)],
            fill=palette["d"],
        )


VARIANTS = {
    "brown": {
        "dk": "#1e1208", "d": "#362018", "m": "#523020", "l": "#704028", "h": "#905838",
        "snout": "#403020", "snout_l": "#604838",
    },
    "dark": {
        "dk": "#0a0806", "d": "#181410", "m": "#282018", "l": "#383028", "h": "#504840",
        "snout": "#242018", "snout_l": "#383028",
    },
    "cinnamon": {
        "dk": "#2a0c06", "d": "#482018", "m": "#683020", "l": "#884028", "h": "#a85030",
        "snout": "#582818", "snout_l": "#784030",
    },
    "grizzly": {
        "dk": "#221408", "d": "#3c2818", "m": "#583820", "l": "#785030", "h": "#986840",
        "snout": "#503820", "snout_l": "#705040",
    },
}


def make_variant(name: str) -> Image.Image:
    r = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(name)))
    pal = {k: hex_rgb(v) for k, v in VARIANTS[name].items()}
    sheet = Image.new("RGBA", (W * N_FRAMES, H), (0, 0, 0, 0))
    for fi in range(N_FRAMES):
        frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        attack = fi >= N_WALK
        walk_i = fi if not attack else 0
        draw_bear_frame(draw, r, pal, walk_i=walk_i, attack=attack)
        sheet.paste(frame, (fi * W, 0))
    return sheet


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "frameWidth": W,
        "frameHeight": H,
        "frames": N_FRAMES,
        "walkFrames": list(range(N_WALK)),
        "attackFrame": N_WALK,
        "anchorX": ANCHOR_X,
        "anchorY": ANCHOR_Y,
        "variants": {},
    }
    for name in VARIANTS:
        path = OUT / f"bear-{name}.png"
        img = make_variant(name)
        img.save(path, "PNG")
        meta["variants"][name] = {"file": path.name}
        print("wrote", path, img.size)
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
