# TOPDOWN CITY — gra online

## Adres gry (jedyny)

**https://pgodlewskigiho.github.io/topdown/cursor/topdown-city/**

Po wejściu dodaj `?v=2026062703` jeśli widzisz 404 lub stare pliki:  
**https://pgodlewskigiho.github.io/topdown/cursor/topdown-city/?v=2026062703**

Krótki link z roota repo (`/topdown/`) przekierowuje automatycznie do gry.

## GitHub Pages — konfiguracja (jednorazowo)

Użyj **tylko jednej** metody (nie obu naraz):

### Obecnie: branch main (root)

1. https://github.com/PGodlewskiGiho/topdown/settings/pages
2. **Source:** `Deploy from a branch` → branch `main`, folder `/ (root)`
3. Gra: `https://pgodlewskigiho.github.io/topdown/cursor/topdown-city/`
4. Assety: `.../cursor/topdown-city/assets/people/gta2/...`

### Alternatywa: GitHub Actions

1. Pages → **Source:** `GitHub Actions`
2. Workflow wdraża folder `cursor/topdown-city` do roota Pages
3. Gra: `https://pgodlewskigiho.github.io/topdown/`
4. Assety: `https://pgodlewskigiho.github.io/topdown/assets/...`

**Nie mieszaj** Actions + „Deploy from branch” — wtedy są 404 i stare pliki.

## Lokalnie

```bash
cd cursor/topdown-city
python3 -m http.server 8080
```

→ http://localhost:8080

## Struktura w repo

```
cursor/topdown-city/     ← gra (index.html, js/, assets/)
  assets/people/gta2/    ← sprite'y pieszych (PNG)
  js/lib/people-sprites.js
.github/workflows/deploy-pages.yml
```

## Problemy

| Objaw | Rozwiązanie |
|--------|-------------|
| 404 na `assets/people/gta2/...` | Wejdź przez **cursor/topdown-city/** (nie samo `/topdown/`) |
| Stare sprite'y / brak obrotu | Ctrl+Shift+R lub `?v=2026062703` |
| URL `/topdown/` bez gry | Root przekierowuje do `cursor/topdown-city/` |
