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
.github/workflows/ci.yml            smoke-check na każdym pushu
AGENTS.md                           reguły dla agentów AI (czytaj przed edycją)
RETROSPECTIVE.md                    wnioski z projektu — checklisty na przyszłość
cursor/topdown-city/                gra: HTML, CSS, JS, assety
cursor/topdown-city/docs/           mapa modułów i architektura
cursor/topdown-city/scripts/        generatory assetów i smoke-check
GRA-ONLINE.md                       instrukcja publikacji dla GitHub Pages
```

## Deploy

1. W ustawieniach repo: **Pages → Source: GitHub Actions** (nie „Deploy from branch”).
2. Workflow `Deploy TOPDOWN CITY to GitHub Pages` publikuje `cursor/topdown-city` jako root strony.
3. Gra: https://pgodlewskigiho.github.io/topdown/

**Nie twórz `index.html` w rootcie repo** — psuje to live URL. Szczegóły: [AGENTS.md](AGENTS.md).
