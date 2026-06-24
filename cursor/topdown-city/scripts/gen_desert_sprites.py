#!/usr/bin/env python3
"""Generate desert floor PNG sprites for TOPDOWN CITY (assets/sand-desert/)."""
from PIL import Image, ImageDraw, ImageFilter
import json, math, os, random

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "sand-desert")
random.seed(42)

PAL = {
    "sand1": (202, 170, 106),
    "sand2": (186, 148, 88),
    "sand3": (218, 188, 124),
    "dark": (142, 108, 62),
    "light": (236, 214, 168),
    "salt": (228, 222, 200),
    "rock": (138, 118, 92),
    "sage": (120, 132, 78),
    "bone": (230, 220, 198),
    "wood": (120, 88, 52),
}


def rgba(c, a=255):
    return (*c, a)


def new_canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def ripple_light():
    w, h = 56, 40
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    for i in range(5):
        y = 8 + i * 6
        col = rgba(PAL["light" if i % 2 else "sand3"], 90 + i * 8)
        pts = [(4, y)]
        for x in range(4, w - 4, 3):
            pts.append((x, y + math.sin(x * 0.22 + i) * 1.8))
        d.line(pts, fill=col, width=2)
    d.ellipse((8, 22, 48, 36), fill=rgba(PAL["sand2"], 55))
    return im, w // 2, h - 2


def ripple_dark():
    w, h = 52, 38
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    d.ellipse((6, 10, 46, 32), fill=rgba(PAL["dark"], 70))
    for i in range(4):
        y = 12 + i * 5
        d.arc((2, y - 2, w - 2, y + 8), 0, 180, fill=rgba(PAL["dark"], 110), width=2)
    return im, w // 2, h - 2


def dune_crest():
    w, h = 64, 44
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    d.polygon([(0, h), (w * 0.35, 10), (w * 0.65, 8), (w, h)], fill=rgba(PAL["sand3"], 120))
    d.polygon([(w * 0.2, h), (w * 0.5, 14), (w * 0.8, h)], fill=rgba(PAL["light"], 95))
    d.line([(0, h - 1), (w, h - 1)], fill=rgba(PAL["dark"], 80), width=2)
    return im, w // 2, h - 1


def cracked_earth():
    w, h = 48, 44
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    d.ellipse((4, 8, 44, 40), fill=rgba(PAL["sand2"], 100))
    cracks = [(24, 10, 18, 28), (14, 18, 30, 34), (30, 16, 12, 36), (20, 22, 36, 30)]
    for x1, y1, x2, y2 in cracks:
        d.line([(x1, y1), (x2, y2)], fill=rgba(PAL["dark"], 140), width=1)
        d.line([(x1 + 1, y1), (x2 + 1, y2)], fill=rgba(PAL["light"], 60), width=1)
    return im, w // 2, h - 2


def salt_patch():
    w, h = 50, 36
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    d.ellipse((2, 6, 48, 34), fill=rgba(PAL["salt"], 130))
    for _ in range(12):
        x, y = random.randint(8, 42), random.randint(10, 30)
        d.ellipse((x, y, x + 3, y + 2), fill=rgba((255, 255, 255), 70))
    return im, w // 2, h - 2


def pebble_cluster():
    w, h = 40, 32
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    for _ in range(7):
        x, y = random.randint(6, 32), random.randint(10, 26)
        r = random.randint(2, 5)
        c = PAL["rock"] if random.random() < 0.7 else PAL["dark"]
        d.ellipse((x - r, y - r, x + r, y + r), fill=rgba(c, 210))
        d.ellipse((x - r // 2, y - r, x, y - r // 2), fill=rgba(PAL["light"], 80))
    return im, w // 2, h - 2


def sage_bush():
    w, h = 44, 48
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    d.ellipse((10, 28, 34, 44), fill=rgba(PAL["dark"], 60))
    for i in range(6):
        ang = i / 6 * math.tau
        cx, cy = 22 + math.cos(ang) * 8, 26 + math.sin(ang) * 5
        d.ellipse((cx - 9, cy - 7, cx + 9, cy + 7), fill=rgba(PAL["sage"], 170))
    d.ellipse((16, 18, 28, 30), fill=rgba((148, 162, 92), 190))
    return im, w // 2, h - 2


def tumbleweed():
    w, h = 46, 46
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    cx, cy = 23, 24
    for i in range(18):
        ang = i / 18 * math.tau
        x2 = cx + math.cos(ang) * 14
        y2 = cy + math.sin(ang) * 12
        d.line([(cx, cy), (x2, y2)], fill=rgba(PAL["wood"], 160), width=2)
    d.ellipse((cx - 12, cy - 10, cx + 12, cy + 10), outline=rgba(PAL["wood"], 120), width=2)
    return im, w // 2, h - 2


def driftwood():
    w, h = 52, 28
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((6, 10, 46, 20), radius=6, fill=rgba(PAL["wood"], 200))
    d.line([(10, 12), (42, 18)], fill=rgba(PAL["dark"], 100), width=2)
    d.ellipse((14, 11, 20, 15), fill=rgba(PAL["light"], 70))
    return im, w // 2, h - 2


def bone():
    w, h = 36, 20
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((10, 8, 26, 12), radius=3, fill=rgba(PAL["bone"], 220))
    d.ellipse((6, 6, 14, 14), fill=rgba(PAL["bone"], 220))
    d.ellipse((22, 6, 30, 14), fill=rgba(PAL["bone"], 220))
    return im, w // 2, h - 2


def dry_grass():
    w, h = 40, 44
    im = new_canvas(w, h)
    d = ImageDraw.Draw(im)
    for i in range(8):
        x = 8 + i * 4
        hgt = random.randint(14, 28)
        d.line([(x, 40), (x + random.randint(-3, 3), 40 - hgt)], fill=rgba(PAL["wood"], 150), width=2)
    return im, w // 2, h - 1


BUILDERS = {
    "ripple_light": ripple_light,
    "ripple_dark": ripple_dark,
    "dune_crest": dune_crest,
    "cracked_earth": cracked_earth,
    "salt_patch": salt_patch,
    "pebble_cluster": pebble_cluster,
    "sage_bush": sage_bush,
    "tumbleweed": tumbleweed,
    "driftwood": driftwood,
    "bone": bone,
    "dry_grass": dry_grass,
}


def main():
    os.makedirs(ROOT, exist_ok=True)
    meta = {"variants": {}}
    for name, fn in BUILDERS.items():
        im, ax, ay = fn()
        im = im.filter(ImageFilter.GaussianBlur(0.4))
        fname = f"{name}.png"
        path = os.path.join(ROOT, fname)
        im.save(path)
        meta["variants"][name] = {
            "file": fname,
            "width": im.width,
            "height": im.height,
            "anchorX": ax,
            "anchorY": ay,
        }
        print("wrote", fname, im.size)
    with open(os.path.join(ROOT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("done", len(meta["variants"]), "variants")


if __name__ == "__main__":
    main()
