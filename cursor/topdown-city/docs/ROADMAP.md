# TOPDOWN CITY — plan rozwoju

## Faza 0 — modularizacja ✅

- [x] Podział `topdown.html` → `topdown-city/`
- [x] Mapa modułów (`docs/MODULES.md`)
- [x] Skill + reguły Cursor dla tanich zadań
- [x] Prosty dev workflow (`npm run dev`)
- [x] Smoke-check (`npm run check`)

## Faza 1 — stabilizacja (następna)

1. **clamp/utils w core** — przenieść pozostałe helpery używane przed definicją
2. **Manualna checklista smoke** — start, jazda, strzał, misja, zapis
3. **Symlink / redirect** — `topdown.html` → wskazuje na modular build (opcjonalnie)

## Faza 2 — fizyka pojazdów

- Krzywa przyspieszenia zależna od biegu / power
- Turbo / nitro (SHIFT w aucie?)
- Różnice między sedan / moto / bike (VK rozszerzyć)
- Uszkodzenia wpływające na maxSpeed

**Pliki:** `02-player.js`, `05-movement.js`, `15-combat.js`

## Faza 3 — świat i content

- Więcej typów budynków / enterable interiors
- Nowe biomy (las, przemysł)
- Więcej misji (escort, race checkpoint)
- Dynamiczne ceny w salonie

**Pliki:** `01-world.js`, `14-missions.js`, `16-shop.js`

## Faza 4 — polish

- Touch controls (mobile)
- Lepsze menu pauzy / ustawienia
- i18n EN/PL toggle
- Performance: spatial hash dla traffic w viewport

## Faza 5 — opcjonalna architektura

Tylko gdy projekt urośnie:

- ES modules + bundler (Vite) — tree-shaking
- `GameState` namespace zamiast globali
- Unit testy dla RNG / road graph / physics

Na razie **nie** migruj do ES modules — utrzymuj kolejność `<script>` dla prostoty.
