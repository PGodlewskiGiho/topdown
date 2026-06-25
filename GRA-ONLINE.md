# TOPDOWN CITY — gra online (GitHub Pages)

## Adres gry

**https://pgodlewskigiho.github.io/topdown/**

(Przekierowanie do `cursor/topdown-city/` — gra i assety są w tym folderze w repo.)

Po wdrożeniu odśwież stronę twardo (Ctrl+F5).

## Jak włączyć Pages (jednorazowo)

1. **https://github.com/PGodlewskiGiho/topdown/settings/pages**
2. **Source:** `Deploy from a branch`
3. **Branch:** `main` → folder **`/ (root)`** → Save

Alternatywnie: **GitHub Actions** + workflow `deploy-pages.yml` (wtedy gra jest w root Pages bez `cursor/` w URL).

## Lokalnie

```bash
cd cursor/topdown-city
python3 -m http.server 8080
```

→ http://localhost:8080

## Jeśli 404 lub stare pliki

- Upewnij się, że Pages wskazuje gałąź **`main`**, folder **`/` (root)** — w root jest `index.html` z przekierowaniem.
- Wyczyść cache (Ctrl+F5) lub dodaj `?v=2026062612` do URL.
