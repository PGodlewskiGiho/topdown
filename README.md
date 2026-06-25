# TOPDOWN CITY

Statyczna gra top-down uruchamiana z GitHub Pages. Kod gry mieszka w `cursor/topdown-city`.

## Szybki start

```bash
cd cursor/topdown-city
npm run dev
```

Otwórz http://localhost:8080.

## Sprawdzenie repo

```bash
cd cursor/topdown-city
npm run check
```

Smoke-check waliduje lokalne referencje HTML i listę skryptów ładowanych przez `index.html` (bez `?v=` w URL).

## Struktura

```text
.github/workflows/deploy-pages.yml  GitHub Pages deploy
cursor/topdown-city/                gra: HTML, CSS, JS, assety
cursor/topdown-city/docs/           mapa modułów i architektura
cursor/topdown-city/scripts/        generatory assetów i smoke-check
GRA-ONLINE.md                       instrukcja publikacji dla GitHub Pages
index.html                          redirect do opublikowanej gry
```

## Deploy

Workflow `Deploy TOPDOWN CITY to GitHub Pages` publikuje katalog `cursor/topdown-city` jako root strony.
