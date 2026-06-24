#!/usr/bin/env python3
"""Top-down bear sheets — 4 LPC directions baked in PNG, no runtime rotation.

LPC rows: 0=south, 1=west(side), 2=east(side), 3=north — we use row 0/3 top-down
and rotate row 0 in PNG for east/west so the bear stays overhead (not side profile).
"""
from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path
from urllib.request import urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"
OUT = ROOT / "assets" / "bears"
REF_CACHE = Path("/tmp/bear-refs/lpc_animals.zip")
LPC_URL = "https://opengameart.org/sites/default/files/lpc_animals_2022_v1.1.zip"

SRC = 64
SCALE = 2
FW = FH = SRC * SCALE
N_WALK = 4
N_DIR = 4  # south, north, east, west
N_FRAMES = N_WALK + 1
FRAMES_PER_DIR = N_FRAMES
TOTAL_FRAMES = FRAMES_PER_DIR * N_DIR
ANCHOR_X = FW // 2
ANCHOR_Y = FH - SCALE * 4

# LPC source rows (walk / attack)
LPC = {
    "south": {"walk": 0, "attack": 4},
    "north": {"walk": 3, "attack": 7},
}


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
    ox = (SRC - img.size[0]) // 2
    oy = (SRC - img.size[1]) // 2
    out.paste(img, (ox, oy), img)
    return out


def shift_down(img: Image.Image, dy: int) -> Image.Image:
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, dy), img)
    return out


def add_shadow(img: Image.Image) -> Image.Image:
    w, h = img.size
    out = img.copy()
    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    sp = sh.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 20:
                sy = y + SCALE * 3
                if sy < h:
                    sp[x, sy] = (0, 0, 0, min(55, sp[x, sy][3] + 40))
    return Image.alpha_composite(sh, out)


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


def process_cell(img: Image.Image) -> Image.Image:
    return upscale(add_shadow(shift_down(fit_cell(img), SCALE)))


def east_from_south(south: Image.Image) -> Image.Image:
    """Top-down south frame → top-down east (rotate -90° CW in screen space)."""
    rot = south.rotate(-90, resample=Image.Resampling.NEAREST, expand=True)
    return fit_cell(rot)


def west_from_south(south: Image.Image) -> Image.Image:
    rot = south.rotate(90, resample=Image.Resampling.NEAREST, expand=True)
    return fit_cell(rot)


def extract_direction_set(sheet: Image.Image, walk_row: int, atk_row: int) -> list[Image.Image]:
    south_walk = [crop_lpc(sheet, walk_row, c) for c in range(N_WALK)]
    south_atk = crop_lpc(sheet, atk_row, 1)
    dirs = {
        "south": south_walk + [south_atk],
        "north": [crop_lpc(sheet, LPC["north"]["walk"], c) for c in range(N_WALK)]
        + [crop_lpc(sheet, LPC["north"]["attack"], 1)],
        "east": [east_from_south(s) for s in south_walk] + [east_from_south(south_atk)],
        "west": [west_from_south(s) for s in south_walk] + [west_from_south(south_atk)],
    }
    out: list[Image.Image] = []
    for name in ("south", "north", "east", "west"):
        out.extend(dirs[name])
    return out


def build_sheet(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (FW * len(frames), FH), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        cell = process_cell(fr)
        sheet.paste(cell, (i * FW, 0), cell)
    return sheet


VARIANTS = {
    "grizzly": {"src": "bear, grizzly.png", "recolor": None},
    "dark": {"src": "bear, black.png", "recolor": None},
    "brown": {"src": "bear, grizzly.png", "recolor": (0.0, 0.95, 1.02)},
    "cinnamon": {"src": "bear, grizzly.png", "recolor": (0.04, 1.15, 1.05)},
}


def make_variant(base_dir: Path, name: str, cfg: dict) -> Image.Image:
    path = base_dir / "individual creature spritesheets" / cfg["src"]
    sheet = Image.open(path).convert("RGBA")
    raw = extract_direction_set(sheet, LPC["south"]["walk"], LPC["south"]["attack"])
    out = Image.new("RGBA", (FW * TOTAL_FRAMES, FH), (0, 0, 0, 0))
    for i, fr in enumerate(raw):
        cell = process_cell(fr)
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
        "framesPerDirection": N_FRAMES,
        "walkFrames": list(range(N_WALK)),
        "attackFrame": N_WALK,
        "directions": ["south", "north", "east", "west"],
        "directionOrder": {"south": 0, "north": 1, "east": 2, "west": 3},
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
