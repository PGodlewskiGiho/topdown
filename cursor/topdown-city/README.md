# TOPDOWN CITY

Gra top-down (GTA2-style) w przeglądarce — wersja modularna.

## Uruchomienie

```bash
cd topdown-city
python3 -m http.server 8080
```

Otwórz http://localhost:8080

## Dokumentacja

- [docs/MODULES.md](docs/MODULES.md) — który plik edytować przy danym zadaniu
- [docs/ROADMAP.md](docs/ROADMAP.md) — plan rozwoju

## Struktura

21 plików JS ładowanych sekwencyjnie z `index.html`. Wspólny global scope (bez bundlera).

Oryginalny monolit: `../topdown.html` (archiwum / źródło do splitu).
