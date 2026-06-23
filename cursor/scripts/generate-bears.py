#!/usr/bin/env python3
"""Generate top-down bear sprite sheets (Pillow → PNG).

Each variant: horizontal strip — 4 walk frames + 1 attack frame.
Bears face +X (right); game rotates by heading angle.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"
OUT = ROOT / "assets" / "bears"

FW, FH = 96, 80
SS = 4
W, H = FW * SS, FH * SS
N_WALK = 4
N_ATTACK = 1
N_FRAMES = N_WALK + N_ATTACK
ANCHOR_X = W // 2
ANCHOR_Y = H - SS * 2


def s(v: float) -> float:
    return v * SS


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def blob_points(cx, cy, rx, ry, r, n=20, wobble=0.12):
    pts = []
    ph = r.random() * 6.283
    for i in range(n):
        a = (i / n) * 6.283
        rad = 1 + wobble * math.sin(a * 3 + ph) + wobble * 0.5 * math.sin(a * 5 + ph * 1.3)
        pts.append((cx + math.cos(a) * rx * rad, cy + math.sin(a) * ry * rad))
    return pts


def fur_strokes(draw, cx, cy, rx, ry, r, palette, count: int):
    scale = max(SS, 1)
    for _ in range(count):
        a = r.random() * 6.283
        rad = math.sqrt(r.random()) * 0.9
        x = cx + math.cos(a) * rx * rad
        y = cy + math.sin(a) * ry * rad
        lit = -0.5 * ((x - cx) / (rx * 1.1)) - 0.55 * ((y - cy) / (ry * 1.1))
        if lit > 0.15:
            col = palette["hi"] if r.random() < 0.4 else palette["h"]
        elif lit > -0.05:
            col = palette["l"] if r.random() < 0.45 else palette["m"]
        else:
            col = palette["d"] if r.random() < 0.55 else palette["dk"]
        tangent = a + math.pi / 2 + (r.random() - 0.5) * 0.5
        ln = r.uniform(s(1.4), s(4.2))
        x2 = x + math.cos(tangent) * ln
        y2 = y + math.sin(tangent) * ln * 0.85
        draw.line([(x, y), (x2, y2)], fill=col, width=max(1, SS // 2))


def draw_paw(draw, x, y, palette, forward: float = 0):
    hw, hh = s(5.5), s(4.2)
    y += forward
    draw.ellipse([x - hw, y - hh, x + hw, y + hh], fill=palette["dk"])
    draw.ellipse([x - hw * 0.75, y - hh * 0.65, x + hw * 0.75, y + hh * 0.55], fill=palette["m"])
    for i in range(3):
        px = x + (i - 1) * s(2.8)
        draw.ellipse([px - s(1.1), y - hh * 0.35, px + s(1.1), y + s(0.8)], fill=palette["dk"])


def draw_bear_frame(
    draw: ImageDraw.ImageDraw,
    r: random.Random,
    palette: dict,
    *,
    walk_i: int = 0,
    attack: bool = False,
):
    """Top-down bear facing +X. Anchor feet near bottom center."""
    cx, cy = W * 0.46, H * 0.58
    if attack:
        cy -= s(3)
    # shadow under body
    draw.ellipse([cx - s(28), cy + s(14), cx + s(28), cy + s(22)], fill=(0, 0, 0, 55))

    stride = 0 if attack else walk_i / max(N_WALK, 1)
    ph = stride * math.pi * 2
    leg_f = math.sin(ph) * s(5)
    leg_b = math.sin(ph + math.pi) * s(5)

    # hindquarters
    hx, hy = cx - s(22), cy + s(1)
    pts = blob_points(hx, hy, s(16), s(13), r, wobble=0.1)
    draw.polygon(pts, fill=palette["dk"])
    draw.ellipse([hx - s(14), hy - s(11), hx + s(14), hy + s(11)], fill=palette["d"])

    # back legs
    draw_paw(draw, hx - s(8), cy + s(12) + leg_b * 0.5, palette, leg_b * 0.25)
    draw_paw(draw, hx + s(8), cy + s(12) - leg_b * 0.35, palette, -leg_b * 0.2)

    # torso — elongated, not a circle blob
    tx, ty = cx + s(2), cy - s(1)
    draw.ellipse([tx - s(26), ty - s(14), tx + s(20), ty + s(14)], fill=palette["dk"])
    draw.ellipse([tx - s(23), ty - s(12), tx + s(17), ty + s(12)], fill=palette["m"])
    draw.ellipse([tx - s(12), ty - s(10), tx + s(6), ty + s(2)], fill=palette["l"])
    fur_strokes(draw, tx, ty, s(21), s(12), r, palette, int(48 * SS * 1.1))
    # subtle shoulder mass (no flat disc)
    draw.ellipse([cx + s(6), cy - s(12), cx + s(18), cy - s(2)], fill=palette["h"])

    # front legs
    fx = cx + s(18)
    draw_paw(draw, fx - s(7), cy + s(11) + leg_f * 0.45, palette, leg_f * 0.3)
    draw_paw(draw, fx + s(7), cy + s(11) - leg_f * 0.4, palette, -leg_f * 0.25)

    # head — larger, clearer muzzle
    hx2, hy2 = cx + s(28), cy - s(2)
    if attack:
        hx2 += s(8)
        hy2 -= s(5)
    draw.ellipse([hx2 - s(15), hy2 - s(13), hx2 + s(15), hy2 + s(13)], fill=palette["d"])
    draw.ellipse([hx2 - s(11), hy2 - s(11), hx2 + s(9), hy2 + s(7)], fill=palette["m"])
    fur_strokes(draw, hx2, hy2, s(11), s(10), r, palette, int(22 * SS))

    # ears
    for ex, ey in [(hx2 - s(8), hy2 - s(11)), (hx2 + s(4), hy2 - s(12))]:
        draw.ellipse([ex - s(4), ey - s(3.5), ex + s(4), ey + s(3.5)], fill=palette["dk"])
        draw.ellipse([ex - s(2.5), ey - s(2), ex + s(2), ey + s(2)], fill=palette["l"])

    # snout
    sx, sy = hx2 + s(11), hy2 + s(2)
    if attack:
        sx += s(5)
        sy += s(1)
    draw.ellipse([sx - s(7), sy - s(5), sx + s(7), sy + s(6)], fill=palette["snout"])
    draw.ellipse([sx - s(4), sy - s(3), sx + s(2), sy + s(2)], fill=palette["snout_l"])
    draw.ellipse([sx + s(2), sy + s(0.5), sx + s(4.5), sy + s(3)], fill=(25, 18, 15))

    if attack:
        # open jaw / teeth
        draw.polygon(
            [(sx - s(2), sy + s(2)), (sx + s(8), sy + s(5)), (sx + s(3), sy + s(9)), (sx - s(4), sy + s(6))],
            fill=(120, 35, 30),
        )
        draw.line([(sx + s(1), sy + s(4)), (sx + s(6), sy + s(6))], fill=(240, 230, 210), width=max(1, SS // 2))
        # claws on front paws
        for px in [fx - s(7), fx + s(7)]:
            draw.line([(px, cy + s(6)), (px + s(8), cy + s(2))], fill=palette["dk"], width=max(2, SS // 2))
    else:
        draw.ellipse([hx2 + s(2), hy2 - s(3), hx2 + s(5.5), hy2 - s(0.5)], fill=(30, 22, 18))

    # tail nub
    draw.ellipse([cx - s(30), cy + s(1), cx - s(24), cy + s(6)], fill=palette["dk"])


VARIANTS = {
    "brown": {
        "dk": "#2a1810", "d": "#4a3020", "m": "#6a4830", "l": "#886040", "h": "#a87850", "hi": "#c89868",
        "snout": "#5a4030", "snout_l": "#786048",
    },
    "dark": {
        "dk": "#121010", "d": "#242018", "m": "#383028", "l": "#504840", "h": "#686058", "hi": "#807870",
        "snout": "#302820", "snout_l": "#484038",
    },
    "cinnamon": {
        "dk": "#381810", "d": "#5a3020", "m": "#7a4830", "l": "#986040", "h": "#b87848", "hi": "#d09858",
        "snout": "#684030", "snout_l": "#886050",
    },
    "grizzly": {
        "dk": "#302010", "d": "#504028", "m": "#705838", "l": "#907050", "h": "#b09068", "hi": "#d0b080",
        "snout": "#604830", "snout_l": "#806850",
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
    meta_path = OUT / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("wrote", meta_path)


if __name__ == "__main__":
    main()
