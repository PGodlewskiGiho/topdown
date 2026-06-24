# TOPDOWN CITY — gra online (GitHub Pages)

## Adres gry

**https://pgodlewskigiho.github.io/topdown/**

Po wdrożeniu odśwież stronę twardo (Ctrl+F5), żeby wczytać nowe pliki JS.

## Jak włączyć Pages (jednorazowo)

1. Otwórz: **https://github.com/PGodlewskiGiho/topdown/settings/pages**

2. W **Build and deployment** → **Source** wybierz jedną z opcji:

### Opcja A — GitHub Actions (zalecane)

- **Source:** `GitHub Actions`
- Każdy push do gałęzi **`main`** automatycznie wdraża grę (workflow `.github/workflows/deploy-pages.yml`).
- Po pierwszym pushu na `main` wejdź w **Actions** → ostatni workflow **Deploy TOPDOWN CITY** → poczekaj na zielony status.

### Opcja B — gałąź gh-pages

- **Source:** `Deploy from a branch`
- **Branch:** `gh-pages` → folder **`/ (root)`** → **Save**

Obie opcje serwują tę samą grę z katalogu `cursor/topdown-city`.

## Lokalnie (bez GitHub)

```bash
cd cursor/topdown-city
python3 -m http.server 8080
```

→ http://localhost:8080

## Jeśli widzisz 404

- Poczekaj 2–5 minut po pierwszym wdrożeniu
- Sprawdź, czy repozytorium jest **Public**
- Upewnij się, że źródło Pages wskazuje **GitHub Actions** albo gałąź **`gh-pages`**
- Wyczyść cache przeglądarki (Ctrl+F5)
