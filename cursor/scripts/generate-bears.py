#!/usr/bin/env python3
"""Build bear sprite sheets from LPC reference art (CC-BY-SA / GPL).

Extracts walk-right + attack-right frames, upscales with nearest-neighbor,
recolors for variants. See assets/bears/ATTRIBUTION.txt.
"""
from __future__ import annotations

import json
import shutil
import zipfile
from io import BytesIO
from pathlib import Path
from urllib.request import urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"
OUT = ROOT / "assets" / "bears"
REF_CACHE = Path("/tmp/bear-refs/lpc_animals.zip")
LPC_URL = "https://opengameart.org/sites/default/files/lpc_animals_2022_v1.1.zip"

# LPC individual sheet layout (64×64 cells): rows 0–3 walk S/W/E/N, 4–7 attack, 8–11 die.
# Row 1 = walk east: head unambiguously at +X in sprite (matches atan2 heading).
WALK_ROW = 1
ATK_ROW = 5
WALK_COLS = (0, 1, 2, 3)
ATK_COL = 1
FACE_ROT = 0
SRC = 64
SCALE = 2  # 64 → 128 px frames
FW = FH = SRC * SCALE
N_WALK = 4
N_FRAMES = N_WALK + 1
ANCHOR_X = FW // 2
ANCHOR_Y = FH - SCALE * 4


def ensure_lpc() -> Path:
    base = REF_CACHE.parent / "lpc animals 2022 v1.1"
    grizzly = base / "individual creature spritesheets" / "bear, grizzly.png"
    if grizzly.is_file():
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


def orient_frame(img: Image.Image) -> Image.Image:
    """Top-down LPC row faces +Y; rotate to +X for in-game heading."""
    rot = img.rotate(FACE_ROT, resample=Image.Resampling.NEAREST, expand=True)
    w, h = rot.size
    out = Image.new("RGBA", (SRC, SRC), (0, 0, 0, 0))
    ox = (SRC - w) // 2
    oy = (SRC - h) // 2
    out.paste(rot, (ox, oy), rot)
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
    """HSV tweak for fur variants."""
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


def extract_frames(sheet: Image.Image) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for col in WALK_COLS:
        fr = sheet.crop((col * SRC, WALK_ROW * SRC, (col + 1) * SRC, (WALK_ROW + 1) * SRC))
        fr = orient_frame(fr)
        frames.append(upscale(add_shadow(shift_down(fr, SCALE))))
    atk = sheet.crop((ATK_COL * SRC, ATK_ROW * SRC, (ATK_COL + 1) * SRC, (ATK_ROW + 1) * SRC))
    atk = orient_frame(atk)
    frames.append(upscale(add_shadow(shift_down(atk, SCALE))))
    return frames


def build_sheet(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (FW * N_FRAMES, FH), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * FW, 0), fr)
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
    frames = extract_frames(sheet)
    if cfg["recolor"]:
        hs, sm, vm = cfg["recolor"]
        frames = [recolor(f, hs, sm, vm) for f in frames]
    return build_sheet(frames)


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
        "frames": N_FRAMES,
        "walkFrames": list(range(N_WALK)),
        "attackFrame": N_WALK,
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
    # comparison strip for review
    cmp_dir = ROOT.parent.parent / "artifacts" / "bear-compare"
    cmp_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy(OUT / "bear-brown.png", cmp_dir / "new-bear-brown.png")
    lpc = Image.open(base / "individual creature spritesheets" / "bear, grizzly.png").convert("RGBA")
    upscale(add_shadow(upscale(lpc.crop((0, WALK_ROW * SRC, SRC, (WALK_ROW + 1) * SRC))))).save(
        cmp_dir / "lpc-ref-walk0.png"
    )


if __name__ == "__main__":
    main()
