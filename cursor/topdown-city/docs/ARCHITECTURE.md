# TOPDOWN CITY — architektura

Gra ładuje skrypty sekwencyjnie (`index.html`, bez ESM). Wspólny scope = globalne zmienne i funkcje.

## Warstwy bootstrapu

| Plik | Rola |
|------|------|
| `00-core.js` | Canvas, RNG, utils (`clamp`, `rand`, …) |
| `00-game.js` | **Rejestr systemów** — hooki update / draw / onLot |
| `00-palettes.js` | Wspólne palety kolorów (postać, NPC, ruch) |
| `01-world.js` | Proceduralna mapa, `getLot()`, drogi |
| `20-main.js` | Pętla `frame()` — rdzeń gry + `Game.update()` |

## Wzorzec plug-in: `Game.register()`

Nowy system = nowy plik JS + rejestracja na końcu pliku. **Nie trzeba** edytować `20-main.js` ani `06-render-draw.js`.

```javascript
Game.register({
  id: "my-feature",       // unikalny identyfikator
  order: 40,              // kolejność w obrębie tego samego hooka (niższe = wcześniej)
  init() { /* opcjonalnie, raz przy ładowaniu */ },

  // update — wywoływane z Game.update(dt, paused)
  update(dt, paused) { /* logika co klatkę */ },
  updateAlways: false,    // true = działa też przy pauzie mapy (np. odkrywanie terenu)

  // generowanie lotu — wywoływane z getLot() przez Game.onLot()
  onLot(lot, i, j) { /* dekoracja komórki */ },

  // warstwy rysowania świata (06-render-draw.js)
  drawAfterRoads(ox, oy) { /* tory, mosty nad drogami */ },
  drawActors(ox, oy) { /* bytności — patrz actorLayer */ },
  actorLayer: "beforeTraffic", // lub "afterTraffic" (domyślnie beforeTraffic)
  drawWorldOverlay(ox, oy) { /* GPS, efekty na wierzchu świata */ },

  // minimapa / duża mapa (11-minimap.js, 35-map.js)
  drawMap(mctx, opts) { /* opts: tx, ty, i0, i1, j0, j1, scale, fog, showPlayer, routeWidth */ },
});
```

### Hooki w pętli gry

```
frame()
  ├─ rdzeń (ruch, policja, combat, …)     — tylko gdy !mapPause
  ├─ Game.update(dt, mapPause)            — systemy plug-in
  └─ draw()
       ├─ … drogi …
       ├─ Game.drawAfterRoads()
       ├─ … budynki, piesi …
       ├─ Game.drawActors("beforeTraffic")
       ├─ … pojazdy …
       ├─ Game.drawActors("afterTraffic")
       └─ Game.drawWorldOverlay()
```

## Zarejestrowane systemy (przykłady)

| id | Plik | Hooki |
|----|------|-------|
| `wildlife` | `22-wildlife.js` | update, drawActors (beforeTraffic) |
| `map` | `35-map.js` | update (always), drawWorldOverlay, drawMap |
| `railways` | `36-railways.js` | onLot, update, drawAfterRoads, drawActors (afterTraffic), drawMap |
| `drift` | `37-drift.js` | update, drawAfterRoads — scoring, strefy, run (klawisz V) |
| `race-events` | `40-race-events.js` | update, drawMap — imprezy i wyścigi |
| `pause-menu` | `42-pause-menu.js` | update — panele pauzy |

## Dodawanie nowego modułu — checklist

1. Utwórz `js/NN-nazwa.js` (numer = kolejność ładowania / czytelność).
2. Dodaj `<script>` w `index.html` **po** zależnościach (np. po `01-world.js` jeśli używasz `getLot`).
3. Na końcu pliku: `Game.register({ … })`.
4. Jeśli moduł rysuje na mapie — dodaj `drawMap`.
5. Zaktualizuj `docs/MODULES.md` (tabela zadań → pliki).

## Duże pliki (kandydaci do dalszego splitu)

- `01-world.js` — generacja miasta, biomy, budynki
- `08-render-assets.js` — pojazdy, budynki, tekstury
- `22-wildlife.js` — wszystkie gatunki zwierząt

Na razie pozostają monolityczne; rejestr `Game` pozwala dodawać **nowe** systemy bez dotykania rdzenia.

## Uruchomienie

```bash
cd cursor/topdown-city && npm run dev
# lub: python3 -m http.server 8080
```

Wymaga serwera HTTP (nie `file://`).
