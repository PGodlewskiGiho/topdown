#!/usr/bin/env python3
"""GTA2 modular pedestrian parts — mask-based extract from bil.sty, preview combos."""
from __future__ import annotations

import json
import os
import subprocess

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "people", "gta2")
PARTS = os.path.join(ROOT, "parts")
PREVIEWS = os.path.join(ROOT, "previews")
SCRIPTS = os.path.dirname(__file__)
STY = os.environ.get("GTA2_STY", "/tmp/bil.sty")
CANVAS = (16, 22)
ANCHOR = (8, 20)
DIR_NAMES = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]

FRAME_DIR_WALK = [
    ("N", 0), ("NW", 1),
    ("NW", 0), ("W", 1),
    ("W", 0), ("N", 1),
    ("NE", 0), ("NE", 1),
    ("SE", 0), ("SE", 1),
    ("SW", 0), ("SW", 1),
    ("S", 0), ("S", 1),
    ("E", 0), ("E", 1),
]

REMAP_META = {
    27: {"shirt": "blue", "pants": "jeans"},
    28: {"shirt": "white", "pants": "jeans"},
    30: {"shirt": "red", "pants": "jeans"},
    37: {"shirt": "brown", "pants": "jeans"},
    45: {"shirt": "yellow", "pants": "jeans"},
    52: {"shirt": "pink", "pants": "jeans"},
    32: {"shirt": "blue", "pants": "shorts_blue"},
    47: {"shirt": "grey", "pants": "jeans_dark"},
}

SHIRT_REMAP = {m["shirt"]: rid for rid, m in REMAP_META.items()}
PANTS_REMAP = {m["pants"]: rid for rid, m in REMAP_META.items()}

HAIR_VARIANTS = {"brown": (65, 41, 3), "blonde": (163, 103, 59), "black": (23, 27, 39), "red": (131, 83, 47)}
SKIN_VARIANTS = {"light": (199, 123, 75), "medium": (163, 103, 59), "tan": (131, 83, 47)}

PREVIEW_COMBOS = [
    {"id": "blue_jeans_brown", "shirt": "blue", "pants": "jeans", "hair": "brown", "skin": "medium"},
    {"id": "white_jeans_blonde", "shirt": "white", "pants": "jeans", "hair": "blonde", "skin": "light"},
    {"id": "red_jeans_black", "shirt": "red", "pants": "jeans", "hair": "black", "skin": "tan"},
    {"id": "yellow_jeans_redhair", "shirt": "yellow", "pants": "jeans", "hair": "red", "skin": "medium"},
    {"id": "brown_jeans_brown", "shirt": "brown", "pants": "jeans", "hair": "brown", "skin": "tan"},
    {"id": "blue_shorts_blonde", "shirt": "blue", "pants": "shorts_blue", "hair": "blonde", "skin": "light"},
]

BASE_REMAP = 27
PART_KEYS = ("shoes", "pants", "torso", "skin", "hair", "arms")


def export_frames(remap_id: int, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    export_js = "/tmp/export_gta2_frames.mjs"
    if not os.path.isfile(export_js):
        import shutil
        shutil.copy(os.path.join(SCRIPTS, "export_gta2_frames.mjs"), export_js)
    subprocess.run(["node", export_js, STY, out_dir, str(remap_id)], check=True, cwd="/tmp")


def classify_pixel(r, g, b):
    if r + g + b < 70:
        return "shoes"
    if g > 130 and b > 120 and r < 120:
        return "shirt"
    if b > 95 and r < 100 and g < 130:
        return "pants"
    if r > 150 and g > 95 and b < 140:
        return "skin"
    if r > 90 and g < 110 and b < 80:
        return "hair"
    if r > 80 and g > 120 and b > 140:
        return "shirt"
    return None


def normalize_frame(im: Image.Image) -> Image.Image:
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    ox = (CANVAS[0] - im.width) // 2
    oy = CANVAS[1] - im.height
    out.paste(im, (ox, oy), im)
    return out


def load_norm_frame(frames_dir: str, idx: int) -> Image.Image:
    return normalize_frame(Image.open(os.path.join(frames_dir, f"frame_{idx:02d}.png")).convert("RGBA"))


def split_layers(im: Image.Image) -> dict[str, Image.Image]:
    layers = {k: Image.new("RGBA", CANVAS, (0, 0, 0, 0)) for k in ("shoes", "pants", "torso", "skin", "hair")}
    px_in = im.load()
    lpx = {k: v.load() for k, v in layers.items()}
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            p = px_in[x, y]
            if p[3] == 0:
                continue
            kind = classify_pixel(*p[:3])
            if kind == "shirt":
                lpx["torso"][x, y] = p
            elif kind in lpx:
                lpx[kind][x, y] = p
            elif kind is None and y >= 10:
                r, g, b = p[:3]
                if g > 100 and b > 90 and r < 140:
                    lpx["torso"][x, y] = p
    arms = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    apx = arms.load()
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            if lpx["skin"][x, y][3] and (x < 5 or x > 10):
                apx[x, y] = lpx["skin"][x, y]
    layers["arms"] = arms
    return layers


def mask_from_layer(layer: Image.Image) -> list[list[bool]]:
    px = layer.load()
    return [[px[x, y][3] > 0 for x in range(CANVAS[0])] for y in range(CANVAS[1])]


def apply_mask(src: Image.Image, mask: list[list[bool]]) -> Image.Image:
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    sp, dp = src.load(), out.load()
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            if mask[y][x]:
                dp[x, y] = sp[x, y]
    return out


def build_masks(frames_dir: str) -> dict[int, dict[str, list[list[bool]]]]:
    masks = {}
    for i in range(16):
        layers = split_layers(load_norm_frame(frames_dir, i))
        masks[i] = {k: mask_from_layer(v) for k, v in layers.items()}
    return masks


def save_part(part: str, variant: str, walk: str, direction: str, layer: Image.Image):
    path = os.path.join(PARTS, part, variant, walk, f"{direction}.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    layer.save(path, "PNG")


def extract_all(masks: dict, frame_cache: dict[int, dict[int, Image.Image]]):
    for i in range(16):
        direction, walk_i = FRAME_DIR_WALK[i]
        wf = f"walk{walk_i}"
        m = masks[i]

        for shirt_id, rid in SHIRT_REMAP.items():
            src = frame_cache[rid][i]
            save_part("torsos", shirt_id, wf, direction, apply_mask(src, m["torso"]))

        for pants_id, rid in PANTS_REMAP.items():
            src = frame_cache[rid][i]
            save_part("pants", pants_id, wf, direction, apply_mask(src, m["pants"]))
            save_part("shoes", pants_id, wf, direction, apply_mask(src, m["shoes"]))

        src27 = frame_cache[BASE_REMAP][i]
        save_part("arms", "default", wf, direction, apply_mask(src27, m["arms"]))
        save_part("skins", "medium", wf, direction, apply_mask(src27, m["skin"]))
        save_part("hairs", "brown", wf, direction, apply_mask(src27, m["hair"]))


def recolor_layer(im: Image.Image, src_rgb, dst_rgb, tol=48) -> Image.Image:
    out = im.copy()
    px = out.load()
    sr, sg, sb = src_rgb
    dr, dg, db = dst_rgb
    for y in range(out.height):
        for x in range(out.width):
            p = px[x, y]
            if p[3] == 0:
                continue
            r, g, b = p[:3]
            if abs(r - sr) + abs(g - sg) + abs(b - sb) > tol * 3:
                continue
            px[x, y] = (dr, dg, db, p[3])
    return out


def build_variants():
    for hair_id, rgb in HAIR_VARIANTS.items():
        if hair_id == "brown":
            continue
        for root, _, files in os.walk(os.path.join(PARTS, "hairs", "brown")):
            for fn in files:
                if not fn.endswith(".png"):
                    continue
                rel = os.path.relpath(os.path.join(root, fn), os.path.join(PARTS, "hairs", "brown"))
                dst = os.path.join(PARTS, "hairs", hair_id, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                recolor_layer(
                    Image.open(os.path.join(PARTS, "hairs", "brown", rel)),
                    HAIR_VARIANTS["brown"], rgb,
                ).save(dst)

    for skin_id, rgb in SKIN_VARIANTS.items():
        if skin_id == "medium":
            continue
        for root, _, files in os.walk(os.path.join(PARTS, "skins", "medium")):
            for fn in files:
                if not fn.endswith(".png"):
                    continue
                rel = os.path.relpath(os.path.join(root, fn), os.path.join(PARTS, "skins", "medium"))
                dst = os.path.join(PARTS, "skins", skin_id, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                recolor_layer(
                    Image.open(os.path.join(PARTS, "skins", "medium", rel)),
                    SKIN_VARIANTS["medium"], rgb, tol=60,
                ).save(dst)


def composite(outfit, direction="S", walk=0, scale=8) -> Image.Image:
    wf = f"walk{walk}"
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for part, key in [
        ("shoes", outfit["pants"]),
        ("pants", outfit["pants"]),
        ("arms", "default"),
        ("torsos", outfit["shirt"]),
        ("skins", outfit["skin"]),
        ("hairs", outfit["hair"]),
    ]:
        fp = os.path.join(PARTS, part, key, wf, f"{direction}.png")
        if os.path.isfile(fp):
            canvas = Image.alpha_composite(canvas, Image.open(fp).convert("RGBA"))
    if scale != 1:
        canvas = canvas.resize((CANVAS[0] * scale, CANVAS[1] * scale), Image.NEAREST)
    return canvas


def write_meta():
    meta = {
        "version": 2,
        "style": "gta2",
        "size": list(CANVAS),
        "anchor": list(ANCHOR),
        "directions": DIR_NAMES,
        "walk_frames": 2,
        "layer_order": ["shoes", "pants", "arms", "torso", "skin", "hair"],
        "shirts": [{"id": s, "gender": "unisex"} for s in sorted(SHIRT_REMAP)],
        "pants": [{"id": p, "gender": "unisex"} for p in sorted(PANTS_REMAP)],
        "shoes": [{"id": p, "gender": "unisex"} for p in sorted(PANTS_REMAP)],
        "arms": [{"id": "default", "gender": "unisex"}],
        "skins": [{"id": s, "gender": "unisex"} for s in SKIN_VARIANTS],
        "hairs": [{"id": h, "gender": "unisex"} for h in HAIR_VARIANTS],
        "combos_preview": PREVIEW_COMBOS,
        "rules": {"female_only_pants": [], "male_only_pants": [], "no_hair": []},
    }
    os.makedirs(ROOT, exist_ok=True)
    with open(os.path.join(ROOT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)


def write_previews():
    os.makedirs(PREVIEWS, exist_ok=True)
    sheet = Image.new("RGBA", (140 * 3, 200 * 2), (18, 16, 22, 255))
    for idx, combo in enumerate(PREVIEW_COMBOS):
        col, row = idx % 3, idx // 3
        for walk in (0, 1):
            im = composite(combo, "S", walk, scale=8)
            x = col * 140 + (140 - im.width) // 2
            y = row * 200 + (100 if walk else 0) + (90 - im.height) // 2
            sheet.paste(im, (x, y), im)
        # side-by-side walk0+walk1 for single preview file
        w0 = composite(combo, "S", 0, 8)
        w1 = composite(combo, "S", 1, 8)
        pair = Image.new("RGBA", (w0.width * 2 + 8, w0.height), (0, 0, 0, 0))
        pair.paste(w0, (0, 0), w0)
        pair.paste(w1, (w0.width + 8, 0), w1)
        pair.save(os.path.join(PREVIEWS, f"{combo['id']}.png"))
    sheet.save(os.path.join(PREVIEWS, "combinations_sheet.png"))


def main():
    tmp = os.path.join(PARTS, "_frames")
    frame_cache: dict[int, dict[int, Image.Image]] = {}
    for remap_id in set(REMAP_META) | {BASE_REMAP}:
        fd = os.path.join(tmp, str(remap_id))
        export_frames(remap_id, fd)
        frame_cache[remap_id] = {i: load_norm_frame(fd, i) for i in range(16)}

    masks = build_masks(os.path.join(tmp, str(BASE_REMAP)))
    extract_all(masks, frame_cache)
    build_variants()
    write_meta()
    write_previews()
    print("done", ROOT)


if __name__ == "__main__":
    main()
