#!/usr/bin/env python3
"""Top-down bear — compact RPG-style mass (head + barrel + 2 visible front paws).

Refs: NPS grizzly overhead proportions, top-down mob sprites (Admurin/SharkusMK style):
  wide shoulders, blocky head, NO four side-mounted circles, NO segmented stripes.
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
SS = 5
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


def inset(pts, cx, cy, k):
    return [(cx + (x - cx) * k, cy + (y - cy) * k) for x, y in pts]


def outline(cx, cy, *, attack=False, walk_t=0.0):
    """Potato rug: wide shoulders, tapered rump, short snout. Facing +X."""
    wob = math.sin(walk_t * math.pi * 2) * s(2.5)
    a = 1.06 if attack else 1.0

    def P(fx, fy):
        x = cx + s(fx * 46)
        y = cy + s(fy * 36 * a)
        if fx < 0.15:
            x += wob * (1 if fy > 0 else -1) * 0.3
        return (x, y)

    return [
        P(0.82, 0.0),
        P(0.72, -0.12),
        P(0.58, -0.28),
        P(0.40, -0.46),
        P(0.18, -0.50),
        P(-0.02, -0.46),
        P(-0.22, -0.36),
        P(-0.42, -0.24),
        P(-0.58, -0.10),
        P(-0.68, 0.02),
        P(-0.70, 0.12),
        P(-0.62, 0.22),
        P(-0.48, 0.32),
        P(-0.28, 0.38),
        P(-0.06, 0.40),
        P(0.16, 0.38),
        P(0.36, 0.32),
        P(0.54, 0.22),
        P(0.68, 0.12),
        P(0.76, 0.04),
    ]


def claw_marks(draw, cx, cy, palette, *, attack=False, walk_t=0.0):
    """Tiny claws on silhouette edge — not separate leg blobs."""
    ph = walk_t * math.pi * 2
    marks = [
        (0.38, 0.44, math.sin(ph) * s(2)),
        (0.38, -0.44, math.sin(ph + math.pi) * s(2)),
        (-0.28, 0.36, math.sin(ph + math.pi) * s(1.5)),
        (-0.28, -0.36, math.sin(ph) * s(1.5)),
    ]
    if attack:
        marks[0] = (0.52, 0.48, s(4))
        marks[1] = (0.52, -0.48, s(4))
    for fx, fy, reach in marks:
        bx = cx + s(fx * 46) + reach
        by = cy + s(fy * 36)
        for i in (-1, 0, 1):
            draw.line(
                [(bx + i * s(1.8), by), (bx + i * s(1.8) + s(1.2), by + s(3.5))],
                fill=(24, 18, 12),
                width=max(1, SS // 2),
            )


def draw_bear_frame(draw, r, palette, *, walk_i=0, attack=False):
    cx, cy = W * 0.50, H * 0.52
    walk_t = 0 if attack else walk_i / N_WALK
    pts = outline(cx, cy, attack=attack, walk_t=walk_t)

    draw.ellipse([cx - s(26), cy + s(13), cx + s(26), cy + s(19)], fill=(0, 0, 0, 45))

    draw.polygon(pts, fill=palette["dk"])
    draw.polygon(inset(pts, cx, cy, 0.88), fill=palette["m"])
    draw.polygon(inset(pts, cx, cy, 0.68), fill=palette["l"])

    # NW lit shoulder (asymmetric patch, not a circle)
    sh = [
        (cx + s(2), cy - s(16)),
        (cx + s(18), cy - s(14)),
        (cx + s(14), cy - s(4)),
        (cx + s(-2), cy - s(6)),
    ]
    draw.polygon(sh, fill=palette["h"])

    claw_marks(draw, cx, cy, palette, attack=attack, walk_t=walk_t)

    # blocky muzzle
    mx = cx + s(20 if attack else 18)
    my = cy
    draw.polygon(
        [
            (mx + s(7 if attack else 5), my - s(5)),
            (mx + s(9 if attack else 7), my + s(1)),
            (mx + s(5 if attack else 4), my + s(6)),
            (mx - s(3), my + s(4)),
            (mx - s(5), my),
            (mx - s(3), my - s(4)),
        ],
        fill=palette["snout"],
    )
    draw.ellipse([mx + s(1), my + s(1), mx + s(4), my + s(4)], fill=(16, 10, 6))

    if attack:
        draw.polygon(
            [(mx + s(2), my + s(2)), (mx + s(8), my + s(3)), (mx + s(5), my + s(8)), (mx + s(0), my + s(6))],
            fill=(90, 28, 20),
        )

    for ex, ey in [(cx + s(12), cy - s(13)), (cx + s(12), cy + s(13))]:
        draw.polygon([(ex, ey - s(2)), (ex + s(3), ey), (ex, ey + s(2)), (ex - s(2), ey - s(0.5))], fill=palette["d"])


VARIANTS = {
    "brown": {"dk": "#1a1008", "d": "#342018", "m": "#503020", "l": "#684028", "h": "#886038", "snout": "#3c2818"},
    "dark": {"dk": "#080604", "d": "#161210", "m": "#262018", "l": "#363028", "h": "#484038", "snout": "#201810"},
    "cinnamon": {"dk": "#280a04", "d": "#441c10", "m": "#642c18", "l": "#843c24", "h": "#a04c2c", "snout": "#502818"},
    "grizzly": {"dk": "#1c1008", "d": "#382818", "m": "#543820", "l": "#704830", "h": "#906040", "snout": "#483020"},
}


def make_variant(name: str) -> Image.Image:
    r = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(name)))
    pal = {k: hex_rgb(v) for k, v in VARIANTS[name].items()}
    sheet = Image.new("RGBA", (W * N_FRAMES, H), (0, 0, 0, 0))
    for fi in range(N_FRAMES):
        frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        draw_bear_frame(draw, r, pal, walk_i=fi if fi < N_WALK else 0, attack=fi >= N_WALK)
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
