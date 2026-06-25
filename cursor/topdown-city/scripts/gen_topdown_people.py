#!/usr/bin/env python3
"""Build TOPDOWN CITY pedestrians from 14Hertz 8-direction sheets (OpenGameArt).

Source sheets (committed in scripts/topdown-src/):
  RunSheet.png  — 8 rows × 8 cols of 32×32 walk frames
  Row order: S, SW, W, NW, N, NE, E, SE  (screen-facing labels)

Output:
  assets/people/topdown/sprites/{body}_{shirt}/walk{0,1}/{E,SE,S,SW,W,NW,N,NE}.png
"""
from __future__ import annotations

import json
import os
import shutil
from typing import Dict, List, Tuple

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets", "people", "topdown")
SPRITES = os.path.join(OUT, "sprites")
PREVIEWS = os.path.join(OUT, "previews")
SRC_DIR = os.path.join(os.path.dirname(__file__), "topdown-src")
RUN_SHEET = os.path.join(SRC_DIR, "RunSheet.png")

FRAME = 32
CANVAS = (32, 32)
ANCHOR = (16, 28)
GAME_DIRS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]

# Sheet row index (0=top) -> game direction label.
SHEET_ROW_FOR_DIR: Dict[str, int] = {
    "S": 0,
    "SW": 1,
    "W": 2,
    "NW": 3,
    "N": 4,
    "NE": 5,
    "E": 6,
    "SE": 7,
}

WALK_COLS = (0, 4)

SHIRTS = ["blue", "brown", "grey", "pink", "red", "white", "yellow"]
SHIRT_RGB: Dict[str, Tuple[int, int, int]] = {
    "blue": (72, 118, 210),
    "brown": (120, 78, 42),
    "grey": (150, 155, 165),
    "pink": (220, 120, 160),
    "red": (205, 58, 52),
    "white": (236, 238, 244),
    "yellow": (228, 196, 52),
}

BODY_SCALE = {"male": 1.0, "female": 0.9, "hardy": 1.12}

COMBOS_PREVIEW = [
    {"id": "male_blue_jeans", "body": "male", "shirt": "blue", "pants": "jeans", "hair": "brown", "skin": "medium"},
    {"id": "female_skirt_red", "body": "female", "shirt": "white", "pants": "skirt_red", "hair": "blonde", "skin": "light"},
    {"id": "hardy_brown_jeans", "body": "hardy", "shirt": "brown", "pants": "jeans", "hair": "black", "skin": "tan"},
    {"id": "female_yellow_shorts", "body": "female", "shirt": "yellow", "pants": "shorts_blue", "hair": "red", "skin": "medium"},
    {"id": "male_grey_jeans", "body": "male", "shirt": "grey", "pants": "jeans_dark", "hair": "brown", "skin": "tan"},
    {"id": "hardy_red_jeans", "body": "hardy", "shirt": "red", "pants": "jeans", "hair": "brown", "skin": "medium"},
]


def extract_frame(sheet: Image.Image, row: int, col: int) -> Image.Image:
    x0 = col * FRAME
    y0 = row * FRAME
    return sheet.crop((x0, y0, x0 + FRAME, y0 + FRAME)).convert("RGBA")


def tint_shirt(im: Image.Image, rgb: Tuple[int, int, int]) -> Image.Image:
    out = im.copy()
    px = out.load()
    tr, tg, tb = rgb
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a < 20:
                continue
            if r < 40 and g < 40 and b < 40:
                continue
            if r > 210 and g > 180 and b > 150:
                px[x, y] = (tr, tg, tb, a)
    return out


def scale_body(im: Image.Image, body: str) -> Image.Image:
    scale = BODY_SCALE.get(body, 1.0)
    if abs(scale - 1.0) < 0.01:
        return im
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    resized = im.resize((nw, nh), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    ox = (CANVAS[0] - nw) // 2
    oy = ANCHOR[1] - nh
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def build_combo(sheet: Image.Image, body: str, shirt: str) -> None:
    combo_id = f"{body}_{shirt}"
    out_dir = os.path.join(SPRITES, combo_id)
    for wf_i, col in enumerate(WALK_COLS):
        walk = f"walk{wf_i}"
        for game_dir in GAME_DIRS:
            row = SHEET_ROW_FOR_DIR[game_dir]
            frame = extract_frame(sheet, row, col)
            frame = tint_shirt(frame, SHIRT_RGB[shirt])
            frame = scale_body(frame, body)
            dest = os.path.join(out_dir, walk)
            os.makedirs(dest, exist_ok=True)
            frame.save(os.path.join(dest, f"{game_dir}.png"))


def build_preview(combo: dict) -> None:
    combo_id = f"{combo['body']}_{combo['shirt']}"
    src = os.path.join(SPRITES, combo_id, "walk0")
    sheet = Image.new("RGBA", (len(GAME_DIRS) * 36, 40), (0, 0, 0, 0))
    for i, d in enumerate(GAME_DIRS):
        frame = Image.open(os.path.join(src, f"{d}.png"))
        sheet.paste(frame, (4 + i * 36, 4), frame)
    os.makedirs(PREVIEWS, exist_ok=True)
    sheet.save(os.path.join(PREVIEWS, f"{combo['id']}.png"))


def write_meta() -> None:
    meta = {
        "version": 2,
        "style": "topdown-14hertz",
        "source": {
            "name": "8-Directional Character Template (14Hertz)",
            "license": "CC-BY 3.0 / credit appreciated",
            "url": "https://opengameart.org/content/8-directional-character-template",
            "sheet_layout": {
                "rows": ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
                "cols": "walk animation frames 0-7",
                "walk_frames_used": list(WALK_COLS),
            },
        },
        "size": list(CANVAS),
        "anchor": list(ANCHOR),
        "directions": GAME_DIRS,
        "walk_frames": 2,
        "body_types": [{"id": b} for b in BODY_SCALE],
        "builds": [
            {"id": "slim", "sx": 0.88, "sy": 1.02},
            {"id": "average", "sx": 1.0, "sy": 1.0},
            {"id": "athletic", "sx": 0.94, "sy": 1.04},
            {"id": "stocky", "sx": 1.08, "sy": 1.06},
            {"id": "hardy", "sx": 1.12, "sy": 1.08},
        ],
        "shirts": [{"id": s, "gender": "unisex"} for s in SHIRTS],
        "pants": [
            {"id": "jeans", "gender": "unisex"},
            {"id": "jeans_dark", "gender": "male"},
            {"id": "shorts_blue", "gender": "unisex"},
            {"id": "skirt_red", "gender": "female"},
            {"id": "skirt_navy", "gender": "female"},
        ],
        "skins": [
            {"id": "light", "gender": "unisex"},
            {"id": "medium", "gender": "unisex"},
            {"id": "tan", "gender": "unisex"},
        ],
        "hairs": [
            {"id": "brown", "gender": "unisex"},
            {"id": "blonde", "gender": "unisex"},
            {"id": "black", "gender": "unisex"},
            {"id": "red", "gender": "unisex"},
        ],
        "combos_preview": COMBOS_PREVIEW,
        "rules": {
            "female_only_pants": ["skirt_red", "skirt_navy"],
            "male_only_pants": ["jeans_dark"],
            "body_build_default": {"male": "average", "female": "slim", "hardy": "hardy"},
        },
    }
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
        f.write("\n")


def main() -> None:
    if not os.path.isfile(RUN_SHEET):
        raise SystemExit(f"Missing {RUN_SHEET}")
    sheet = Image.open(RUN_SHEET)
    if sheet.size != (256, 256):
        raise SystemExit(f"Unexpected RunSheet size {sheet.size}")
    if os.path.isdir(SPRITES):
        shutil.rmtree(SPRITES)
    for body in BODY_SCALE:
        for shirt in SHIRTS:
            build_combo(sheet, body, shirt)
            print("ok", f"{body}_{shirt}")
    for combo in COMBOS_PREVIEW:
        build_preview(combo)
    write_meta()
    print("done", OUT)


if __name__ == "__main__":
    main()
