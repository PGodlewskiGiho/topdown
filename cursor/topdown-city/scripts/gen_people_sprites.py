#!/usr/bin/env python3
"""Generate modular top-down pedestrian PNG parts (GTA2 / pixel style)."""
from PIL import Image, ImageDraw
import json, os

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "people")
W, H = 48, 56
OUTLINE = (18, 16, 22, 255)
SKIN = (232, 184, 136, 255)
SKIN_D = (208, 158, 112, 255)


def canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def rect(d, xy, col, ol=True):
    x0, y0, x1, y1 = xy
    d.rectangle(xy, fill=col)
    if ol:
        d.rectangle((x0, y0, x1, y1), outline=OUTLINE)


def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "PNG")


def head_male():
    im = canvas(); d = ImageDraw.Draw(im)
    rect(d, (30, 18, 40, 28), SKIN)
    d.rectangle((36, 22, 37, 23), fill=(20, 16, 18, 255))
    d.rectangle((36, 25, 37, 26), fill=(20, 16, 18, 255))
    return im


def head_female():
    im = canvas(); d = ImageDraw.Draw(im)
    rect(d, (30, 19, 39, 27), SKIN)
    d.rectangle((35, 22, 36, 23), fill=(20, 16, 18, 255))
    d.rectangle((35, 25, 36, 26), fill=(20, 16, 18, 255))
    return im


def head_elder():
    im = canvas(); d = ImageDraw.Draw(im)
    rect(d, (29, 18, 40, 28), SKIN_D)
    d.rectangle((29, 18, 40, 20), fill=(180, 170, 160, 255), outline=OUTLINE)
    d.rectangle((35, 23, 36, 24), fill=(20, 16, 18, 255))
    return im


def hair_short(col):
    im = canvas(); d = ImageDraw.Draw(im)
    c = (*col, 255)
    d.rectangle((29, 16, 40, 20), fill=c, outline=OUTLINE)
    return im


def hair_long(col):
    im = canvas(); d = ImageDraw.Draw(im)
    c = (*col, 255)
    d.rectangle((29, 16, 40, 20), fill=c, outline=OUTLINE)
    d.rectangle((27, 20, 30, 30), fill=c, outline=OUTLINE)
    return im


def shirt(col, sleeves=True):
    im = canvas(); d = ImageDraw.Draw(im)
    c = (*col, 255)
    rect(d, (22, 26, 36, 38), c)
    if sleeves:
        rect(d, (18, 28, 22, 36), c)
        rect(d, (36, 28, 40, 36), (*[max(0, x - 30) for x in col], 255))
        d.rectangle((18, 34, 21, 37), fill=SKIN)
        d.rectangle((37, 34, 40, 37), fill=SKIN)
    return im


def pants_jeans():
    im = canvas(); d = ImageDraw.Draw(im)
    rect(d, (23, 36, 35, 46), (42, 58, 92, 255))
    rect(d, (23, 46, 28, 52), (42, 58, 92, 255))
    rect(d, (30, 46, 35, 52), (42, 58, 92, 255))
    return im


def pants_black():
    im = canvas(); d = ImageDraw.Draw(im)
    rect(d, (23, 36, 35, 46), (34, 36, 44, 255))
    rect(d, (23, 46, 28, 52), (34, 36, 44, 255))
    rect(d, (30, 46, 35, 52), (34, 36, 44, 255))
    return im


def pants_khaki():
    im = canvas(); d = ImageDraw.Draw(im)
    rect(d, (23, 36, 35, 46), (148, 132, 98, 255))
    rect(d, (23, 46, 28, 52), (148, 132, 98, 255))
    rect(d, (30, 46, 35, 52), (148, 132, 98, 255))
    return im


def pants_skirt(col):
    im = canvas(); d = ImageDraw.Draw(im)
    c = (*col, 255)
    d.polygon([(22, 36), (36, 36), (38, 48), (20, 48)], fill=c, outline=OUTLINE)
    rect(d, (25, 48, 28, 52), SKIN)
    rect(d, (31, 48, 34, 52), SKIN)
    return im


def shoes(col):
    im = canvas(); d = ImageDraw.Draw(im)
    c = (*col, 255)
    rect(d, (22, 51, 29, 54), c)
    rect(d, (30, 51, 37, 54), c)
    return im


def legs_walk(frame):
    im = canvas(); d = ImageDraw.Draw(im)
    if frame == 0:
        rect(d, (22, 44, 28, 52), (42, 58, 92, 255))
        rect(d, (30, 44, 36, 52), (42, 58, 92, 255))
    else:
        rect(d, (20, 42, 27, 50), (42, 58, 92, 255))
        rect(d, (32, 46, 38, 54), (42, 58, 92, 255))
    return im


def pose_down():
    im = canvas(); d = ImageDraw.Draw(im)
    rect(d, (8, 24, 38, 32), (60, 100, 160, 255))
    rect(d, (34, 22, 44, 28), SKIN)
    rect(d, (6, 30, 18, 34), (42, 58, 92, 255))
    rect(d, (24, 30, 36, 34), (42, 58, 92, 255))
  # outline body
    d.rectangle((8, 24, 38, 32), outline=OUTLINE)
    return im


def composite(*layers):
    im = canvas()
    for layer in layers:
        if layer:
            im = Image.alpha_composite(im, layer)
    return im


def preview_combo(head_fn, shirt_col, pants_fn, hair_col=None):
    layers = [pants_fn(), shirt(shirt_col), shoes((28, 26, 22))]
    if hair_col:
        layers.append(hair_short(hair_col))
    layers.append(head_fn())
    return composite(*layers)


HEADS = {
    "male": head_male,
    "female": head_female,
    "elder": head_elder,
}
SHIRTS = {
    "blue": (58, 110, 168),
    "red": (196, 58, 48),
    "green": (58, 128, 72),
    "white": (228, 228, 232),
    "yellow": (220, 180, 48),
}
PANTS = {
    "jeans": ("male", pants_jeans),
    "black": ("unisex", pants_black),
    "khaki": ("unisex", pants_khaki),
    "skirt_red": ("female", lambda: pants_skirt((168, 48, 72))),
    "skirt_navy": ("female", lambda: pants_skirt((48, 58, 108))),
}
SHOES = {"black": (28, 26, 22), "brown": (92, 62, 38), "white": (232, 232, 228)}
HAIR = {"brown": (58, 40, 24), "blonde": (210, 170, 72), "black": (28, 22, 18)}


def main():
    parts = ROOT + "/parts"
    for name, fn in HEADS.items():
        save(fn(), f"{parts}/heads/{name}.png")
    for name, col in SHIRTS.items():
        save(shirt(col), f"{parts}/shirts/{name}.png")
    for name, (_, fn) in PANTS.items():
        save(fn(), f"{parts}/pants/{name}.png")
    for name, col in SHOES.items():
        save(shoes(col), f"{parts}/shoes/{name}.png")
    for name, col in HAIR.items():
        save(hair_short(col), f"{parts}/hair/{name}.png")
        save(hair_long(col), f"{parts}/hair/{name}_long.png")
    save(legs_walk(0), f"{parts}/poses/legs_walk0.png")
    save(legs_walk(1), f"{parts}/poses/legs_walk1.png")
    save(pose_down(), f"{parts}/poses/down.png")

    previews = ROOT + "/previews"
    save(preview_combo(head_male, SHIRTS["blue"], pants_jeans, HAIR["brown"]), f"{previews}/male_jeans_blue.png")
    save(preview_combo(head_female, SHIRTS["red"], lambda: pants_skirt((168, 48, 72)), HAIR["blonde"]), f"{previews}/female_skirt_red.png")
    save(preview_combo(head_elder, SHIRTS["white"], pants_khaki), f"{previews}/elder_khaki.png")
    save(preview_combo(head_male, SHIRTS["green"], pants_black, HAIR["black"]), f"{previews}/male_black_green.png")

    meta = {
        "size": [W, H],
        "anchor": [24, 40],
        "heads": [{"id": k, "gender": "female" if k == "female" else "male", "file": f"heads/{k}.png"} for k in HEADS],
        "shirts": [{"id": k, "gender": "unisex", "file": f"shirts/{k}.png"} for k in SHIRTS],
        "pants": [{"id": k, "gender": g, "file": f"pants/{k}.png"} for k, (g, _) in PANTS.items()],
        "shoes": [{"id": k, "gender": "unisex", "file": f"shoes/{k}.png"} for k in SHOES],
        "hair": [{"id": k, "gender": "unisex", "file": f"hair/{k}.png"} for k in HAIR]
            + [{"id": f"{k}_long", "gender": "female", "file": f"hair/{k}_long.png"} for k in HAIR],
        "poses": {
            "walk": ["poses/legs_walk0.png", "poses/legs_walk1.png"],
            "down": "poses/down.png",
        },
        "rules": {
            "female_only_pants": ["skirt_red", "skirt_navy"],
            "male_only_pants": ["jeans"],
            "no_hair": ["elder"],
        },
    }
    os.makedirs(ROOT, exist_ok=True)
    with open(os.path.join(ROOT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("Generated people sprites in", ROOT)


if __name__ == "__main__":
    main()
