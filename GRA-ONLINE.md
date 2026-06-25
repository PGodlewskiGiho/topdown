# TOPDOWN CITY — gra online

## Adres gry (jedyny)

**https://pgodlewskigiho.github.io/topdown/**

Po wejściu zrób twarde odświeżenie (`Ctrl+Shift+R`) jeśli widzisz 404 lub stare pliki.

## GitHub Pages — konfiguracja (jednorazowo)

Użyj **tylko jednej** metody (nie obu naraz):

### Zalecane: GitHub Actions

1. https://github.com/PGodlewskiGiho/topdown/settings/pages
2. **Source:** `GitHub Actions`
3. Workflow `Deploy TOPDOWN CITY to GitHub Pages` wdraża folder `cursor/topdown-city` do roota Pages
4. Gra: `https://pgodlewskigiho.github.io/topdown/`
5. Assety: `https://pgodlewskigiho.github.io/topdown/assets/...` (ścieżki względne)

### Alternatywa: branch main (root)

Jeśli nie używasz Actions — branch `main`, folder `/` — wejdź przez:  
`https://pgodlewskigiho.github.io/topdown/cursor/topdown-city/`

**Nie mieszaj** Actions + „Deploy from branch” — wtedy są 404 i stare pliki.

## Lokalnie

```bash
cd cursor/topdown-city
npm run dev
```

→ http://localhost:8080

## Walidacja przed deployem

```bash
cd cursor/topdown-city
npm run check
```

Smoke-check sprawdza referencje HTML i listę skryptów JS ładowanych przez `index.html`.

## Struktura w repo

```
cursor/topdown-city/     ← gra (index.html, js/, assets/)
  assets/people/gta2/    ← sprite’y pieszych (PNG)
  js/lib/people-sprites.js
  scripts/smoke-check.mjs
.github/workflows/deploy-pages.yml
```

## Problemy

| Objaw | Rozwiązanie |
|--------|-------------|
| 404 na `assets/people/gta2/...` | Pages → **GitHub Actions**, nie branch root |
| Stare pliki w cache | Ctrl+Shift+R (twarde odświeżenie) |
| URL z `/cursor/topdown-city/` przy Actions | Użyj **https://pgodlewskigiho.github.io/topdown/** |
