#!/usr/bin/env python3
"""Forest wildlife sprites: deer + wolf (LPC fox recolor) + procedural boar.

Sheet layout matches bearDir8 in 22-wildlife.js (8 dirs × 5 frames).
"""
from __future__ import annotations

import json
import math
import zipfile
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"
OUT = ROOT / "assets" / "wildlife"
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

FRONT = {"walk": 3, "attack": 7}
BACK = {"walk": 0, "attack": 4}
DEER_FRONT = {"walk": 3, "attack": 4}
DEER_BACK = {"walk": 1, "attack": 5}

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


DEER_DIRS_8 = [
    ("east", DEER_FRONT, -90, 0.38),
    ("se", DEER_FRONT, -45, 0.72),
    ("south", DEER_FRONT, 0, 1.00),
    ("sw", DEER_FRONT, 45, 0.72),
    ("west", DEER_FRONT, 90, 0.38),
    ("nw", DEER_BACK, 45, 0.18),
    ("north", DEER_BACK, 0, 0.06),
    ("ne", DEER_BACK, -45, 0.18),
]


def ensure_lpc() -> Path:
    base = REF_CACHE.parent / "lpc animals 2022 v1.1"
    if (base / "individual creature spritesheets" / "deer, light buck.png").is_file():
        return base
    REF_CACHE.parent.mkdir(parents=True, exist_ok=True)
    if not REF_CACHE.is_file():
        print("downloading LPC animals…")
        with urlopen(LPC_URL, timeout=60) as r:
            REF_CACHE.write_bytes(r.read())
    with zipfile.ZipFile(REF_CACHE) as zf:
        zf.extractall(REF_CACHE.parent)
    return base


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


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
    return out


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


def extract_all_directions(sheet: Image.Image, dirs_table) -> list[tuple[Image.Image, float]]:
    out: list[tuple[Image.Image, float]] = []
    for _name, lpc, rot, frontness in dirs_table:
        walk = [rotate_cell(crop_lpc(sheet, lpc["walk"], c), rot) for c in range(N_WALK)]
        atk = rotate_cell(crop_lpc(sheet, lpc["attack"], 1), rot)
        for fr in walk + [atk]:
            out.append((fr, frontness))
    return out


def make_lpc_variant(base_dir: Path, src: str, recolor_cfg, dirs_table) -> Image.Image:
    sheet = Image.open(base_dir / "individual creature spritesheets" / src).convert("RGBA")
    raw = extract_all_directions(sheet, dirs_table)
    out = Image.new("RGBA", (FW * TOTAL_FRAMES, FH), (0, 0, 0, 0))
    for i, (fr, frontness) in enumerate(raw):
        cell = process_cell(fr, frontness)
        if recolor_cfg:
            hs, sm, vm = recolor_cfg
            cell = recolor(cell, hs, sm, vm)
        out.paste(cell, (i * FW, 0), cell)
    return out


def draw_boar_cell(angle: float, variant: str) -> Image.Image:
    """Procedural top-down boar for one facing angle (radians, 0 = east)."""
    palettes = {
        "brown": {"body": (92, 58, 42), "dark": (58, 36, 28), "bristle": (72, 48, 34), "snout": (180, 140, 118)},
        "dark": {"body": (68, 44, 38), "dark": (40, 26, 22), "bristle": (52, 34, 30), "snout": (150, 118, 100)},
        "spotted": {"body": (108, 72, 52), "dark": (64, 42, 32), "bristle": (88, 58, 42), "snout": (188, 148, 124)},
    }
    pal = palettes.get(variant, palettes["brown"])
    img = Image.new("RGBA", (SRC, SRC), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = SRC / 2, SRC / 2 + 4
    ca, sa = math.cos(angle), math.sin(angle)
    px, py = cx + ca * 14, cy + sa * 14

    def rot(dx: float, dy: float) -> tuple[float, float]:
        return cx + dx * ca - dy * sa, cy + dx * sa + dy * ca

    # shadow
    draw.ellipse([cx - 12, cy + 8, cx + 12, cy + 14], fill=(0, 0, 0, 55))
    # body
    bx0, by0 = rot(-11, -7)
    bx1, by1 = rot(11, 7)
    draw.ellipse([min(bx0, bx1) - 2, min(by0, by1) - 2, max(bx0, bx1) + 2, max(by0, by1) + 2], fill=(*pal["body"], 255))
    # bristle ridge
    for t in range(-8, 9, 2):
        qx, qy = rot(t * 0.9, -5)
        draw.line([(qx, qy), (qx + ca * 2, qy + sa * 2)], fill=(*pal["bristle"], 220), width=2)
    # head + snout
    hx, hy = rot(10, 0)
    draw.ellipse([hx - 7, hy - 6, hx + 7, hy + 6], fill=(*pal["dark"], 255))
    sx, sy = rot(16, 0)
    draw.ellipse([sx - 6, sy - 4, sx + 6, sy + 4], fill=(*pal["snout"], 255))
    # ears
    for ex in (-4, 4):
        exx, exy = rot(8, ex)
        draw.polygon([(exx, exy), (exx + ca * 3 - sa * 2, exy + sa * 3 + ca * 2),
                      (exx + ca * 2 + sa * 2, exy + sa * 2 - ca * 2)], fill=(*pal["dark"], 230))
    # legs (four dots)
    for lx, ly in ((-7, -5), (-7, 5), (5, -5), (5, 5)):
        lx2, ly2 = rot(lx, ly)
        draw.ellipse([lx2 - 2, ly2 - 2, lx2 + 2, ly2 + 2], fill=(*pal["dark"], 210))
    # tail
    tx, ty = rot(-13, 0)
    draw.line([(tx, ty), (tx - ca * 5, ty - sa * 5)], fill=(*pal["dark"], 200), width=2)
    # tusk glint (front-ish)
    if abs(sa) < 0.85:
        tx2, ty2 = rot(17, -2)
        draw.line([(tx2, ty2), (tx2 + ca * 3, ty2 + sa * 3)], fill=(240, 230, 210, 200), width=1)
    return img


def make_boar_variant(name: str) -> Image.Image:
    angles = [0, math.pi / 4, math.pi / 2, 3 * math.pi / 4, math.pi, -3 * math.pi / 4, -math.pi / 2, -math.pi / 4]
    out = Image.new("RGBA", (FW * TOTAL_FRAMES, FH), (0, 0, 0, 0))
    idx = 0
    for di, base_a in enumerate(angles):
        frontness = 1.0 if di == 2 else (0.72 if di in (1, 3) else 0.38 if di in (0, 4) else 0.12)
        cells = [draw_boar_cell(base_a, name) for _ in range(N_WALK)] + [draw_boar_cell(base_a, name)]
        for fr in cells:
            cell = process_cell(fr, frontness)
            out.paste(cell, (idx * FW, 0), cell)
            idx += 1
    return out


SPECIES = {
    "deer": {
        "dirs": DEER_DIRS_8,
        "variants": {
            "buck_light": {"src": "deer, light buck.png", "recolor": None},
            "doe_light": {"src": "deer, light doe.png", "recolor": None},
            "buck_dark": {"src": "deer, dark buck.png", "recolor": None},
            "doe_dark": {"src": "deer, dark doe.png", "recolor": None},
        },
    },
    "wolf": {
        "dirs": DIRS_8,
        "variants": {
            "gray": {"src": "fox, woods.png", "recolor": (0.0, 0.28, 0.68)},
            "dark": {"src": "fox, woods.png", "recolor": (0.0, 0.18, 0.48)},
            "timber": {"src": "fox, arctic.png", "recolor": (0.02, 0.35, 0.58)},
        },
    },
    "boar": {
        "procedural": True,
        "variants": {
            "brown": {},
            "dark": {},
            "spotted": {},
        },
    },
}


def write_attribution():
    text = """Forest wildlife sprites — mixed sources (CC-BY-SA 3.0 / GPL 3.0 where noted).

Deer + wolf (fox recolor): Liberated Pixel Cup animal pack
  https://opengameart.org/content/lpc-bears-deer-lions-and-more
  lpc_animals_2022_v1.1.zip — deer *.png, fox *.png
  Authors: Sevarihk and LPC contributors.

Boar: procedural top-down art generated for this game (same license as game assets).

Bear sprites remain in assets/bears/ (separate attribution).
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
        "species": {},
    }
    for species, cfg in SPECIES.items():
        meta["species"][species] = {"variants": {}}
        for vname, vcfg in cfg["variants"].items():
            fname = f"{species}-{vname}.png"
            path = OUT / fname
            if cfg.get("procedural"):
                img = make_boar_variant(vname)
            else:
                img = make_lpc_variant(
                    base, vcfg["src"], vcfg.get("recolor"),
                    cfg["dirs"],
                )
            img.save(path, "PNG")
            meta["species"][species]["variants"][vname] = {"file": fname}
            print("wrote", path, img.size)
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    write_attribution()
    print("wrote", OUT / "meta.json")


if __name__ == "__main__":
    main()
