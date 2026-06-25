# TOPDOWN CITY

Gra top-down (GTA2-style) w przeglądarce — wersja modularna.

## Uruchomienie

```bash
cd cursor/topdown-city
npm run dev
```

Otwórz http://localhost:8080

## Walidacja

```bash
npm run check
```

Smoke-check sprawdza, czy `index.html` ładuje istniejące pliki, czy każdy plik `js/**/*.js` jest podpięty oraz czy cache-busting `v=` zgadza się z `version.json`.

## Dokumentacja

- [docs/MODULES.md](docs/MODULES.md) — który plik edytować przy danym zadaniu
- [docs/ROADMAP.md](docs/ROADMAP.md) — plan rozwoju

## Struktura

55 plików JS ładowanych sekwencyjnie z `index.html`. Wspólny global scope (bez bundlera).

Najważniejsze katalogi:

- `js/` — moduły gry i małe biblioteki bez bundlera
- `styles/` — style HUD, menu, mapy i ekwipunku
- `assets/` — metadane i wygenerowane assety
- `scripts/` — generatory assetów i smoke-check
