# Jak uruchomić grę online (GitHub Pages)

## Jednorazowe włączenie (2 minuty)

1. Otwórz: **https://github.com/PGodlewskiGiho/topdown/settings/pages**
2. W **Build and deployment** → **Source** wybierz: **Deploy from a branch**
3. **Branch:** `gh-pages` → folder **`/ (root)`** → **Save**
4. Poczekaj ~1–2 minuty (Status: „Your site is live at…”)

## Adres gry

**https://pgodlewskigiho.github.io/topdown/**

(Ctrl+F5 po pierwszym wdrożeniu)

## Alternatywa: GitHub Actions

W Settings → Pages możesz też wybrać **GitHub Actions** — wtedy każdy push do `main` wdraża grę automatycznie (workflow już jest w repo).

## Lokalnie (bez GitHub)

```bash
cd cursor/topdown-city
python3 -m http.server 8080
```

→ http://localhost:8080
