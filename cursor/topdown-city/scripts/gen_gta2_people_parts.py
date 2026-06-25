#!/usr/bin/env python3
"""GTA2 modular pedestrian parts — palette-index masks from bil.sty."""
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
CANVAS = (22, 22)
ANCHOR = (11, 21)
DIR_NAMES = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]

# bil.sty frame index -> (direction, walk phase)
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

# Stable palette-index groups (geometry) from remap 27 analysis
SHIRT_IDX = {80, 81, 82, 83, 84, 85, 86, 225, 226, 227, 228}
ARM_IDX = {229, 230, 231, 232}
PANTS_IDX = {206, 207, 208, 209, 210, 211, 217, 218, 219, 220, 221, 222, 223}
SHOES_IDX = {193, 242, 244, 245, 246, 247}
HAIR_IDX = {194, 196}
SKIN_IDX = {176, 177, 178, 179, 180}


def export_frames(remap_id: int, out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    export_js = "/tmp/export_gta2_indices.mjs"
    if not os.path.isfile(export_js):
        import shutil
        shutil.copy(os.path.join(SCRIPTS, "export_gta2_indices.mjs"), export_js)
    subprocess.run(["node", export_js, STY, out_dir, str(remap_id)], check=True, cwd="/tmp")


def load_indices(frames_dir: str, idx: int) -> list[list[int]]:
    with open(os.path.join(frames_dir, f"frame_{idx:02d}.idx.json"), encoding="utf-8") as f:
        data = json.load(f)
    return data["indices"]


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
            save_part("arms", shirt_id, wf, direction, apply_mask(src, m["arms"]))

        for pants_id, rid in PANTS_REMAP.items():
            src = frame_cache[rid][i]
            save_part("pants", pants_id, wf, direction, apply_mask(src, m["pants"]))
            save_part("shoes", pants_id, wf, direction, apply_mask(src, m["shoes"]))

        src27 = frame_cache[BASE_REMAP][i]
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


def composite_frame(outfit, frame_i: int, scale: int = 8) -> Image.Image:
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
        fp = os.path.join(PARTS, part, key, wf, f"{direction}.png")
        if os.path.isfile(fp):
            canvas = Image.alpha_composite(canvas, Image.open(fp).convert("RGBA"))
    if scale != 1:
        canvas = canvas.resize((CANVAS[0] * scale, CANVAS[1] * scale), Image.NEAREST)
    return canvas


def composite(outfit, direction="S", walk=0, scale=8) -> Image.Image:
    for i, (d, w) in enumerate(FRAME_DIR_WALK):
        if d == direction and w == walk:
            return composite_frame(outfit, i, scale)
    return composite_frame(outfit, 12, scale)


def write_meta():
    meta = {
        "version": 2,
        "style": "gta2",
        "size": list(CANVAS),
        "anchor": list(ANCHOR),
        "directions": DIR_NAMES,
        "walk_frames": 2,
        "total_frames": 16,
        "layer_order": ["shoes", "pants", "arms", "torso", "skin", "hair"],
        "shirts": [{"id": s, "gender": "unisex"} for s in sorted(SHIRT_REMAP)],
        "pants": [{"id": p, "gender": "unisex"} for p in sorted(PANTS_REMAP)],
        "shoes": [{"id": p, "gender": "unisex"} for p in sorted(PANTS_REMAP)],
        "arms": [{"id": s, "gender": "unisex"} for s in sorted(SHIRT_REMAP)],
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
    scale = 6
    fw, fh = CANVAS[0] * scale, CANVAS[1] * scale
    pad = 4
    cols, rows = 8, 2  # 16 frames: 8 directions × 2 walk phases

    sheet = Image.new("RGBA", (cols * (fw + pad) + pad, rows * (len(PREVIEW_COMBOS) * (fh + pad) + pad)), (18, 16, 22, 255))

    for combo_i, combo in enumerate(PREVIEW_COMBOS):
        frames_row = Image.new("RGBA", (cols * (fw + pad) + pad, 2 * (fh + pad) + pad), (0, 0, 0, 0))
        for fi in range(16):
            col = fi % cols
            row = fi // cols
            im = composite_frame(combo, fi, scale)
            x = pad + col * (fw + pad)
            y = pad + row * (fh + pad)
            frames_row.paste(im, (x, y), im)

        combo_path = os.path.join(PREVIEWS, f"{combo['id']}.png")
        frames_row.save(combo_path)

        sy = pad + combo_i * (2 * (fh + pad) + pad)
        sheet.paste(frames_row, (pad, sy), frames_row)

    sheet.save(os.path.join(PREVIEWS, "combinations_sheet.png"))

    # Reference: original vs composite for blue_jeans_brown
    ref = PREVIEW_COMBOS[0]
    cmp = Image.new("RGBA", (fw * 2 + pad, fh), (0, 0, 0, 0))
    orig = load_rgba_frame(os.path.join(PARTS, "_frames", str(BASE_REMAP)), 12).resize((fw, fh), Image.NEAREST)
    built = composite(ref, "S", 0, scale)
    cmp.paste(orig, (0, 0), orig)
    cmp.paste(built, (fw + pad, 0), built)
    cmp.save(os.path.join(PREVIEWS, "verify_s_walk0.png"))


def verify_masks(frames_dir: str, masks: dict):
    """Ensure recomposed layers match original frame pixels."""
    for i in range(16):
        orig = load_rgba_frame(frames_dir, i)
        m = masks[i]
        rebuilt = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        for key in ("shoes", "pants", "arms", "torso", "skin", "hair"):
            rebuilt = Image.alpha_composite(rebuilt, apply_mask(orig, m[key]))
        opx, rpx = orig.load(), rebuilt.load()
        miss = extra = 0
        for y in range(CANVAS[1]):
            for x in range(CANVAS[0]):
                o = opx[x, y][3] > 0
                r = rpx[x, y][3] > 0
                if o and not r:
                    miss += 1
                if r and not o:
                    extra += 1
        if miss or extra:
            print(f"frame {i}: unmatched pixels miss={miss} extra={extra}")


def main():
    tmp = os.path.join(PARTS, "_frames")
    frame_cache: dict[int, dict[int, Image.Image]] = {}
    for remap_id in set(REMAP_META) | {BASE_REMAP}:
        fd = os.path.join(tmp, str(remap_id))
        export_frames(remap_id, fd)
        frame_cache[remap_id] = {i: load_rgba_frame(fd, i) for i in range(16)}

    base_dir = os.path.join(tmp, str(BASE_REMAP))
    masks = build_masks(base_dir)
    verify_masks(base_dir, masks)
    extract_all(masks, frame_cache)
    build_variants()
    write_meta()
    write_previews()
    print("done", ROOT)


if __name__ == "__main__":
    main()
