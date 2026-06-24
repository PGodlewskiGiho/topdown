# TOPDOWN CITY — mapa modułów

Jeden plik = jeden system. Przed zmianą **czytaj tylko wskazany moduł** (+ ewentualnie sąsiada).

Szczegóły architektury plug-in: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Struktura (35 plików JS)

```
topdown-city/
  index.html            — shell HTML + kolejność <script>
  package.json          — npm run dev (serwer HTTP)
  styles/main.css       — HUD, menu, mapa, ekwipunek
  js/
    00-core.js          — canvas, zoom, RNG, clamp, rand
    00-game.js          — rejestr systemów Game.register()
    00-palettes.js      — palety SKIN/SHIRT/HAIR (postać, NPC, ruch)
    01-world.js         — mapa proceduralna, biomy, drogi, budynki, getLot()
    02-player.js        — car/ped, fizyka, input, wnętrza
    03-traffic.js       — ruch uliczny, NPC piesi, sygnalizacja
    04-collisions.js    — kolizje współdzielone
    05-movement.js      — updateCar(), updatePed(), updateCam()
    06-render-draw.js   — draw() — główna pętla rysowania + Game.draw*()
    07-boats.js         — łodzie, wake
    08-render-assets.js — drawVehicle, drawBuilding, tekstury (największy plik)
    09-gauge.js         — tachometr SVG
    10-time.js          — dzień/noc, cienie
    11-minimap.js       — minimapa GTA-style, baner dzielnicy
    12-weather.js       — deszcz, burza, kałuże
    13-police.js        — heat, gwiazdki, policja
    14-missions.js      — misje, kasa, pickup
    15-combat.js        — broń, pociski, wybuchy, damage aut
    16-shop.js          — salon samochodowy
    17-effects.js       — krew
    18-audio.js         — Web Audio (silnik, syreny)
    19-save.js          — localStorage
    20-main.js          — pętla frame(), rdzeń update + Game.update()
    21-menu.js          — menu startowe, tworzenie postaci
    22-wildlife.js      — zwierzęta leśne (Game: wildlife)
    24-terrain.js       — wysokości, relief
    25-rivers.js        — rzeki leśne
    26-trails.js        — leśne ścieżki
    27-forest-bridges.js— mostki leśne
    28-character.js     — generator postaci (menu)
    29-inventory.js     — ekwipunek
    30-npc-look.js      — wygląd NPC pieszych
    31-interior.js      — wnętrza budynków / supermarket
    35-map.js           — mapa, fog, GPS (Game: map)
    36-railways.js      — kolej, pociągi (Game: railways)
```

## Zadanie → pliki (czytaj tylko te)

| Zadanie | Pliki |
|---------|--------|
| Przyspieszenie / hamowanie / drift auta | `02-player.js`, `05-movement.js` |
| Nowy model auta | `01-world.js` (CARS), `08-render-assets.js`, `16-shop.js` |
| Ruch uliczny / AI | `03-traffic.js` |
| Policja / poszukiwania | `13-police.js` |
| Broń / strzał | `15-combat.js`, `02-player.js` |
| Misje | `14-missions.js` |
| Pogoda | `12-weather.js`, `10-time.js` |
| Generowanie miasta | `01-world.js` |
| Rendering budynków | `08-render-assets.js` |
| HUD / UI DOM | `styles/main.css`, `09-gauge.js`, `11-minimap.js` |
| Mapa / nawigacja GPS | `35-map.js`, `11-minimap.js` |
| Kolej / pociągi | `36-railways.js` |
| Zwierzęta leśne | `22-wildlife.js` |
| Wnętrza / sklepy | `31-interior.js` |
| Dźwięk | `18-audio.js` |
| Zapis gry | `19-save.js` |
| **Nowy system (szkielet)** | nowy plik + `Game.register()` — patrz `ARCHITECTURE.md` |

## Globalny stan (wspólny scope)

Kluczowe zmienne tworzone przy ładowaniu skryptów:

- `cv`, `ctx`, `PX`, `ZOOM`, `VW`, `VH` — rendering
- `car`, `ped`, `mode` — gracz
- `cam`, `focusX`, `focusY` — kamera
- `heat`, `stars`, `cops` — policja
- `mission`, `money` — progres
- `Game` — rejestr systemów plug-in
- `rng`, `rand`, `clamp` — utils

Nowe pliki ładuj **po** zależnościach (patrz `index.html`).

## Uruchomienie

```bash
cd topdown-city && npm run dev
# http://localhost:8080
```

Wymaga serwera HTTP (nie `file://`).
