#!/usr/bin/env python3
"""TOPDOWN Anim Studio — expand / enhance sprite clips (layered GTA2 + strip wildlife).

Examples:
  python3 scripts/anim_studio.py enhance-punch
  python3 scripts/anim_studio.py enhance-strip assets/bears/bear-brown.png assets/bears/meta.json
  python3 scripts/anim_studio.py analyze-punch male arms blue S
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PARTS = ROOT / "assets" / "people" / "gta2" / "parts" / "bodies"
META_PATH = ROOT / "assets" / "people" / "gta2" / "meta.json"
ANIM_MAP = Path(__file__).resolve().parent / "gta2_ped_anim_map.json"

DIRS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"]
LAYER_ORDER = ["shoes", "pants", "arms", "torso", "skin", "hair"]
LAYER_MAP = {
    "shoes": "shoes",
    "pants": "pants",
    "arms": "arms",
    "torso": "torsos",
    "skin": "skins",
    "hair": "hairs",
}

# Screen-space punch extension per baked sprite direction (pixels at 48×48).
DIR_NUDGE = {
    "E": (3, 0),
    "SE": (2, 2),
    "S": (0, 3),
    "SW": (-2, 2),
    "W": (-3, 0),
    "NW": (-2, -2),
    "N": (0, -3),
    "NE": (2, -2),
}

# 4 GTA2 source keyframes → 8 enhanced playback frames (indices into expanded set).
PUNCH_EXPAND_MAP = [0, 1, 2, 3, 4, 5, 6, 7]
PUNCH_SOURCE_BLEND = [
    (0, 0, 0.0, 0),
    (0, 2, 0.35, 1),
    (0, 2, 0.70, 2),
    (2, 2, 1.0, 3),
    (2, 3, 0.45, 3),
    (3, 3, 1.0, 3),
    (3, 0, 0.55, 2),
    (0, 0, 0.15, 0),
]


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def crossfade(a: Image.Image, b: Image.Image, t: float) -> Image.Image:
    t = max(0.0, min(1.0, t))
    out = Image.new("RGBA", a.size, (0, 0, 0, 0))
    pa, pb, po = a.load(), b.load(), out.load()
    w, h = a.size
    for y in range(h):
        for x in range(w):
            ra, ga, ba, aa = pa[x, y]
            rb, gb, bb, ab = pb[x, y]
            alpha = aa * (1 - t) + ab * t
            if alpha < 1:
                po[x, y] = (0, 0, 0, 0)
                continue
            wa = aa * (1 - t)
            wb = ab * t
            denom = wa + wb if (wa + wb) > 0 else 1
            po[x, y] = (
                int((ra * wa + rb * wb) / denom),
                int((ga * wa + gb * wb) / denom),
                int((ba * wa + bb * wb) / denom),
                int(min(255, alpha)),
            )
    return out


def nudge_opaque(img: Image.Image, dx: int, dy: int, scale: float = 1.0) -> Image.Image:
    if dx == 0 and dy == 0:
        return img.copy()
    src = img.load()
    w, h = img.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dst = out.load()
    sx = int(round(dx * scale))
    sy = int(round(dy * scale))
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 20:
                continue
            nx, ny = x + sx, y + sy
            if 0 <= nx < w and 0 <= ny < h:
                dst[nx, ny] = (r, g, b, a)
    return out


def build_eight_frames(sources: list[Image.Image], direction: str, layer: str) -> list[Image.Image]:
    if len(sources) < 4:
        raise ValueError("need 4 source punch frames")
    nudge = DIR_NUDGE.get(direction, (0, 0))
    armish = layer in ("arms", "torsos")
    out: list[Image.Image] = []
    for si, ti, blend, nudge_strength in PUNCH_SOURCE_BLEND:
        frame = crossfade(sources[si], sources[ti], blend)
        if armish and nudge_strength > 0:
            frame = nudge_opaque(frame, nudge[0], nudge[1], 0.35 + 0.22 * nudge_strength)
        out.append(frame)
    return out


def iter_layer_variant_dirs(parts_root: Path):
    if not parts_root.is_dir():
        return
    for body_dir in sorted(parts_root.iterdir()):
        if not body_dir.is_dir():
            continue
        for layer_key, folder_name in LAYER_MAP.items():
            layer_root = body_dir / folder_name
            if not layer_root.is_dir():
                continue
            for variant_dir in sorted(layer_root.iterdir()):
                if not variant_dir.is_dir():
                    continue
                punch0 = variant_dir / "punch0"
                if punch0.is_dir():
                    yield body_dir.name, layer_key, variant_dir.name, variant_dir


def enhance_punch_layers(parts_root: Path = PARTS) -> int:
    written = 0
    for body, layer, variant, variant_dir in iter_layer_variant_dirs(parts_root):
        for direction in DIRS:
            sources = []
            ok = True
            for i in range(4):
                fp = variant_dir / f"punch{i}" / f"{direction}.png"
                if not fp.is_file():
                    ok = False
                    break
                sources.append(load_rgba(fp))
            if not ok:
                continue
            frames = build_eight_frames(sources, direction, layer)
            for i, frame in enumerate(frames):
                out_dir = variant_dir / f"punch{i}"
                out_dir.mkdir(parents=True, exist_ok=True)
                out_path = out_dir / f"{direction}.png"
                frame.save(out_path)
                written += 1
    return written


def patch_people_meta(count: int = 8, step_sec: float = 0.0525) -> None:
    if not META_PATH.is_file():
        print("meta.json missing — run npm run gen:gta2 first", file=sys.stderr)
        sys.exit(1)
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    clips = meta.setdefault("clips", {})
    punch = clips.setdefault("punch", {})
    punch["count"] = count
    punch["step_sec"] = step_sec
    folders = [f for f in meta.get("clip_folders", []) if not f.startswith("punch")]
    folders.extend([f"punch{i}" for i in range(count)])
    meta["clip_folders"] = folders
    meta["punch_enhanced"] = True
    meta["punch_source_frames"] = 4
    META_PATH.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"patched {META_PATH.relative_to(ROOT)} punch count={count} step_sec={step_sec}")


def analyze_punch(body: str, layer: str, variant: str, direction: str) -> None:
    base = PARTS / body / LAYER_MAP[layer] / variant
    for i in range(4):
        fp = base / f"punch{i}" / f"{direction}.png"
        if not fp.is_file():
            print(f"missing {fp}")
            continue
        im = load_rgba(fp)
        bbox = im.getbbox()
        nz = sum(1 for px in im.getdata() if px[3] > 0)
        print(f"punch{i}: bbox={bbox} opaque={nz}")
    a = load_rgba(base / f"punch0/{direction}.png")
    for i in range(1, 4):
        b = load_rgba(base / f"punch{i}/{direction}.png")
        diff = sum(1 for x, y in zip(a.getdata(), b.getdata()) if x != y)
        print(f"punch0 vs punch{i}: {diff} px differ")


def load_strip_frame(sheet: Image.Image, fw: int, fh: int, index: int) -> Image.Image:
    x = index * fw
    return sheet.crop((x, 0, x + fw, fh))


def paste_strip_frame(sheet: Image.Image, fw: int, fh: int, index: int, frame: Image.Image) -> None:
    sheet.paste(frame, (index * fw, 0), frame)


def enhance_strip_attack(
    sheet_path: Path,
    meta_path: Path,
    attack_frames: int = 4,
    walk_frames: int = 4,
) -> None:
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    fw = meta["frameWidth"]
    fh = meta["frameHeight"]
    fpd_old = meta.get("framesPerDirection", walk_frames + 1)
    dirs = meta.get("directionCount", 8)
    sheet = load_rgba(sheet_path)
    fpd_new = walk_frames + attack_frames
    new_w = fpd_new * fw * dirs
    out = Image.new("RGBA", (new_w, fh), (0, 0, 0, 0))

    for d in range(dirs):
        base = d * fpd_old
        new_base = d * fpd_new
        walk_src = [load_strip_frame(sheet, fw, fh, base + i) for i in range(walk_frames)]
        atk_src = load_strip_frame(sheet, fw, fh, base + (meta.get("attackFrame", walk_frames)))
        for i in range(walk_frames):
            paste_strip_frame(out, fw, fh, new_base + i, walk_src[i])
        # attack: wind-up from last walk, lunge, hold, recover
        seq = [
            crossfade(walk_src[-1], atk_src, 0.35),
            crossfade(walk_src[-1], atk_src, 0.70),
            nudge_opaque(atk_src, 0, 2, 1.0),
            crossfade(atk_src, walk_src[0], 0.45),
        ][:attack_frames]
        for j, frame in enumerate(seq):
            paste_strip_frame(out, fw, fh, new_base + walk_frames + j, frame)

    out.save(sheet_path)
    meta["framesPerDirection"] = fpd_new
    meta["attackFrames"] = attack_frames
    meta["attackFrame"] = walk_frames
    meta["attackFrameEnd"] = walk_frames + attack_frames - 1
    meta["walkFrames"] = list(range(walk_frames))
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"enhanced strip {sheet_path.name}: {fpd_old}→{fpd_new} frames/dir, attack={attack_frames}")


def cmd_enhance_punch(_: argparse.Namespace) -> None:
    if not PARTS.is_dir():
        print("parts/bodies missing — run: npm run gen:gta2", file=sys.stderr)
        sys.exit(1)
    n = enhance_punch_layers()
    patch_people_meta()
    print(f"enhance-punch: wrote {n} layer PNGs (4→8 frames per clip)")


def cmd_enhance_strip(args: argparse.Namespace) -> None:
    sheet = Path(args.sheet)
    meta = Path(args.meta)
    if not sheet.is_file() or not meta.is_file():
        print("sheet or meta not found", file=sys.stderr)
        sys.exit(1)
    enhance_strip_attack(sheet, meta, attack_frames=args.attack_frames)


def cmd_analyze_punch(args: argparse.Namespace) -> None:
    analyze_punch(args.body, args.layer, args.variant, args.direction)


def main() -> None:
    p = argparse.ArgumentParser(description="TOPDOWN Anim Studio CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    ep = sub.add_parser("enhance-punch", help="GTA2 punch 4→8 frames + meta patch")
    ep.set_defaults(func=cmd_enhance_punch)

    es = sub.add_parser("enhance-strip", help="wildlife/bear strip: expand attack frames")
    es.add_argument("sheet")
    es.add_argument("meta")
    es.add_argument("--attack-frames", type=int, default=4)
    es.set_defaults(func=cmd_enhance_strip)

    ap = sub.add_parser("analyze-punch", help="compare punch source frame diffs")
    ap.add_argument("body")
    ap.add_argument("layer")
    ap.add_argument("variant")
    ap.add_argument("direction")
    ap.set_defaults(func=cmd_analyze_punch)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
