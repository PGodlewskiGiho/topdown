#!/usr/bin/env python3
"""Generate desert temples and abandoned ruin PNG sprites for TOPDOWN CITY."""
from PIL import Image, ImageDraw, ImageFilter
import json, math, os, random

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "ruins")
random.seed(91)


def rgba(c, a=255):
    return (*c, a)


def shade(c, amt):
    return tuple(max(0, min(255, ch + amt)) for ch in c)


def new_canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def draw_sand_drift(d, y0, w, h):
    for _ in range(18):
        x = random.randint(8, w - 8)
        y = y0 + random.randint(0, 12)
        d.ellipse((x, y, x + random.randint(14, 28), y + random.randint(4, 9)), fill=rgba((210, 178, 118), random.randint(40, 90)))


def temple_sandstone():
    w, h = 208, 300
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    sand = (198, 168, 108)
    stone = (186, 158, 112)
    dark = (142, 112, 78)
    split_y = 198
    # platform / steps
    d.rectangle((12, h - 22, w - 12, h - 8), fill=rgba(dark, 255))
    d.rectangle((18, h - 28, w - 18, h - 20), fill=rgba(shade(stone, -18), 255))
    d.rectangle((24, h - 34, w - 24, h - 26), fill=rgba(stone, 255))
    draw_sand_drift(d, h - 24, w, h)
    # wall back
    d.rectangle((28, split_y - 8, w - 28, h - 34), fill=rgba(shade(stone, -8), 255))
    # columns
    for cx in (52, 104, 156):
        d.rectangle((cx - 9, split_y - 6, cx + 9, h - 36), fill=rgba(stone, 255))
        d.rectangle((cx - 11, split_y - 10, cx + 11, split_y - 2), fill=rgba(shade(stone, 14), 255))
        d.ellipse((cx - 10, h - 40, cx + 10, h - 30), fill=rgba(shade(stone, 10), 255))
        for gy in range(split_y, h - 38, 14):
            d.line([(cx - 8, gy), (cx + 8, gy)], fill=rgba(dark, 80), width=1)
    # pediment
    d.polygon([(22, split_y - 8), (w - 22, split_y - 8), (w - 38, 38), (38, 38)], fill=rgba(shade(stone, 6), 255))
    d.polygon([(32, split_y - 12), (w - 32, split_y - 12), (w - 48, 48), (48, 48)], fill=rgba(shade(stone, 18), 255))
    # inner shadow / doorway
    d.rectangle((88, split_y - 4, 120, h - 36), fill=rgba((58, 48, 38), 220))
    d.polygon([(96, split_y - 6), (112, split_y - 6), (104, split_y - 18)], fill=rgba((48, 38, 28), 240))
    # weathering
    for _ in range(40):
        x, y = random.randint(30, w - 30), random.randint(50, h - 40)
        d.ellipse((x, y, x + 3, y + 2), fill=rgba(dark, random.randint(30, 70)))
    # sand on ledges
    d.rectangle((24, split_y - 4, w - 24, split_y + 2), fill=rgba(sand, 120))
    return im, w // 2, h - 2, split_y


def temple_obelisk():
    w, h = 160, 280
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    stone = (170, 142, 98)
    dark = (118, 92, 62)
    split_y = 180
    d.rectangle((20, h - 20, w - 20, h - 8), fill=rgba(dark, 255))
    draw_sand_drift(d, h - 18, w, h)
    # base blocks
    d.rectangle((36, h - 38, w - 36, h - 22), fill=rgba(stone, 255))
    d.rectangle((48, h - 52, w - 48, h - 36), fill=rgba(shade(stone, 8), 255))
    # obelisk shaft
    d.polygon([(w // 2 - 18, h - 52), (w // 2 + 18, h - 52), (w // 2 + 12, 42), (w // 2 - 12, 42)], fill=rgba(stone, 255))
    d.polygon([(w // 2 - 10, 42), (w // 2 + 10, 42), (w // 2, 22)], fill=rgba(shade(stone, 16), 255))
    # hieroglyph bands
    for gy in range(70, h - 60, 22):
        for gx in range(w // 2 - 8, w // 2 + 8, 5):
            d.rectangle((gx, gy, gx + 2, gy + 6), fill=rgba(dark, 140))
    # fallen block
    d.rectangle((18, h - 48, 52, h - 38), fill=rgba(shade(stone, -12), 230))
    return im, w // 2, h - 2, split_y


def ruin_cottage():
    w, h = 192, 248
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    wall = (120, 118, 108)
    roof = (88, 72, 58)
    moss = (68, 98, 52)
    split_y = 158
    d.rectangle((20, h - 16, w - 20, h - 8), fill=rgba(shade(wall, -35), 255))
    d.rectangle((24, split_y, w - 24, h - 16), fill=rgba(wall, 255))
    for _ in range(80):
        x, y = random.randint(26, w - 26), random.randint(split_y + 4, h - 20)
        d.ellipse((x, y, x + 3, y + 2), fill=rgba(shade(wall, random.randint(-20, 15)), random.randint(40, 90)))
    # broken roof — missing right half
    d.polygon([(18, split_y + 2), (w - 18, split_y + 2), (w - 50, 36), (50, 36)], fill=rgba(roof, 255))
    d.polygon([(18, split_y + 2), (110, split_y + 2), (90, 36), (50, 36)], fill=rgba(shade(roof, -14), 255))
    # hole in roof
    d.polygon([(118, split_y), (148, split_y - 8), (138, 52), (108, 58)], fill=rgba((40, 44, 38), 180))
    # boarded door
    d.rectangle((82, split_y + 18, 110, h - 18), fill=rgba((68, 58, 48), 255))
    for yy in range(split_y + 22, h - 22, 8):
        d.line([(84, yy), (108, yy)], fill=rgba((48, 40, 32), 200), width=2)
    # broken windows
    for cx in (48, 144):
        d.rectangle((cx - 14, split_y + 36, cx + 14, split_y + 72), fill=rgba((42, 48, 38), 240))
        d.line([(cx - 12, split_y + 38), (cx + 10, split_y + 70)], fill=rgba((28, 32, 24), 220), width=2)
        d.line([(cx + 10, split_y + 40), (cx - 12, split_y + 68)], fill=rgba((28, 32, 24), 220), width=2)
    # moss patches
    for _ in range(12):
        x, y = random.randint(26, w - 26), random.randint(split_y + 8, h - 24)
        d.ellipse((x, y, x + random.randint(10, 22), y + random.randint(6, 14)), fill=rgba(moss, random.randint(100, 180)))
    # ivy vine
    d.line([(w - 28, h - 20), (w - 32, split_y + 40), (w - 24, split_y + 20)], fill=rgba(moss, 200), width=3)
    return im, w // 2, h - 2, split_y


def ruin_farm():
    w, h = 220, 260
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    wall = (108, 102, 92)
    roof = (78, 64, 52)
    moss = (58, 88, 48)
    split_y = 168
    d.rectangle((16, h - 18, w - 16, h - 8), fill=rgba(shade(wall, -40), 255))
    d.rectangle((20, split_y, w - 20, h - 18), fill=rgba(wall, 255))
    # collapsed roof
    d.polygon([(16, split_y + 4), (w - 16, split_y + 4), (w - 30, 32), (30, 32)], fill=rgba(roof, 230))
    d.polygon([(16, split_y + 4), (w * 0.55, split_y + 4), (w * 0.45, 32), (30, 32)], fill=rgba(shade(roof, -18), 255))
    # sagging beam
    d.line([(40, split_y + 8), (w - 36, split_y + 18)], fill=rgba((58, 48, 38), 220), width=4)
    # missing wall section
    d.rectangle((w - 48, split_y + 24, w - 26, h - 28), fill=rgba((48, 52, 44), 160))
    # windows — one intact boarded, one gone
    d.rectangle((38, split_y + 32, 68, split_y + 68), fill=rgba((36, 42, 34), 240))
    for yy in range(split_y + 34, split_y + 66, 7):
        d.line([(40, yy), (66, yy)], fill=rgba((52, 44, 36), 180), width=2)
    d.rectangle((118, split_y + 36, 148, split_y + 72), fill=rgba((32, 38, 28), 200))
    # overgrown field grass at base
    for gx in range(24, w - 24, 6):
        gh = random.randint(8, 18)
        d.line([(gx, h - 18), (gx + random.randint(-2, 2), h - 18 - gh)], fill=rgba((72, 98, 48), random.randint(140, 220)), width=2)
    for _ in range(16):
        x, y = random.randint(22, w - 22), random.randint(split_y + 10, h - 22)
        d.ellipse((x, y, x + random.randint(12, 24), y + random.randint(8, 16)), fill=rgba(moss, random.randint(80, 150)))
    return im, w // 2, h - 2, split_y


BUILDERS = {
    "temple_sandstone": temple_sandstone,
    "temple_obelisk": temple_obelisk,
    "ruin_cottage": ruin_cottage,
    "ruin_farm": ruin_farm,
}


def main():
    os.makedirs(ROOT, exist_ok=True)
    meta = {"width": 208, "height": 300, "splitY": 198, "anchorX": 104, "anchorY": 298, "kinds": {}}
    for name, fn in BUILDERS.items():
        im, ax, ay, split_y = fn()
        fname = f"{name}.png"
        im = im.filter(ImageFilter.GaussianBlur(0.3))
        im.save(os.path.join(ROOT, fname))
        meta["kinds"][name] = {
            "file": fname,
            "width": im.width,
            "height": im.height,
            "splitY": split_y,
            "anchorX": ax,
            "anchorY": ay,
            "hd": True,
        }
        print("wrote", fname, im.size)
    with open(os.path.join(ROOT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("done", len(meta["kinds"]), "ruin kinds")


if __name__ == "__main__":
    main()
