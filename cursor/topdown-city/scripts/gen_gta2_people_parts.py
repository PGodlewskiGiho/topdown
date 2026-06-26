#!/usr/bin/env python3
"""GTA2 modular pedestrian parts — palette-index masks, body types, skirts."""
from __future__ import annotations

import json
import math
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
BODY_TYPES = ("male", "female", "hardy")

# gta2_re: animation_frame 0-7 = walk cycle; facing = sprite rotation (baked to 8 dirs at export).
ANIM_MAP_PATH = os.path.join(SCRIPTS, "gta2_ped_anim_map.json")
with open(ANIM_MAP_PATH, encoding="utf-8") as _am:
    _anim = json.load(_am)
DIR_NAMES = _anim["directions"]
CLIPS = _anim["clips"]
EXPORT_SLOTS = []
for _clip_id, _clip in CLIPS.items():
    for _fi in range(_clip["count"]):
        EXPORT_SLOTS.append({"clip": _clip_id, "frame": _fi, "folder": f"{_clip_id}{_fi}"})
SLOT_COUNT = len(EXPORT_SLOTS)

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


def export_frames(remap_id: int, out_dir: str, body_type: str = "male"):
    os.makedirs(out_dir, exist_ok=True)
    export_js = os.path.join(SCRIPTS, "export_gta2_indices.mjs")
    project_root = os.path.join(SCRIPTS, "..")
    subprocess.run(
        ["node", export_js, STY, out_dir, str(remap_id), body_type],
        check=True,
        cwd=project_root,
    )


def load_indices(frames_dir: str, idx: int) -> list[list[int]]:
    with open(os.path.join(frames_dir, f"frame_{idx:03d}.idx.json"), encoding="utf-8") as f:
        return json.load(f)["indices"]


def load_rgba_frame(frames_dir: str, idx: int) -> Image.Image:
    return Image.open(os.path.join(frames_dir, f"frame_{idx:03d}.png")).convert("RGBA")


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
    for i in range(SLOT_COUNT):
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


LAYER_STACK = ("shoes", "pants", "arms", "torso", "skin", "hair")
LAYER_FILES = {
    "shoes": ("shoes", "pants"),
    "pants": ("pants", "pants"),
    "arms": ("arms", "shirt"),
    "torso": ("torsos", "shirt"),
    "skin": ("skins", "skin"),
    "hair": ("hairs", "hair"),
}
N4 = ((0, 1), (0, -1), (1, 0), (-1, 0))
N8 = N4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))


def stack_index(layer_key: str) -> int:
    try:
        return LAYER_STACK.index(layer_key)
    except ValueError:
        return -1


def touching_layers(x: int, y: int, masks: dict[str, list[list[bool]]], keys: tuple[str, ...], *, use8: bool = False) -> set[str]:
    w, h = CANVAS
    touch: set[str] = set()
    neigh = N8 if use8 else N4
    for k in keys:
        m = masks[k]
        for dx, dy in neigh:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and m[ny][nx]:
                touch.add(k)
    return touch


def _bridge_axis_seams_once(layers: dict[str, Image.Image]) -> dict[str, Image.Image]:
    """Close 1–2px straight gaps between layer edges (width matches limb, no blob)."""
    keys = tuple(k for k in LAYER_STACK if k in layers)
    if len(keys) < 2:
        return layers
    out = {k: layers[k].copy() for k in keys}
    masks = {k: mask_from_layer(out[k]) for k in keys}
    w, h = CANVAS

    def filled(x: int, y: int) -> bool:
        return any(masks[k][y][x] for k in keys)

    def side_layers(x: int, y: int) -> set[str]:
        if not (0 <= x < w and 0 <= y < h):
            return set()
        return {k for k in keys if masks[k][y][x]}

    fills: dict[str, list[tuple[int, int, tuple[int, int, int, int]]]] = {k: [] for k in keys}

    for y in range(h):
        x = 0
        while x < w:
            if filled(x, y):
                x += 1
                continue
            x0 = x
            while x < w and not filled(x, y):
                x += 1
            gap = x - x0
            if 1 <= gap <= 2 and x0 > 0 and x < w:
                left, right = side_layers(x0 - 1, y), side_layers(x, y)
                touch = left | right
                if len(left) >= 1 and len(right) >= 1 and len(touch) >= 2:
                    owner = max(touch, key=stack_index)
                    for gx in range(x0, x):
                        col = neighbor_color(out[owner], gx, y)
                        if col:
                            fills[owner].append((gx, y, col))
            continue

    for x in range(w):
        y = 0
        while y < h:
            if filled(x, y):
                y += 1
                continue
            y0 = y
            while y < h and not filled(x, y):
                y += 1
            gap = y - y0
            if 1 <= gap <= 2 and y0 > 0 and y < h:
                top, bot = side_layers(x, y0 - 1), side_layers(x, y)
                touch = top | bot
                if len(top) >= 1 and len(bot) >= 1 and len(touch) >= 2:
                    owner = max(touch, key=stack_index)
                    for gy in range(y0, y):
                        col = neighbor_color(out[owner], x, gy)
                        if col:
                            fills[owner].append((x, gy, col))
            continue

    for k, pts in fills.items():
        if not pts:
            continue
        px = out[k].load()
        for x, y, col in pts:
            if px[x, y][3] == 0:
                px[x, y] = col
    return out


def _weld_layer_seams_once(layers: dict[str, Image.Image]) -> dict[str, Image.Image]:
    keys = tuple(k for k in LAYER_STACK if k in layers)
    if len(keys) < 2:
        return layers
    out = {k: layers[k].copy() for k in keys}
    masks = {k: mask_from_layer(out[k]) for k in keys}
    fills: dict[str, list[tuple[int, int, tuple[int, int, int, int]]]] = {k: [] for k in keys}

    w, h = CANVAS
    for y in range(h):
        for x in range(w):
            if any(masks[k][y][x] for k in keys):
                continue
            touch4 = touching_layers(x, y, masks, keys, use8=False)
            if len(touch4) < 2:
                touch8 = touching_layers(x, y, masks, keys, use8=True)
                if len(touch8) < 2:
                    continue
                touch = touch8
            else:
                touch = touch4
            owner = max(touch, key=stack_index)
            col = neighbor_color(out[owner], x, y)
            if not col:
                for tk in sorted(touch, key=stack_index, reverse=True):
                    col = neighbor_color(out[tk], x, y)
                    if col:
                        owner = tk
                        break
            if col:
                fills[owner].append((x, y, col))

    for k, pts in fills.items():
        if not pts:
            continue
        px = out[k].load()
        for x, y, col in pts:
            px[x, y] = col
    return out


def neighbor_color(layer: Image.Image, x: int, y: int) -> tuple[int, int, int, int] | None:
    px = layer.load()
    w, h = layer.size
    for dx, dy in N8:
        nx, ny = x + dx, y + dy
        if 0 <= nx < w and 0 <= ny < h:
            p = px[nx, ny]
            if p[3] > 0:
                return p
    return None


def masks_equal(a: Image.Image, b: Image.Image) -> bool:
    return mask_from_layer(a) == mask_from_layer(b)


def weld_layer_seams(layers: dict[str, Image.Image], passes: int = 2) -> dict[str, Image.Image]:
    """Fill only narrow holes between stacked layers — no dilation / Michelin effect."""
    out = layers
    for _ in range(passes):
        nxt = _bridge_axis_seams_once(_weld_layer_seams_once(out))
        if all(masks_equal(out[k], nxt[k]) for k in nxt):
            break
        out = nxt
    return out


def load_layer_set(body: str, shirt: str, pants: str, folder: str, direction: str,
                   skin: str = "medium", hair: str = "brown") -> dict[str, Image.Image]:
    variants = {"shirt": shirt, "pants": pants, "skin": skin, "hair": hair}
    layers: dict[str, Image.Image] = {}
    for key in LAYER_STACK:
        part, var_key = LAYER_FILES[key]
        variant = variants[var_key]
        fp = part_path(body, part, variant, folder, direction)
        if os.path.isfile(fp):
            layers[key] = Image.open(fp).convert("RGBA")
    return layers


def save_layer_set(body: str, shirt: str, pants: str, folder: str, direction: str,
                   layers: dict[str, Image.Image], skin: str = "medium", hair: str = "brown"):
    variants = {"shirt": shirt, "pants": pants, "skin": skin, "hair": hair}
    for key, layer in layers.items():
        part, var_key = LAYER_FILES[key]
        save_part(body, part, variants[var_key], folder, direction, layer)


def pants_ids_for_body(body: str) -> list[str]:
    ids = ["jeans", "jeans_dark", "shorts_blue"]
    if body == "female":
        ids += ["skirt_red", "skirt_navy"]
    return ids


def image_equal(a: Image.Image, b: Image.Image) -> bool:
    return a.tobytes() == b.tobytes()


def weld_all_part_seams():
    """Run after all body/color variants — closes gaps between modular PNG layers."""
    combos = len(BODY_TYPES) * len(SHIRT_REMAP) * 5 * SLOT_COUNT * len(DIR_NAMES)
    print(f"seam weld: ~{combos} combos …", flush=True)
    total = 0
    saved = 0
    for body in BODY_TYPES:
        shirts = sorted(SHIRT_REMAP)
        for shirt in shirts:
            for pants in pants_ids_for_body(body):
                for slot in EXPORT_SLOTS:
                    folder = slot["folder"]
                    for direction in DIR_NAMES:
                        layers = load_layer_set(body, shirt, pants, folder, direction)
                        if len(layers) < 2:
                            continue
                        total += 1
                        welded_layers = weld_layer_seams(layers)
                        for key, im in welded_layers.items():
                            prev = layers.get(key)
                            if prev is not None and image_equal(prev, im):
                                continue
                            part, var_key = LAYER_FILES[key]
                            variant = {"shirt": shirt, "pants": pants, "skin": "medium", "hair": "brown"}[var_key]
                            save_part(body, part, variant, folder, direction, im)
                            saved += 1
                        if total % 800 == 0:
                            print(f"seam weld … {total} combos, {saved} layers saved", flush=True)
        print(f"seam weld {body}: {total} combos so far, {saved} layer files written", flush=True)
    print(f"seam weld done — {total} combos, {saved} layer files updated", flush=True)


def part_path(body: str, part: str, variant: str, walk: str, direction: str) -> str:
    return os.path.join(PARTS, body, part, variant, walk, f"{direction}.png")


def save_part(body: str, part: str, variant: str, walk: str, direction: str, layer: Image.Image):
    path = part_path(body, part, variant, walk, direction)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    layer.save(path, "PNG")


def rotate_layer(im: Image.Image, direction: str) -> Image.Image:
    """Bake GTA2 sprite rotation: base bitmap faces N; rotate to game direction."""
    if direction not in DIR_NAMES:
        return im.copy()
    idx = DIR_NAMES.index(direction)
    target_rad = idx * (math.pi / 4)
    pil_deg = -math.degrees(target_rad + _anim["rotation_offset_rad"])

    px_list = [(x, y) for y in range(im.height) for x in range(im.width) if im.getpixel((x, y))[3] > 0]
    if not px_list:
        return im.copy()
    com_x = sum(x for x, _ in px_list) / len(px_list)
    com_y = sum(y for _, y in px_list) / len(px_list)

    pad = 64
    big = Image.new("RGBA", (pad, pad), (0, 0, 0, 0))
    bcx, bcy = pad // 2, pad // 2
    big.paste(im, (int(bcx - com_x), int(bcy - com_y)), im)
    rotated = big.rotate(pil_deg, resample=Image.NEAREST, center=(bcx, bcy))

    out = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    pts = [(x, y) for y in range(rotated.height) for x in range(rotated.width) if rotated.getpixel((x, y))[3] > 0]
    if not pts:
        return out
    minx, maxx = min(x for x, _ in pts), max(x for x, _ in pts)
    miny, maxy = min(y for _, y in pts), max(y for _, y in pts)
    foot_x = (minx + maxx) // 2
    foot_y = maxy
    out.paste(rotated, (ANCHOR[0] - foot_x, ANCHOR[1] - foot_y), rotated)
    return out


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
    total = SLOT_COUNT * len(DIR_NAMES)
    done = 0
    for slot_i, slot in enumerate(EXPORT_SLOTS):
        folder = slot["folder"]
        m = masks[slot_i]
        for direction in DIR_NAMES:
            for shirt_id, rid in SHIRT_REMAP.items():
                src = frame_cache[rid][slot_i]
                torso = rotate_layer(apply_mask(src, m["torso"]), direction)
                arms = rotate_layer(apply_mask(src, m["arms"]), direction)
                save_part("male", "torsos", shirt_id, folder, direction, torso)
                save_part("male", "arms", shirt_id, folder, direction, arms)

            for pants_id, rid in PANTS_REMAP.items():
                src = frame_cache[rid][slot_i]
                pants = rotate_layer(apply_mask(src, m["pants"]), direction)
                shoes = rotate_layer(apply_mask(src, m["shoes"]), direction)
                save_part("male", "pants", pants_id, folder, direction, pants)
                save_part("male", "shoes", pants_id, folder, direction, shoes)

            src27 = frame_cache[BASE_REMAP][slot_i]
            skin = rotate_layer(apply_mask(src27, m["skin"]), direction)
            hair = rotate_layer(apply_mask(src27, m["hair"]), direction)
            save_part("male", "skins", "medium", folder, direction, skin)
            save_part("male", "hairs", "brown", folder, direction, hair)
            done += 1
            if done % 500 == 0:
                print(f"extract {done}/{total}")


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


def composite_frame(outfit, slot_i: int, direction: str, scale: int = 6) -> Image.Image:
    body = outfit.get("body", "male")
    folder = EXPORT_SLOTS[slot_i]["folder"]
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for part, key in [
        ("shoes", outfit["pants"]),
        ("pants", outfit["pants"]),
        ("arms", outfit["shirt"]),
        ("torsos", outfit["shirt"]),
        ("skins", outfit["skin"]),
        ("hairs", outfit["hair"]),
    ]:
        fp = part_path(body, part, key, folder, direction)
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
        "version": 4,
        "style": "gta2",
        "seam_weld": True,
        "size": list(CANVAS),
        "anchor": list(ANCHOR),
        "directions": DIR_NAMES,
        "clips": CLIPS,
        "clip_folders": [s["folder"] for s in EXPORT_SLOTS],
        "export_slots": SLOT_COUNT,
        "animation_source": "gta2_ped_anim_map.json",
        "facing_mode": "baked_rotation",
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
    preview_slots = [i for i, s in enumerate(EXPORT_SLOTS) if s["clip"] in ("walk", "idle", "shoot") and s["frame"] < 8]
    cols = min(8, len(preview_slots))
    for combo in BODY_PREVIEW:
        row_img = Image.new("RGBA", (cols * (fw + pad) + pad, fh + pad * 2), (0, 0, 0, 0))
        for ci, slot_i in enumerate(preview_slots[:cols]):
            im = composite_frame(combo, slot_i, "S", scale)
            row_img.paste(im, (pad + ci * (fw + pad), pad), im)
        row_img.save(os.path.join(PREVIEWS, f"{combo['id']}.png"))


def verify_masks(frames_dir: str, masks: dict):
    for i in range(min(3, SLOT_COUNT)):
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
        frame_cache[remap_id] = {i: load_rgba_frame(fd, i) for i in range(SLOT_COUNT)}

    base_dir = os.path.join(tmp, str(BASE_REMAP))
    masks = build_masks(base_dir)
    verify_masks(base_dir, masks)
    extract_all(masks, frame_cache)
    build_body_variants()
    build_skirts("female")
    weld_all_part_seams()
    build_color_variants("male")
    for body in BODY_TYPES:
        build_color_variants(body)
    write_meta()
    write_previews()
    print("done", ROOT)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "weld-only":
        weld_all_part_seams()
    else:
        main()
