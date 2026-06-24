#!/usr/bin/env python3
"""Generate dense top-down forest grass clump PNGs (Pillow → assets/grass-forest/)."""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"

# Forest floor palette (matches BIOMES.forest / FOREST_GROUND)
PALETTES = {
    "default": {
        "shadow": (14, 32, 12),
        "dk": (26, 56, 24),
        "md": (42, 88, 38),
        "lt": (68, 128, 58),
        "hi": (98, 168, 78),
        "tip": (118, 188, 92),
    },
    "pine": {
        "shadow": (12, 28, 14),
        "dk": (22, 48, 26),
        "md": (36, 72, 40),
        "lt": (58, 108, 62),
        "hi": (82, 138, 72),
        "tip": (96, 158, 86),
    },
    "mossy": {
        "shadow": (18, 38, 16),
        "dk": (32, 62, 30),
        "md": (48, 92, 44),
        "lt": (72, 132, 62),
        "hi": (102, 162, 82),
        "tip": (88, 148, 74),
    },
    "dry": {
        "shadow": (22, 36, 14),
        "dk": (38, 58, 28),
        "md": (52, 82, 38),
        "lt": (78, 118, 52),
        "hi": (108, 148, 68),
        "tip": (138, 118, 58),
    },
    "shade": {
        "shadow": (10, 24, 10),
        "dk": (18, 42, 20),
        "md": (28, 58, 28),
        "lt": (42, 82, 40),
        "hi": (58, 108, 52),
        "tip": (68, 118, 58),
    },
}


def rng_for(name: str, variant: int = 0) -> random.Random:
    h = sum(ord(c) * (i + 1) for i, c in enumerate(name)) + variant * 991
    return random.Random(h)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_col(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


def draw_blade(
    draw: ImageDraw.ImageDraw,
    bx: float,
    by: float,
    height: float,
    lean: float,
    width: float,
    col: tuple[int, int, int],
    alpha: int = 255,
):
    tip_x = bx + lean
    tip_y = by - height
    mid_x = bx + lean * 0.45
    mid_y = by - height * 0.55
    fill = (*col, alpha)
    draw.polygon(
        [(bx - width, by), (bx + width, by), (mid_x + width * 0.55, mid_y), (tip_x, tip_y), (mid_x - width * 0.55, mid_y)],
        fill=fill,
    )


def pick_blade_color(pal: dict, lit: float, r: random.Random) -> tuple[int, int, int]:
    roll = r.random()
    if lit > 0.35:
        return pal["hi"] if roll < 0.45 else pal["tip"] if roll < 0.78 else pal["lt"]
    if lit > 0.12:
        return pal["lt"] if roll < 0.42 else pal["md"] if roll < 0.82 else pal["hi"]
    if lit > -0.15:
        return pal["md"] if roll < 0.48 else pal["dk"] if roll < 0.85 else pal["lt"]
    return pal["dk"] if roll < 0.62 else pal["shadow"]


def draw_ground_shadow(draw: ImageDraw.ImageDraw, cx: float, cy: float, rx: float, ry: float):
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(8, 18, 6, 72))


def clump_dense(name: str, w: int, h: int, blade_count: int, pal_key: str, spread: float = 1.0) -> Image.Image:
    pal = PALETTES[pal_key]
    r = rng_for(name)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    ax, ay = w // 2, h - 2
    draw_ground_shadow(draw, ax, ay + 1, w * 0.34 * spread, h * 0.07)

    for i in range(blade_count):
        t = i / max(1, blade_count - 1)
        bx = ax + (r.random() - 0.5) * w * 0.72 * spread
        by = ay - r.random() * 2.5
        bh = h * (0.42 + r.random() * 0.48)
        lean = (r.random() - 0.5) * w * 0.22
        bw = 0.9 + r.random() * 1.4
        lit = -lean * 0.018 - (bx - ax) * 0.012 + (r.random() - 0.5) * 0.2
        col = pick_blade_color(pal, lit, r)
        draw_blade(draw, bx, by, bh, lean, bw, col, alpha=220 + int(r.random() * 35))

    # second pass — shorter under-blades for density
    for _ in range(blade_count // 2):
        bx = ax + (r.random() - 0.5) * w * 0.55 * spread
        by = ay - r.random() * 1.2
        bh = h * (0.22 + r.random() * 0.28)
        lean = (r.random() - 0.5) * w * 0.16
        col = lerp_col(pal["dk"], pal["md"], r.random())
        draw_blade(draw, bx, by, bh, lean, 0.7 + r.random() * 0.8, col, alpha=190)

    return img


def clump_tall(name: str, w: int, h: int, pal_key: str = "default") -> Image.Image:
    pal = PALETTES[pal_key]
    r = rng_for(name)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    ax, ay = w // 2, h - 2
    draw_ground_shadow(draw, ax, ay + 1, w * 0.28, h * 0.06)
    n = 14 + (r.randint(0, 8))
    for i in range(n):
        bx = ax + (r.random() - 0.5) * w * 0.55
        by = ay
        bh = h * (0.55 + r.random() * 0.42)
        lean = (r.random() - 0.5) * w * 0.18
        lit = -lean * 0.02 - (bx - ax) * 0.015
        col = pick_blade_color(pal, lit, r)
        draw_blade(draw, bx, by, bh, lean, 0.8 + r.random() * 0.9, col)
    return img


def clump_wispy(name: str, w: int, h: int, pal_key: str = "default") -> Image.Image:
    pal = PALETTES[pal_key]
    r = rng_for(name)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    ax, ay = w // 2, h - 2
    draw_ground_shadow(draw, ax, ay + 1, w * 0.38, h * 0.06)
    for _ in range(18 + r.randint(0, 10)):
        bx = ax + (r.random() - 0.5) * w * 0.85
        by = ay - r.random() * 2
        bh = h * (0.35 + r.random() * 0.55)
        lean = (r.random() - 0.5) * w * 0.35
        col = pick_blade_color(pal, (r.random() - 0.5) * 0.5, r)
        draw_blade(draw, bx, by, bh, lean, 0.6 + r.random() * 0.7, col, alpha=170 + int(r.random() * 60))
    return img


def patch_moss(name: str, w: int, h: int) -> Image.Image:
    pal = PALETTES["mossy"]
    r = rng_for(name)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = w // 2, h // 2 + 2
    draw.ellipse((cx - w * 0.42, cy - h * 0.22, cx + w * 0.42, cy + h * 0.18), fill=(*pal["dk"], 200))
    draw.ellipse((cx - w * 0.28, cy - h * 0.28, cx + w * 0.22, cy + h * 0.08), fill=(*pal["md"], 170))
    for _ in range(22):
        a = r.random() * 6.283
        rad = r.random() * w * 0.32
        bx = cx + math.cos(a) * rad
        by = cy + math.sin(a) * rad * 0.55 + h * 0.08
        bh = h * (0.12 + r.random() * 0.22)
        lean = (r.random() - 0.5) * 4
        col = lerp_col(pal["lt"], pal["hi"], r.random())
        draw_blade(draw, bx, by, bh, lean, 0.5 + r.random() * 0.5, col, alpha=160)
    return img


def clump_fern(name: str, w: int, h: int) -> Image.Image:
    pal = PALETTES["default"]
    r = rng_for(name)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    ax, ay = w // 2, h - 2
    draw_ground_shadow(draw, ax, ay + 1, w * 0.3, h * 0.06)
    fronds = 5 + r.randint(0, 3)
    for fi in range(fronds):
        side = fi - fronds // 2
        sx = ax + side * w * 0.11
        col = lerp_col(pal["dk"], pal["lt"], 0.35 + abs(side) * 0.08)
        segs = 7 + r.randint(0, 4)
        for si in range(segs):
            t = (si + 1) / segs
            px = sx + side * w * 0.06 * t + (r.random() - 0.5) * 1.2
            py = ay - h * 0.75 * t
            leaf_w = 2.2 + (1 - t) * 2.5
            leaf_h = h * 0.07
            draw.polygon(
                [(px, py), (px + side * leaf_w, py - leaf_h * 0.35), (px + side * leaf_w * 1.6, py - leaf_h)],
                fill=(*lerp_col(col, pal["hi"], t * 0.4), 210),
            )
    draw.ellipse((ax - 2, ay - 2, ax + 2, ay + 2), fill=(*pal["md"], 220))
    return img


def clump_needle(name: str, w: int, h: int) -> Image.Image:
    pal = PALETTES["pine"]
    r = rng_for(name)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    ax, ay = w // 2, h - 2
    draw_ground_shadow(draw, ax, ay + 1, w * 0.36, h * 0.06)
    for _ in range(38):
        bx = ax + (r.random() - 0.5) * w * 0.75
        by = ay - r.random() * 2
        length = 4 + r.random() * 9
        ang = -math.pi / 2 + (r.random() - 0.5) * 1.1
        ex = bx + math.cos(ang) * length
        ey = by + math.sin(ang) * length
        col = lerp_col(pal["dk"], pal["lt"], r.random())
        draw.line([(bx, by), (ex, ey)], fill=(*col, 190 + int(r.random() * 50)), width=1)
    for _ in range(12):
        bx = ax + (r.random() - 0.5) * w * 0.5
        by = ay
        bh = h * (0.25 + r.random() * 0.35)
        lean = (r.random() - 0.5) * 6
        draw_blade(draw, bx, by, bh, lean, 0.7, pal["md"], alpha=200)
    return img


VARIANTS: list[tuple[str, str, callable]] = [
    ("clump_small", "default", lambda: clump_dense("clump_small", 40, 44, 16, "default", 0.85)),
    ("clump_med", "default", lambda: clump_dense("clump_med", 52, 56, 24, "default")),
    ("clump_large", "default", lambda: clump_dense("clump_large", 64, 72, 32, "default", 1.08)),
    ("clump_dense", "default", lambda: clump_dense("clump_dense", 56, 52, 36, "default", 0.95)),
    ("clump_tall", "default", lambda: clump_tall("clump_tall", 48, 68)),
    ("clump_wispy", "default", lambda: clump_wispy("clump_wispy", 60, 58)),
    ("clump_pine", "pine", lambda: clump_dense("clump_pine", 54, 58, 26, "pine")),
    ("clump_shade", "shade", lambda: clump_dense("clump_shade", 50, 54, 28, "shade", 0.92)),
    ("clump_mossy", "mossy", lambda: clump_dense("clump_mossy", 58, 50, 22, "mossy", 1.05)),
    ("clump_dry", "dry", lambda: clump_dense("clump_dry", 52, 56, 20, "dry")),
    ("patch_moss", "mossy", patch_moss),
    ("clump_fern", "default", clump_fern),
    ("clump_needle", "pine", clump_needle),
]


def variant_meta(key: str, img: Image.Image) -> dict:
    w, h = img.size
    return {
        "file": f"{key}.png",
        "width": w,
        "height": h,
        "anchorX": w // 2,
        "anchorY": h - 1,
    }


def main():
    ap = argparse.ArgumentParser(description="Generate forest grass PNG clumps")
    ap.add_argument("--out", type=Path, default=ROOT / "assets" / "grass-forest")
    args = ap.parse_args()
    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)

    meta = {"variants": {}}
    for key, _pal, fn in VARIANTS:
        img = fn() if key not in ("patch_moss", "clump_fern", "clump_needle") else fn(key, *{
            "patch_moss": (48, 36),
            "clump_fern": (44, 52),
            "clump_needle": (50, 46),
        }[key])
        path = out / f"{key}.png"
        img.save(path, "PNG")
        meta["variants"][key] = variant_meta(key, img)
        print("wrote", path, img.size)

    meta_path = out / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("wrote", meta_path)


if __name__ == "__main__":
    main()
