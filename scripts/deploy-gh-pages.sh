#!/usr/bin/env bash
# Full deploy of cursor/topdown-city → gh-pages branch root
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GAME="$ROOT/cursor/topdown-city"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -a "$GAME/." "$STAGE/"
find "$STAGE" -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
echo "{\"build\":\"$(date -u +%Y%m%d%H%M)\",\"people\":9,\"gta2\":true,\"sprites\":\"lazy\",\"assets\":\"2026062315\"}" > "$STAGE/version.json"
touch "$STAGE/.nojekyll"

cd "$ROOT"
git fetch origin gh-pages || true
git checkout -B gh-pages-deploy origin/gh-pages 2>/dev/null || git checkout --orphan gh-pages-deploy

find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -a "$STAGE/." .

git add -A
git diff --staged --quiet && { echo "No changes"; git checkout main; exit 0; }
git commit -m "Deploy $(cat version.json)"
git push origin HEAD:gh-pages --force
git checkout main
git branch -D gh-pages-deploy 2>/dev/null || true
echo "Deployed to gh-pages"
