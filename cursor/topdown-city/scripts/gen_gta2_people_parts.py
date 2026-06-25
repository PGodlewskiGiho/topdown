#!/usr/bin/env python3
"""GTA2 modular pedestrian parts — palette-index masks, body types, skirts."""
from __future__ import annotations

import json
import os
import shutil
import subprocess

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "people", "gta2")
PARTS = os.path.join(ROOT, "parts", "bodies")
PREVIEWS = os.path.join(ROOT, "previews")
SCRIPTS = os.path.dirname(__file__)
STY = os.environ.get("GTA2_STY", "/tmp/bil.sty")
CANVAS = (22, 22)
ANCHOR = (11, 21)
DIR_NAMES = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]
BODY_TYPES = ("male", "female", "hardy")

# GTA2 ped walk cycle: 8 directions clockwise from South, 2 frames each
FRAME_DIR_WALK = [
    ("S", 0), ("S", 1),
    ("SE", 0), ("SE", 1),
    ("E", 0), ("E", 1),
    ("NE", 0), ("NE", 1),
    ("N", 0), ("N", 1),
    ("NW", 0), ("NW", 1),
    ("W", 0), ("W", 1),
    ("SW", 0), ("SW", 1),
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
SKIRT_VARIANTS = {
    "skirt_red": (168, 48, 72),
    "skirt_navy": (48, 58, 108),
}

HAIR_VARIANTS = {"brown": (65, 41, 3), "blonde": (163, 103, 59), "black": (23, 27, 39), "red": (131, 83, 47)}
SKIN_VARIANTS = {"light": (199, 123, 75), "medium": (163, 103, 59), "tan": (131, 83, 47)}

BODY_PREVIEW = [
    {"id": "male_blue_jeans", "body": "male", "shirt": "blue", "pants": "jeans", "hair": "brown", "skin": "medium"},
    {"id": "female_skirt_red", "body": "female", "shirt": "white", "pants": "skirt_red", "hair": "blonde", "skin": "light"},
    {"id": "hardy_brown_jeans", "body": "hardy", "shirt": "brown", "pants": "jeans", "hair": "black", "skin": "tan"},
    {"id": "female_yellow_shorts", "body": "female", "shirt": "yellow", "pants": "shorts_blue", "hair": "red", "skin": "medium"},
    {"id": "male_grey_jeans", "body": "male", "shirt": "grey", "pants": "jeans_dark", "hair": "brown", "skin": "tan"},
    {"id": "hardy_red_jeans", "body": "hardy", "shirt": "red", "pants": "jeans", "hair": "brown", "skin": "medium"},
]

BASE_REMAP = 27
SHIRT_IDX = {80, 81, 82, 83, 84, 85, 86, 225, 226, 227, 228}
ARM_IDX = {229, 230, 231, 232}
PANTS_IDX = {206, 207, 208, 209, 210, 211, 217, 218, 219, 220, 221, 222, 223}
SHOES_IDX = {193, 242, 244, 245, 246, 247}
HAIR_IDX = {194, 196}
SKIN_IDX = {176, 177, 178, 179, 180}

BODY_SCALE = {
    "male": (1.0, 1.0),
    "female": (0.88, 0.97),
    "hardy": (1.14, 1.08),
}
LAYER_EXTRA = {
    "female": {"hairs": (0.92, 0.94)},
    "hardy": {"torsos": (1.06, 1.05), "arms": (1.10, 1.04), "pants": (1.10, 1.06), "shoes": (1.06, 1.0)},
}


def export_frames(remap_id: int, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    export_js = "/tmp/export_gta2_indices.mjs"
    if not os.path.isfile(export_js):
        shutil.copy(os.path.join(SCRIPTS, "export_gta2_indices.mjs"), export_js)
    subprocess.run(["node", export_js, STY, out_dir, str(remap_id)], check=True, cwd="/tmp")


def load_indices(frames_dir: str, idx: int) -> list[list[int]]:
    with open(os.path.join(frames_dir, f"frame_{idx:02d}.idx.json"), encoding="utf-8") as f:
        return json.load(f)["indices"]


def load_rgba_frame(frames_dir: str, idx: int) -> Image.Image:
    return Image.open(os.path.join(frames_dir, f"frame_{idx:02d}.png")).convert("RGBA")


def part_for_pixel(idx: int, x: int, y: int) -> str | None:
    if idx in HAIR_IDX:
        return "hair"
    if idx in SKIN_IDX:
        return "skin"
    if idx in SHOES_IDX:
        return "shoes"
    if idx in PANTS_IDX:
        return "pants"
    if idx in ARM_IDX:
        return "arms"
    if idx in SHIRT_IDX:
        return "arms" if x < 6 or x > 15 else "torso"
    return None


def split_layers(indices: list[list[int]], rgba: Image.Image) -> dict[str, Image.Image]:
    layers = {k: Image.new("RGBA", CANVAS, (0, 0, 0, 0)) for k in ("shoes", "pants", "torso", "skin", "hair", "arms")}
    px_in = rgba.load()
    lpx = {k: v.load() for k, v in layers.items()}
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            idx = indices[y][x]
            if not idx:
                continue
            part = part_for_pixel(idx, x, y)
            if part:
                lpx[part][x, y] = px_in[x, y]
    return layers


def mask_from_layer(layer: Image.Image) -> list[list[bool]]:
    px = layer.load()
    return [[px[x, y][3] > 0 for x in range(CANVAS[0])] for y in range(CANVAS[1])]


def build_masks(frames_dir: str) -> dict[int, dict[str, list[list[bool]]]]:
    masks = {}
    for i in range(16):
        layers = split_layers(load_indices(frames_dir, i), load_rgba_frame(frames_dir, i))
        masks[i] = {k: mask_from_layer(v) for k, v in layers.items()}
    return masks


def apply_mask(src: Image.Image, mask: list[list[bool]]) -> Image.Image:
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    sp, dp = src.load(), out.load()
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            if mask[y][x]:
                dp[x, y] = sp[x, y]
    return out


def part_path(body: str, part: str, variant: str, walk: str, direction: str) -> str:
    return os.path.join(PARTS, body, part, variant, walk, f"{direction}.png")


def save_part(body: str, part: str, variant: str, walk: str, direction: str, layer: Image.Image):
    path = part_path(body, part, variant, walk, direction)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    layer.save(path, "PNG")


def scale_layer(im: Image.Image, sx: float, sy: float, ax: int = ANCHOR[0], ay: int = ANCHOR[1]) -> Image.Image:
    if sx == 1.0 and sy == 1.0:
        return im.copy()
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    px, opx = im.load(), out.load()
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            p = px[x, y]
            if p[3] == 0:
                continue
            nx = int(round(ax + (x - ax) * sx))
            ny = int(round(ay + (y - ay) * sy))
            if 0 <= nx < CANVAS[0] and 0 <= ny < CANVAS[1]:
                opx[nx, ny] = p
    return out


def extract_all(masks: dict, frame_cache: dict[int, dict[int, Image.Image]]):
    for i in range(16):
        direction, walk_i = FRAME_DIR_WALK[i]
        wf = f"walk{walk_i}"
        m = masks[i]

        for shirt_id, rid in SHIRT_REMAP.items():
            src = frame_cache[rid][i]
            save_part("male", "torsos", shirt_id, wf, direction, apply_mask(src, m["torso"]))
            save_part("male", "arms", shirt_id, wf, direction, apply_mask(src, m["arms"]))

        for pants_id, rid in PANTS_REMAP.items():
            src = frame_cache[rid][i]
            save_part("male", "pants", pants_id, wf, direction, apply_mask(src, m["pants"]))
            save_part("male", "shoes", pants_id, wf, direction, apply_mask(src, m["shoes"]))

        src27 = frame_cache[BASE_REMAP][i]
        save_part("male", "skins", "medium", wf, direction, apply_mask(src27, m["skin"]))
        save_part("male", "hairs", "brown", wf, direction, apply_mask(src27, m["hair"]))


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


def build_color_variants(body: str = "male"):
    base = os.path.join(PARTS, body)
    for hair_id, rgb in HAIR_VARIANTS.items():
        if hair_id == "brown":
            continue
        for root, _, files in os.walk(os.path.join(base, "hairs", "brown")):
            for fn in files:
                if not fn.endswith(".png"):
                    continue
                rel = os.path.relpath(os.path.join(root, fn), os.path.join(base, "hairs", "brown"))
                dst = os.path.join(base, "hairs", hair_id, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                recolor_layer(Image.open(os.path.join(base, "hairs", "brown", rel)), HAIR_VARIANTS["brown"], rgb).save(dst)

    for skin_id, rgb in SKIN_VARIANTS.items():
        if skin_id == "medium":
            continue
        for root, _, files in os.walk(os.path.join(base, "skins", "medium")):
            for fn in files:
                if not fn.endswith(".png"):
                    continue
                rel = os.path.relpath(os.path.join(root, fn), os.path.join(base, "skins", "medium"))
                dst = os.path.join(base, "skins", skin_id, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                recolor_layer(Image.open(os.path.join(base, "skins", "medium", rel)), SKIN_VARIANTS["medium"], rgb, tol=60).save(dst)


def build_body_variants():
    male_root = os.path.join(PARTS, "male")
    for body in ("female", "hardy"):
        sx, sy = BODY_SCALE[body]
        extras = LAYER_EXTRA.get(body, {})
        for root, _, files in os.walk(male_root):
            for fn in files:
                if not fn.endswith(".png"):
                    continue
                src = os.path.join(root, fn)
                rel = os.path.relpath(src, male_root)
                part = rel.split(os.sep)[0]
                bsx, bsy = extras.get(part, (sx, sy))
                dst = os.path.join(PARTS, body, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                scale_layer(Image.open(src).convert("RGBA"), bsx, bsy).save(dst)


def pants_to_skirt(pants: Image.Image, flare: float = 1.22) -> Image.Image:
    """Lower-body flare skirt from jeans silhouette."""
    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    px, opx = pants.load(), out.load()
    ax, ay = ANCHOR
    for y in range(CANVAS[1]):
        for x in range(CANVAS[0]):
            p = px[x, y]
            if p[3] == 0 or y < ay - 9:
                continue
            t = (y - (ay - 9)) / max(1, ay - (ay - 9))
            sx = 1.0 + (flare - 1.0) * t
            nx = int(round(ax + (x - ax) * sx))
            ny = y
            if 0 <= nx < CANVAS[0] and 0 <= ny < CANVAS[1]:
                opx[nx, ny] = p
    return out


def build_skirts(body: str = "female"):
    src_pants = os.path.join(PARTS, body, "pants", "jeans")
    if not os.path.isdir(src_pants):
        return
    for root, _, files in os.walk(src_pants):
        for fn in files:
            if not fn.endswith(".png"):
                continue
            rel = os.path.relpath(os.path.join(root, fn), src_pants)
            jeans = Image.open(os.path.join(src_pants, rel)).convert("RGBA")
            skirt_shape = pants_to_skirt(jeans)
            for skirt_id, rgb in SKIRT_VARIANTS.items():
                dst = os.path.join(PARTS, body, "pants", skirt_id, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                # recolor from dominant jeans blue
                recolor_layer(skirt_shape, (35, 43, 59), rgb, tol=80).save(dst)
                shoes_dst = os.path.join(PARTS, body, "shoes", skirt_id, rel)
                os.makedirs(os.path.dirname(shoes_dst), exist_ok=True)
                # shoes from jeans shoes, slightly narrowed
                shoes = scale_layer(
                    Image.open(os.path.join(PARTS, body, "shoes", "jeans", rel)).convert("RGBA"),
                    0.95, 1.0,
                )
                recolor_layer(shoes, (35, 43, 59), rgb, tol=80).save(shoes_dst)


def composite_frame(outfit, frame_i: int, scale: int = 6) -> Image.Image:
    body = outfit.get("body", "male")
    direction, walk_i = FRAME_DIR_WALK[frame_i]
    wf = f"walk{walk_i}"
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for part, key in [
        ("shoes", outfit["pants"]),
        ("pants", outfit["pants"]),
        ("arms", outfit["shirt"]),
        ("torsos", outfit["shirt"]),
        ("skins", outfit["skin"]),
        ("hairs", outfit["hair"]),
    ]:
        fp = part_path(body, part, key, wf, direction)
        if os.path.isfile(fp):
            canvas = Image.alpha_composite(canvas, Image.open(fp).convert("RGBA"))
    if scale != 1:
        canvas = canvas.resize((CANVAS[0] * scale, CANVAS[1] * scale), Image.NEAREST)
    return canvas


def write_meta():
    pants = [
        {"id": "jeans", "gender": "unisex"},
        {"id": "jeans_dark", "gender": "male"},
        {"id": "shorts_blue", "gender": "unisex"},
        {"id": "skirt_red", "gender": "female"},
        {"id": "skirt_navy", "gender": "female"},
    ]
    meta = {
        "version": 3,
        "style": "gta2",
        "size": list(CANVAS),
        "anchor": list(ANCHOR),
        "directions": DIR_NAMES,
        "walk_frames": 2,
        "total_frames": 16,
        "body_types": [{"id": b} for b in BODY_TYPES],
        "builds": [
            {"id": "slim", "sx": 0.88, "sy": 1.02},
            {"id": "average", "sx": 1.0, "sy": 1.0},
            {"id": "athletic", "sx": 0.94, "sy": 1.04},
            {"id": "stocky", "sx": 1.08, "sy": 1.06},
            {"id": "hardy", "sx": 1.12, "sy": 1.08},
        ],
        "layer_order": ["shoes", "pants", "arms", "torso", "skin", "hair"],
        "shirts": [{"id": s, "gender": "unisex"} for s in sorted(SHIRT_REMAP)],
        "pants": pants,
        "shoes": [p for p in pants],
        "arms": [{"id": s, "gender": "unisex"} for s in sorted(SHIRT_REMAP)],
        "skins": [{"id": s, "gender": "unisex"} for s in SKIN_VARIANTS],
        "hairs": [{"id": h, "gender": "unisex"} for h in HAIR_VARIANTS],
        "combos_preview": BODY_PREVIEW,
        "rules": {
            "female_only_pants": ["skirt_red", "skirt_navy"],
            "male_only_pants": ["jeans_dark"],
            "no_hair": [],
            "body_build_default": {"male": "average", "female": "slim", "hardy": "hardy"},
        },
    }
    os.makedirs(ROOT, exist_ok=True)
    with open(os.path.join(ROOT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)


def write_previews():
    os.makedirs(PREVIEWS, exist_ok=True)
    scale = 6
    fw, fh = CANVAS[0] * scale, CANVAS[1] * scale
    pad = 4
    cols = 8
    sheet_h = len(BODY_PREVIEW) * (2 * (fh + pad) + pad) + pad
    sheet = Image.new("RGBA", (cols * (fw + pad) + pad, sheet_h), (18, 16, 22, 255))
    for combo_i, combo in enumerate(BODY_PREVIEW):
        row_img = Image.new("RGBA", (cols * (fw + pad) + pad, 2 * (fh + pad) + pad), (0, 0, 0, 0))
        for fi in range(16):
            col, row = fi % cols, fi // cols
            im = composite_frame(combo, fi, scale)
            row_img.paste(im, (pad + col * (fw + pad), pad + row * (fh + pad)), im)
        row_img.save(os.path.join(PREVIEWS, f"{combo['id']}.png"))
        sheet.paste(row_img, (pad, pad + combo_i * (2 * (fh + pad) + pad)), row_img)
    sheet.save(os.path.join(PREVIEWS, "combinations_sheet.png"))


def verify_masks(frames_dir: str, masks: dict):
    for i in range(16):
        orig = load_rgba_frame(frames_dir, i)
        m = masks[i]
        rebuilt = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        for key in ("shoes", "pants", "arms", "torso", "skin", "hair"):
            rebuilt = Image.alpha_composite(rebuilt, apply_mask(orig, m[key]))
        opx, rpx = orig.load(), rebuilt.load()
        miss = sum(1 for y in range(CANVAS[1]) for x in range(CANVAS[0]) if opx[x, y][3] and not rpx[x, y][3])
        if miss:
            print(f"frame {i}: unmatched pixels miss={miss}")


def main():
    tmp = os.path.join(ROOT, "parts", "_frames")
    if os.path.isdir(PARTS):
        shutil.rmtree(PARTS)
    frame_cache: dict[int, dict[int, Image.Image]] = {}
    for remap_id in set(REMAP_META) | {BASE_REMAP}:
        fd = os.path.join(tmp, str(remap_id))
        export_frames(remap_id, fd)
        frame_cache[remap_id] = {i: load_rgba_frame(fd, i) for i in range(16)}

    base_dir = os.path.join(tmp, str(BASE_REMAP))
    masks = build_masks(base_dir)
    verify_masks(base_dir, masks)
    extract_all(masks, frame_cache)
    build_color_variants("male")
    build_body_variants()
    for body in BODY_TYPES:
        build_color_variants(body)
    build_skirts("female")
    write_meta()
    write_previews()
    print("done", ROOT)


if __name__ == "__main__":
    main()
