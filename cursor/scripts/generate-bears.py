#!/usr/bin/env python3
"""Top-down bear sheets — 8 directions baked in PNG + front 3D shading.

Sheet order matches bearDir8 in 22-wildlife.js:
  E, SE, S, SW, W, NW, N, NE  (indices 0–7)
"""
from __future__ import annotations

import json
import math
import zipfile
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"
OUT = ROOT / "assets" / "bears"
REF_CACHE = Path("/tmp/bear-refs/lpc_animals.zip")
LPC_URL = "https://opengameart.org/sites/default/files/lpc_animals_2022_v1.1.zip"

SRC = 64
SCALE = 2
FW = FH = SRC * SCALE
N_WALK = 4
N_FRAMES = N_WALK + 1
N_DIR = 8
TOTAL_FRAMES = N_FRAMES * N_DIR
ANCHOR_X = FW // 2
ANCHOR_Y = FH - SCALE * 4

# LPC row 3 = toward camera (front), row 0 = away (back) — matches in-game N/S fix
FRONT = {"walk": 3, "attack": 7}
BACK = {"walk": 0, "attack": 4}

# name, lpc, rotate°, 3D frontness (1 = full front / south on screen)
DIRS_8 = [
    ("east", FRONT, -90, 0.38),
    ("se", FRONT, -45, 0.72),
    ("south", FRONT, 0, 1.00),
    ("sw", FRONT, 45, 0.72),
    ("west", FRONT, 90, 0.38),
    ("nw", BACK, 45, 0.18),
    ("north", BACK, 0, 0.06),
    ("ne", BACK, -45, 0.18),
]


def ensure_lpc() -> Path:
    base = REF_CACHE.parent / "lpc animals 2022 v1.1"
    if (base / "individual creature spritesheets" / "bear, grizzly.png").is_file():
        return base
    REF_CACHE.parent.mkdir(parents=True, exist_ok=True)
    if not REF_CACHE.is_file():
        print("downloading LPC animals…")
        with urlopen(LPC_URL, timeout=60) as r:
            REF_CACHE.write_bytes(r.read())
    with zipfile.ZipFile(REF_CACHE) as zf:
        zf.extractall(REF_CACHE.parent)
    return base


def upscale(img: Image.Image) -> Image.Image:
    w, h = img.size
    return img.resize((w * SCALE, h * SCALE), Image.Resampling.NEAREST)


def fit_cell(img: Image.Image) -> Image.Image:
    out = Image.new("RGBA", (SRC, SRC), (0, 0, 0, 0))
    out.paste(img, ((SRC - img.size[0]) // 2, (SRC - img.size[1]) // 2), img)
    return out


def rotate_cell(img: Image.Image, deg: float) -> Image.Image:
    if abs(deg) < 0.01:
        return img.copy()
    rot = img.rotate(deg, resample=Image.Resampling.NEAREST, expand=True)
    return fit_cell(rot)


def shift_down(img: Image.Image, dy: int) -> Image.Image:
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, dy), img)
    return out


def add_shadow(img: Image.Image, frontness: float) -> Image.Image:
    w, h = img.size
    out = img.copy()
    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    sp = sh.load()
    spread = int(SCALE * (3 + frontness * 2.5))
    alpha = int(40 + frontness * 35)
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 20:
                for d in range(1, spread + 1):
                    sy = y + d
                    if sy < h:
                        falloff = 1 - d / (spread + 1)
                        sp[x, sy] = (0, 0, 0, min(90, sp[x, sy][3] + int(alpha * falloff)))
    return Image.alpha_composite(sh, out)


def apply_3d_shading(img: Image.Image, frontness: float) -> Image.Image:
    if frontness < 0.04:
        return img
    out = img.copy()
    px = out.load()
    w, h = out.size
    cx, cy = w / 2, h / 2
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 25:
                continue
            u = (x - cx) / cx
            v = (y - cy) / cy
            belly = max(0.0, (v - 0.08) * (1 - abs(u) * 0.55)) * frontness
            hump = max(0.0, (-v - 0.12) * (1 - abs(u) * 0.45)) * frontness
            side_l = max(0.0, (-u - 0.05) * (1 + v * 0.3)) * frontness * 0.35
            side_r = max(0.0, (u - 0.05) * (1 + v * 0.3)) * frontness * 0.35
            snout = max(0.0, (v - 0.18) * (1 - abs(u) * 0.85)) * frontness * 0.55

            rf, gf, bf = r / 255, g / 255, b / 255
            dark = belly * 0.38 + side_l * 0.12 + side_r * 0.12
            lit = hump * 0.28 + snout * 0.1
            rf = clamp01(rf * (1 - dark) + lit)
            gf = clamp01(gf * (1 - dark * 0.92) + lit * 0.88)
            bf = clamp01(bf * (1 - dark * 0.85) + lit * 0.65)
            px[x, y] = (int(rf * 255), int(gf * 255), int(bf * 255), a)

    if frontness > 0.45:
        draw = ImageDraw.Draw(out)
        # shoulder mass (front view)
        for sx, sy, rw, rh, col in (
            (cx - w * 0.22, cy - h * 0.08, w * 0.14, h * 0.11, (0, 0, 0, int(28 * frontness))),
            (cx + w * 0.08, cy - h * 0.08, w * 0.14, h * 0.11, (0, 0, 0, int(28 * frontness))),
        ):
            draw.ellipse([sx, sy, sx + rw, sy + rh], fill=col)
        # snout highlight
        draw.ellipse(
            [cx - w * 0.08, cy + h * 0.14, cx + w * 0.08, cy + h * 0.26],
            fill=(255, 220, 180, int(35 * frontness)),
        )
        # eyes glint
        for ex in (cx - w * 0.11, cx + w * 0.03):
            draw.ellipse([ex, cy + h * 0.04, ex + 4, cy + h * 0.04 + 4], fill=(20, 12, 8, int(200 * frontness)))
    return out


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def recolor(img: Image.Image, hue_shift: float, sat_mul: float, val_mul: float) -> Image.Image:
    import colorsys

    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            rf, gf, bf = r / 255, g / 255, b / 255
            h_, s, v = colorsys.rgb_to_hsv(rf, gf, bf)
            h_ = (h_ + hue_shift) % 1.0
            s = max(0, min(1, s * sat_mul))
            v = max(0, min(1, v * val_mul))
            nr, ng, nb = colorsys.hsv_to_rgb(h_, s, v)
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    return out


def crop_lpc(sheet: Image.Image, row: int, col: int) -> Image.Image:
    return sheet.crop((col * SRC, row * SRC, (col + 1) * SRC, (row + 1) * SRC))


def process_cell(img: Image.Image, frontness: float) -> Image.Image:
    cell = upscale(add_shadow(shift_down(fit_cell(img), SCALE), frontness))
    return apply_3d_shading(cell, frontness)


def extract_all_directions(sheet: Image.Image) -> list[tuple[Image.Image, float]]:
    out: list[tuple[Image.Image, float]] = []
    for _name, lpc, rot, front in DIRS_8:
        walk = [rotate_cell(crop_lpc(sheet, lpc["walk"], c), rot) for c in range(N_WALK)]
        atk = rotate_cell(crop_lpc(sheet, lpc["attack"], 1), rot)
        for fr in walk + [atk]:
            out.append((fr, front))
    return out


VARIANTS = {
    "grizzly": {"src": "bear, grizzly.png", "recolor": None},
    "dark": {"src": "bear, black.png", "recolor": None},
    "brown": {"src": "bear, grizzly.png", "recolor": (0.0, 0.95, 1.02)},
    "cinnamon": {"src": "bear, grizzly.png", "recolor": (0.04, 1.15, 1.05)},
}


def make_variant(base_dir: Path, name: str, cfg: dict) -> Image.Image:
    path = base_dir / "individual creature spritesheets" / cfg["src"]
    sheet = Image.open(path).convert("RGBA")
    raw = extract_all_directions(sheet)
    out = Image.new("RGBA", (FW * TOTAL_FRAMES, FH), (0, 0, 0, 0))
    for i, (fr, front) in enumerate(raw):
        cell = process_cell(fr, front)
        if cfg["recolor"]:
            hs, sm, vm = cfg["recolor"]
            cell = recolor(cell, hs, sm, vm)
        out.paste(cell, (i * FW, 0), cell)
    return out


def write_attribution():
    text = """Bear sprites derived from Liberated Pixel Cup animal pack.
Source: https://opengameart.org/content/lpc-bears-deer-lions-and-more
File: lpc_animals_2022_v1.1.zip (bear, grizzly.png / bear, black.png)
License: CC-BY-SA 3.0 / GPL 3.0 (see OpenGameArt entry).
Authors: Sevarihk and contributors to the LPC animals collection.
"""
    (OUT / "ATTRIBUTION.txt").write_text(text, encoding="utf-8")


def main():
    base = ensure_lpc()
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "frameWidth": FW,
        "frameHeight": FH,
        "directionCount": N_DIR,
        "framesPerDirection": N_FRAMES,
        "walkFrames": list(range(N_WALK)),
        "attackFrame": N_WALK,
        "directions": [d[0] for d in DIRS_8],
        "anchorX": ANCHOR_X,
        "anchorY": ANCHOR_Y,
        "walkStep": 0.11,
        "variants": {},
    }
    for name, cfg in VARIANTS.items():
        img = make_variant(base, name, cfg)
        path = OUT / f"bear-{name}.png"
        img.save(path, "PNG")
        meta["variants"][name] = {"file": path.name}
        print("wrote", path, img.size)
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    write_attribution()


if __name__ == "__main__":
    main()
