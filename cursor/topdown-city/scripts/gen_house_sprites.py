#!/usr/bin/env python3
"""Generate residential house PNG sprites for TOPDOWN CITY (assets/houses/)."""
from PIL import Image, ImageDraw, ImageFilter
import json, math, os, random

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "houses")
random.seed(77)

W, H = 192, 256
SPLIT_Y = 168
ANCHOR_X, ANCHOR_Y = 96, 255


def rgba(c, a=255):
    return (*c, a)


def new_canvas(w=W, h=H):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def shade(c, amt):
    return tuple(max(0, min(255, ch + amt)) for ch in c)


def draw_foundation(d, wall_col):
    d.rectangle((18, H - 18, W - 18, H - 8), fill=rgba(shade(wall_col, -35), 255))
    d.rectangle((20, H - 16, W - 20, H - 10), fill=rgba(shade(wall_col, -55), 255))


def draw_wall_body(d, wall_col, texture="stucco"):
    d.rectangle((22, SPLIT_Y, W - 22, H - 18), fill=rgba(wall_col, 255))
    if texture == "stucco":
        for _ in range(120):
            x, y = random.randint(24, W - 24), random.randint(SPLIT_Y + 4, H - 22)
            c = shade(wall_col, random.randint(-18, 14))
            d.ellipse((x, y, x + random.randint(2, 5), y + random.randint(1, 3)), fill=rgba(c, 55))
    elif texture == "brick":
        for row in range(SPLIT_Y + 6, H - 20, 8):
            off = 0 if ((row - SPLIT_Y) // 8) % 2 == 0 else 10
            for x in range(24 + off, W - 24, 20):
                c = shade(wall_col, random.randint(-22, 10))
                d.rectangle((x, row, x + 18, row + 6), fill=rgba(c, 240))
                d.line([(x, row), (x + 18, row)], fill=rgba(shade(c, 18), 90), width=1)
    elif texture == "siding":
        for row in range(SPLIT_Y + 8, H - 20, 7):
            c = shade(wall_col, -8 if row % 14 == 0 else 6)
            d.rectangle((24, row, W - 24, row + 5), fill=rgba(c, 230))
    elif texture == "wood":
        for x in range(26, W - 26, 14):
            c = shade(wall_col, random.randint(-16, 12))
            d.rectangle((x, SPLIT_Y + 6, x + 11, H - 20), fill=rgba(c, 235))
            d.line([(x + 2, SPLIT_Y + 6), (x + 2, H - 20)], fill=rgba(shade(c, -25), 80), width=1)
    # top highlight / bottom shade
    d.rectangle((22, SPLIT_Y, W - 22, SPLIT_Y + 10), fill=rgba((255, 255, 255), 22))
    d.rectangle((22, H - 28, W - 22, H - 18), fill=rgba((0, 0, 0), 18))


def draw_window(d, cx, cy, ww, wh, shutter_col=None, flower=False):
    x0, y0 = cx - ww // 2, cy - wh // 2
    d.rectangle((x0 - 3, y0 - 3, x0 + ww + 3, y0 + wh + 3), fill=rgba((58, 48, 38), 255))
    d.rectangle((x0 - 1, y0 - 1, x0 + ww + 1, y0 + wh + 1), fill=rgba((240, 244, 248), 255))
    d.rectangle((x0 + 2, y0 + 2, x0 + ww - 2, y0 + wh // 2 - 1), fill=rgba((168, 204, 228), 230))
    d.rectangle((x0 + 2, y0 + wh // 2 + 1, x0 + ww - 2, y0 + wh - 2), fill=rgba((198, 224, 242), 210))
    d.line([(x0 + ww // 2, y0), (x0 + ww // 2, y0 + wh)], fill=rgba((58, 48, 38), 200), width=2)
    d.line([(x0, y0 + wh // 2), (x0 + ww, y0 + wh // 2)], fill=rgba((58, 48, 38), 200), width=2)
    d.polygon([(x0 + 4, y0 + 4), (x0 + ww // 2 - 2, y0 + wh // 2 - 2), (x0 + 4, y0 + wh // 2 - 2)], fill=rgba((255, 255, 255), 55))
    if shutter_col:
        d.rectangle((x0 - 8, y0 - 2, x0 - 2, y0 + wh + 2), fill=rgba(shutter_col, 240))
        d.rectangle((x0 + ww + 2, y0 - 2, x0 + ww + 8, y0 + wh + 2), fill=rgba(shutter_col, 240))
        for i in range(4):
            yy = y0 + 4 + i * (wh // 4)
            d.line([(x0 - 7, yy), (x0 - 3, yy)], fill=rgba(shade(shutter_col, -30), 120), width=1)
            d.line([(x0 + ww + 3, yy), (x0 + ww + 7, yy)], fill=rgba(shade(shutter_col, -30), 120), width=1)
    if flower:
        d.rectangle((x0 - 2, y0 + wh + 2, x0 + ww + 2, y0 + wh + 8), fill=rgba((92, 68, 42), 255))
        for fx in range(x0, x0 + ww, 8):
            col = random.choice([(220, 80, 90), (240, 200, 80), (180, 100, 180), (255, 255, 255)])
            d.ellipse((fx, y0 + wh + 1, fx + 6, y0 + wh + 7), fill=rgba(col, 220))


def draw_door(d, cx, top, dw, dh, door_col):
    x0, y0 = cx - dw // 2, top
    d.rectangle((x0 - 4, y0 - 6, x0 + dw + 4, y0 + dh + 4), fill=rgba((52, 42, 34), 255))
    d.rectangle((x0, y0, x0 + dw, y0 + dh), fill=rgba(door_col, 255))
    d.rectangle((x0 + 3, y0 + 3, x0 + dw // 2 - 2, y0 + dh // 2 - 2), fill=rgba(shade(door_col, 16), 200))
    d.rectangle((x0 + dw // 2 + 2, y0 + 3, x0 + dw - 3, y0 + dh // 2 - 2), fill=rgba(shade(door_col, -10), 200))
    d.ellipse((x0 + dw - 10, y0 + dh // 2 - 2, x0 + dw - 6, y0 + dh // 2 + 2), fill=rgba((220, 180, 60), 255))
    d.rectangle((x0 - 2, y0 + dh, x0 + dw + 2, y0 + dh + 5), fill=rgba((130, 118, 102), 255))


def draw_roof_gable(d, roof_col, roof_dark, style="tile"):
    # main roof mass
    d.polygon([(14, SPLIT_Y + 4), (W - 14, SPLIT_Y + 4), (W - 28, 28), (28, 28)], fill=rgba(roof_dark, 255))
    d.polygon([(18, SPLIT_Y), (W - 18, SPLIT_Y), (W - 32, 34), (32, 34)], fill=rgba(roof_col, 255))
    if style == "tile":
        for row in range(38, SPLIT_Y - 4, 10):
            span = int((row - 30) * 0.55)
            x0, x1 = W // 2 - span, W // 2 + span
            c = shade(roof_col, 8 if (row // 10) % 2 else -10)
            d.line([(x0, row), (x1, row)], fill=rgba(c, 220), width=3)
            for x in range(x0, x1, 14):
                d.arc((x - 2, row - 4, x + 14, row + 4), 180, 360, fill=rgba(shade(c, -12), 180), width=2)
    elif style == "shingle":
        for row in range(40, SPLIT_Y, 8):
            span = int((row - 32) * 0.58)
            x0, x1 = W // 2 - span, W // 2 + span
            c = shade(roof_col, random.randint(-14, 10))
            d.line([(x0, row), (x1, row)], fill=rgba(c, 210), width=4)
    elif style == "flat":
        d.rectangle((20, SPLIT_Y - 18, W - 20, SPLIT_Y + 2), fill=rgba(roof_col, 255))
        d.rectangle((24, SPLIT_Y - 22, W - 24, SPLIT_Y - 16), fill=rgba(shade(roof_col, 20), 255))
    # gable highlight
    d.polygon([(W // 2 - 8, 32), (W // 2 + 8, 32), (W // 2, 22)], fill=rgba(shade(roof_col, 28), 255))
    # eaves shadow
    d.line([(18, SPLIT_Y), (W - 18, SPLIT_Y)], fill=rgba((0, 0, 0), 60), width=2)


def draw_chimney(d, cx, roof_col):
    d.rectangle((cx - 7, 44, cx + 7, SPLIT_Y - 6), fill=rgba((110, 88, 72), 255))
    d.rectangle((cx - 9, 40, cx + 9, 48), fill=rgba(shade((110, 88, 72), 18), 255))
    d.rectangle((cx - 5, 46, cx + 5, SPLIT_Y - 10), fill=rgba((96, 76, 62), 200))


def build_house(name, wall, roof, roof_dark, door, texture="stucco", roof_style="tile", shutters=None, flowers=False, chimney_x=140):
    im = new_canvas()
    d = ImageDraw.Draw(im)
    draw_roof_gable(d, roof, roof_dark, roof_style)
    draw_chimney(d, chimney_x, roof)
    draw_wall_body(d, wall, texture)
    draw_foundation(d, wall)
    wy = SPLIT_Y + 52
    draw_window(d, 56, wy, 34, 40, shutters, flowers)
    draw_window(d, 136, wy, 34, 40, shutters, flowers)
    draw_door(d, 96, SPLIT_Y + 34, 34, 58, door)
    # porch light
    d.ellipse((118, SPLIT_Y + 38, 124, SPLIT_Y + 44), fill=rgba((255, 230, 160), 220))
    d.line([(121, SPLIT_Y + 44), (121, SPLIT_Y + 50)], fill=rgba((40, 40, 40), 200), width=2)
    im = im.filter(ImageFilter.GaussianBlur(0.35))
    return im


SPECS = {
    "cottage_cream": dict(wall=(228, 214, 188), roof=(168, 92, 58), roof_dark=(130, 68, 42), door=(92, 58, 38), texture="stucco", shutters=(108, 72, 48), flowers=True, chimney_x=48),
    "cottage_blue": dict(wall=(176, 204, 224), roof=(72, 98, 128), roof_dark=(52, 72, 98), door=(58, 78, 98), texture="stucco", shutters=(48, 72, 108), flowers=True, chimney_x=148),
    "suburban_red": dict(wall=(168, 88, 72), roof=(108, 112, 118), roof_dark=(78, 82, 88), door=(68, 48, 38), texture="brick", shutters=(58, 58, 68), chimney_x=52),
    "bungalow_green": dict(wall=(148, 172, 128), roof=(108, 82, 58), roof_dark=(82, 62, 44), door=(88, 62, 42), texture="siding", shutters=(88, 58, 42), flowers=True, chimney_x=138),
    "modern_white": dict(wall=(240, 242, 246), roof=(88, 92, 98), roof_dark=(68, 72, 78), door=(48, 52, 58), texture="stucco", roof_style="flat", shutters=None, chimney_x=150),
    "chalet_brown": dict(wall=(148, 118, 88), roof=(88, 68, 52), roof_dark=(62, 48, 38), door=(72, 52, 38), texture="wood", roof_style="shingle", shutters=(68, 48, 32), chimney_x=46),
    "villa_tan": dict(wall=(210, 188, 152), roof=(196, 128, 68), roof_dark=(158, 98, 48), door=(108, 72, 48), texture="stucco", shutters=(128, 88, 58), flowers=True, chimney_x=144),
    "slate_gray": dict(wall=(168, 174, 182), roof=(98, 108, 118), roof_dark=(72, 80, 90), door=(58, 62, 68), texture="siding", roof_style="shingle", shutters=(78, 84, 92), chimney_x=50),
}


def main():
    os.makedirs(ROOT, exist_ok=True)
    meta = {
        "width": W,
        "height": H,
        "splitY": SPLIT_Y,
        "anchorX": ANCHOR_X,
        "anchorY": ANCHOR_Y,
        "windows": [{"u": 0.16, "v": 0.58}, {"u": 0.78, "v": 0.58}],
        "kinds": {},
    }
    for name, spec in SPECS.items():
        im = build_house(name, **spec)
        fname = f"{name}.png"
        path = os.path.join(ROOT, fname)
        im.save(path)
        meta["kinds"][name] = {
            "file": fname,
            "width": W,
            "height": H,
            "splitY": SPLIT_Y,
            "anchorX": ANCHOR_X,
            "anchorY": ANCHOR_Y,
            "hd": True,
            "wall": list(spec["wall"]),
            "roof": list(spec["roof"]),
            "windows": meta["windows"],
        }
        print("wrote", fname)
    with open(os.path.join(ROOT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("done", len(meta["kinds"]), "house kinds")


if __name__ == "__main__":
    main()
