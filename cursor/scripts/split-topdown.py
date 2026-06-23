#!/usr/bin/env python3
"""Split monolithic topdown.html into modular project structure."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "topdown.html"
OUT = ROOT / "topdown-city"

# JS modules: (filename, start_line_inclusive, end_line_inclusive)
# Line numbers from original topdown.html (1-based, script body only)
JS_MODULES = [
    ("js/00-core.js", 106, 130),
    ("js/01-world.js", 131, 1170),
    ("js/02-player.js", 1171, 1541),
    ("js/03-traffic.js", 1542, 1880),
    ("js/04-collisions.js", 1881, 1939),
    ("js/05-movement.js", 1940, 2053),
    ("js/06-render-draw.js", 2054, 2176),
    ("js/07-boats.js", 2177, 2370),
    ("js/08-render-assets.js", 2371, 3594),
    ("js/09-gauge.js", 3595, 3676),
    ("js/10-time.js", 3677, 3951),
    ("js/11-minimap.js", 3952, 4025),
    ("js/12-weather.js", 4026, 4077),
    ("js/13-police.js", 4078, 4199),
    ("js/14-missions.js", 4200, 4281),
    ("js/15-combat.js", 4282, 4610),
    ("js/16-shop.js", 4611, 4711),
    ("js/17-effects.js", 4712, 4730),
    ("js/18-audio.js", 4731, 4809),
    ("js/19-save.js", 4810, 4853),
    ("js/20-main.js", 4854, 4882),
]

INDEX_SCRIPTS = [m[0] for m in JS_MODULES]


def extract_lines(text: str, start: int, end: int) -> str:
    lines = text.splitlines(keepends=True)
    chunk = lines[start - 1 : end]
    return "".join(chunk)


def main():
    html = SRC.read_text(encoding="utf-8")

    style_m = re.search(r"<style>(.*?)</style>", html, re.DOTALL)
    if not style_m:
        raise SystemExit("No <style> block found")
    css = style_m.group(1).strip() + "\n"

    body_m = re.search(r"<body>(.*?)</body>", html, re.DOTALL)
    if not body_m:
        raise SystemExit("No <body> block found")
    body = body_m.group(1)
    body = re.sub(r"\s*<script>.*?</script>\s*", "\n", body, count=1, flags=re.DOTALL)
    body = body.replace("chunk 83", "modular").strip()

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "styles").mkdir(exist_ok=True)
    (OUT / "js").mkdir(exist_ok=True)

    (OUT / "styles" / "main.css").write_text(css, encoding="utf-8")

    for rel, start, end in JS_MODULES:
        path = OUT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        content = extract_lines(html, start, end)
        header = f"/* TOPDOWN CITY — {path.name} */\n"
        if rel == "js/00-core.js":
            content = content.rstrip() + "\nconst clamp=(v,a,b)=>Math.max(a,Math.min(b,v));\nconst randInt=(a,b)=>a+Math.floor(rng()*(b-a+1));\n"
        if rel == "js/03-traffic.js":
            content = content.replace(
                "const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));\nconst randInt=(a,b)=>a+Math.floor(rng()*(b-a+1));\n",
                "",
            )
        path.write_text(header + content, encoding="utf-8")

    script_tags = "\n".join(f'  <script src="{s}"></script>' for s in INDEX_SCRIPTS)

    index = f"""<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>TOPDOWN CITY</title>
<link rel="stylesheet" href="styles/main.css">
</head>
<body>
{body.strip()}
{script_tags}
</body>
</html>
"""
    (OUT / "index.html").write_text(index, encoding="utf-8")
    print(f"Created {OUT} with {len(JS_MODULES)} JS modules")


if __name__ == "__main__":
    main()
