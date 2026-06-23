#!/usr/bin/env python3
"""Generate top-down bear sprite sheets — compact, wide, heavy (not worm-shaped).

Each variant: 4 walk + 1 attack. Bears face +X; game rotates by heading.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "topdown-city"
OUT = ROOT / "assets" / "bears"

# Square frame → round heavy silhouette (width ≈ length)
FW, FH = 88, 88
SS = 4
W, H = FW * SS, FH * SS
N_WALK = 4
N_ATTACK = 1
N_FRAMES = N_WALK + N_ATTACK
ANCHOR_X = W // 2
ANCHOR_Y = H - SS * 3


def s(v: float) -> float:
    return v * SS


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def fur_strokes(draw, cx, cy, rx, ry, r, palette, count: int):
    for _ in range(count):
        a = r.random() * 6.283
        rad = math.sqrt(r.random()) * 0.88
        x = cx + math.cos(a) * rx * rad
        y = cy + math.sin(a) * ry * rad
        lit = -0.45 * ((x - cx) / rx) - 0.5 * ((y - cy) / ry)
        if lit > 0.12:
            col = palette["hi"] if r.random() < 0.35 else palette["h"]
        elif lit > -0.08:
            col = palette["l"] if r.random() < 0.4 else palette["m"]
        else:
            col = palette["d"] if r.random() < 0.5 else palette["dk"]
        tangent = a + math.pi / 2 + (r.random() - 0.5) * 0.45
        ln = r.uniform(s(1.2), s(3.5))
        draw.line(
            [(x, y), (x + math.cos(tangent) * ln, y + math.sin(tangent) * ln * 0.8)],
            fill=col,
            width=max(1, SS // 2),
        )


def draw_claw_paw(draw, x, y, palette, *, forward: float = 0, spread: float = 0, attack: bool = False):
    """Chunky paw — wide stance, visible claws."""
    x += forward
    y += spread
    hw, hh = s(7.5), s(6.5)
    draw.ellipse([x - hw, y - hh, x + hw, y + hh], fill=palette["dk"])
    draw.ellipse([x - hw * 0.82, y - hh * 0.72, x + hw * 0.82, y + hh * 0.68], fill=palette["m"])
    claw_len = s(4.5 if attack else 3.2)
    for i in range(4):
        fx = x + (i - 1.5) * s(3.6)
        fy = y + hh * 0.55
        tx = fx + s(1.5 if attack else 0.8)
        ty = fy + claw_len
        draw.line([(fx, fy), (tx, ty)], fill=(35, 28, 22), width=max(2, SS // 2))


def draw_bear_frame(
    draw: ImageDraw.ImageDraw,
    r: random.Random,
    palette: dict,
    *,
    walk_i: int = 0,
    attack: bool = False,
):
    """Wide, tanky bear mass — head + shoulders + haunches, not a segmented worm."""
    cx, cy = W * 0.50, H * 0.52

    ph = 0 if attack else (walk_i / N_WALK) * math.pi * 2
    # Walk: paws step forward/back along facing axis only (no lateral worm wiggle)
    step = s(4.5)
    fl_f = math.sin(ph) * step
    fr_f = math.sin(ph + math.pi) * step
    bl_f = math.sin(ph + math.pi) * step * 0.85
    br_f = math.sin(ph) * step * 0.85

    if attack:
        fl_f, fr_f, bl_f, br_f = s(10), s(10), s(-2), s(-2)
        spread_f, spread_b = s(20), s(14)
    else:
        spread_f, spread_b = s(15), s(15)

    # Ground shadow — wide oval
    draw.ellipse([cx - s(26), cy + s(16), cx + s(26), cy + s(24)], fill=(0, 0, 0, 60))

    # === REAR HAUNCHES (wide, not a tail segment) ===
    rx, ry = cx - s(10), cy
    draw.ellipse([rx - s(18), ry - s(17), rx + s(6), ry + s(17)], fill=palette["dk"])
    draw.ellipse([rx - s(15), ry - s(14), rx + s(3), ry + s(14)], fill=palette["d"])

    # === MAIN BODY — almost as wide as long ===
    bx, by = cx - s(2), cy - s(2)
    draw.ellipse([bx - s(20), by - s(19), bx + s(18), by + s(19)], fill=palette["dk"])
    draw.ellipse([bx - s(18), by - s(17), bx + s(16), by + s(17)], fill=palette["m"])
    draw.ellipse([bx - s(10), by - s(12), bx + s(8), by + s(4)], fill=palette["l"])
    fur_strokes(draw, bx, by, s(17), s(15), r, palette, int(42 * SS))

    # Shoulder humps (side bulk — makes bear look massive from above)
    draw.ellipse([cx + s(2), cy - s(20), cx + s(16), cy - s(8)], fill=palette["h"])
    draw.ellipse([cx + s(2), cy + s(8), cx + s(16), cy + s(20)], fill=palette["d"])

    # Back legs — wide stance
    draw_claw_paw(draw, cx - s(14) + bl_f, cy + spread_b, palette, forward=bl_f * 0.2)
    draw_claw_paw(draw, cx - s(14) + br_f, cy - spread_b, palette, forward=br_f * 0.2)

    # Front legs — thick, forward
    fx = cx + s(12)
    draw_claw_paw(draw, fx + fl_f, cy + spread_f, palette, forward=fl_f * 0.35, attack=attack)
    draw_claw_paw(draw, fx + fr_f, cy - spread_f, palette, forward=fr_f * 0.35, attack=attack)

    # === HEAD — big, merged with chest (not a ball on a stick) ===
    hx, hy = cx + s(18), cy - s(1)
    if attack:
        hx += s(6)
        hy -= s(2)
    draw.ellipse([hx - s(16), hy - s(15), hx + s(14), hy + s(15)], fill=palette["d"])
    draw.ellipse([hx - s(13), hy - s(13), hx + s(11), hy + s(11)], fill=palette["m"])
    fur_strokes(draw, hx, hy, s(12), s(11), r, palette, int(20 * SS))

    # Ears — small vs massive head
    for ex, ey in [(hx - s(9), hy - s(12)), (hx + s(5), hy - s(13))]:
        draw.ellipse([ex - s(3.5), ey - s(3), ex + s(3.5), ey + s(3)], fill=palette["dk"])

    # Snout / muzzle block
    sx, sy = hx + s(12), hy + s(2)
    if attack:
        sx += s(6)
    draw.ellipse([sx - s(8), sy - s(6), sx + s(8), sy + s(7)], fill=palette["snout"])
    draw.ellipse([sx - s(5), sy - s(4), sx + s(3), sy + s(3)], fill=palette["snout_l"])
    draw.ellipse([sx + s(2), sy + s(1), sx + s(5), sy + s(4)], fill=(22, 16, 12))

    if attack:
        # Roaring maw
        draw.polygon(
            [(sx - s(3), sy + s(1)), (sx + s(10), sy + s(4)), (sx + s(4), sy + s(11)), (sx - s(6), sy + s(7))],
            fill=(130, 28, 22),
        )
        for tx in [sx + s(2), sx + s(5), sx + s(8)]:
            draw.line([(tx, sy + s(3)), (tx + s(1), sy + s(7))], fill=(240, 235, 220), width=max(1, SS // 2))
        # Angry eyes
        for ex, ey in [(hx - s(4), hy - s(5)), (hx + s(6), hy - s(5))]:
            draw.ellipse([ex - s(2.5), ey - s(2), ex + s(2.5), ey + s(2)], fill=(180, 30, 25))
    else:
        draw.ellipse([hx + s(3), hy - s(4), hx + s(6.5), hy - s(1.5)], fill=(28, 20, 16))


VARIANTS = {
    "brown": {
        "dk": "#221408", "d": "#3a2418", "m": "#583820", "l": "#785030", "h": "#986848", "hi": "#b88858",
        "snout": "#483020", "snout_l": "#685040",
    },
    "dark": {
        "dk": "#0c0a08", "d": "#1c1814", "m": "#2c2820", "l": "#403830", "h": "#585048", "hi": "#706860",
        "snout": "#282018", "snout_l": "#403830",
    },
    "cinnamon": {
        "dk": "#301008", "d": "#502818", "m": "#703820", "l": "#905030", "h": "#b06838", "hi": "#d08048",
        "snout": "#603020", "snout_l": "#805040",
    },
    "grizzly": {
        "dk": "#281808", "d": "#443020", "m": "#604830", "l": "#806040", "h": "#a08058", "hi": "#c0a070",
        "snout": "#584028", "snout_l": "#786048",
    },
}


def make_variant(name: str) -> Image.Image:
    r = random.Random(sum(ord(c) * (i + 1) for i, c in enumerate(name)))
    pal = {k: hex_rgb(v) for k, v in VARIANTS[name].items()}
    sheet = Image.new("RGBA", (W * N_FRAMES, H), (0, 0, 0, 0))
    for fi in range(N_FRAMES):
        frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        attack = fi >= N_WALK
        walk_i = fi if not attack else 0
        draw_bear_frame(draw, r, pal, walk_i=walk_i, attack=attack)
        sheet.paste(frame, (fi * W, 0))
    return sheet


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {
        "frameWidth": W,
        "frameHeight": H,
        "frames": N_FRAMES,
        "walkFrames": list(range(N_WALK)),
        "attackFrame": N_WALK,
        "anchorX": ANCHOR_X,
        "anchorY": ANCHOR_Y,
        "variants": {},
    }
    for name in VARIANTS:
        path = OUT / f"bear-{name}.png"
        img = make_variant(name)
        img.save(path, "PNG")
        meta["variants"][name] = {"file": path.name}
        print("wrote", path, img.size)
    meta_path = OUT / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("wrote", meta_path)


if __name__ == "__main__":
    main()
