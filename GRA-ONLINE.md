# TOPDOWN CITY — gra online (GitHub Pages)

## Adres gry

**https://pgodlewskigiho.github.io/topdown/**

Po wdrożeniu odśwież stronę twardo (Ctrl+F5), żeby wczytać nowe pliki JS.

## Jak włączyć Pages (jednorazowo)

1. Otwórz: **https://github.com/PGodlewskiGiho/topdown/settings/pages**
2. W **Build and deployment** → **Source** wybierz **GitHub Actions**
3. Każdy push do gałęzi **`main`** wdraża grę (workflow `.github/workflows/deploy-pages.yml`)
4. Po pierwszym pushu wejdź w **Actions** → **Deploy TOPDOWN CITY to GitHub Pages** → poczekaj na zielony status

Gra jest w katalogu `cursor/topdown-city` w repozytorium — workflow publikuje ten folder na Pages.

## Lokalnie (bez GitHub)

```bash
cd cursor/topdown-city
python3 -m http.server 8080
```

→ http://localhost:8080

## Jeśli widzisz 404 lub starą wersję

- Poczekaj 2–5 minut po pushu na `main`
- Sprawdź, czy repozytorium jest **Public**
- Upewnij się, że źródło Pages to **GitHub Actions** (nie gałąź `gh-pages`)
- Wyczyść cache przeglądarki (Ctrl+F5) lub otwórz z `?v=` w URL
