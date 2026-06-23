# TOPDOWN CITY — mapa modułów

Jeden plik = jeden system. Przed zmianą **czytaj tylko wskazany moduł** (+ ewentualnie sąsiada).

## Struktura

```
topdown-city/
  index.html          — shell HTML + kolejność <script>
  styles/main.css     — HUD, boot screen
  js/
    00-core.js        — canvas, zoom, RNG, clamp, rand
    01-world.js       — mapa proceduralna, biomy, drogi, budynki, getLot()
    02-player.js      — car/ped state, fizyka (ENGINE…), input, wnętrza
    03-traffic.js     — ruch uliczny, NPC piesi, sygnalizacja
    04-collisions.js  — kolizje współdzielone
    05-movement.js    — updateCar(), updatePed(), updateCam()
    06-render-draw.js — draw() — główna pętla rysowania świata
    07-boats.js       — łodzie, wake
    08-render-assets.js — drawVehicle, drawBuilding, tekstury (największy plik)
    09-gauge.js       — tachometr SVG
    10-time.js        — dzień/noc, cienie
    11-minimap.js     — minimapa, baner dzielnicy
    12-weather.js     — deszcz, burza, kałuże
    13-police.js      — heat, gwiazdki, policja
    14-missions.js    — misje, kasa, pickup
    15-combat.js      — broń, pociski, wybuchy, damage aut
    16-shop.js        — salon samochodowy
    17-effects.js     — krew
    18-audio.js       — Web Audio (silnik, syreny)
    19-save.js        — localStorage
    20-main.js        — pętla frame(), kolejność update
```

## Zadanie → pliki (czytaj tylko te)

| Zadanie | Pliki |
|---------|--------|
| Przyspieszenie / hamowanie / drift auta | `02-player.js` (ENGINE, VK, car.power), `05-movement.js` (updateCar) |
| Nowy model auta | `01-world.js` (CARS), `08-render-assets.js` (drawVehicle), `16-shop.js` |
| Ruch uliczny / AI | `03-traffic.js` |
| Policja / poszukiwania | `13-police.js` |
| Broń / strzelanie | `15-combat.js`, `02-player.js` (input) |
| Misje | `14-missions.js` |
| Pogoda | `12-weather.js`, `10-time.js` |
| Generowanie miasta | `01-world.js` |
| Rendering budynków | `08-render-assets.js` |
| HUD / UI DOM | `styles/main.css`, `09-gauge.js`, `11-minimap.js` |
| Dźwięk | `18-audio.js` |
| Zapis gry | `19-save.js` |
| Nowy system (szkielet) | `20-main.js` (podłączenie w frame) |

## Globalny stan (bez modułów ES — wspólny scope)

Kluczowe zmienne tworzone przy ładowaniu skryptów:

- `cv`, `ctx`, `PX`, `ZOOM`, `VW`, `VH` — rendering
- `car`, `ped`, `mode` — gracz
- `cam`, `focusX`, `focusY` — kamera
- `heat`, `stars`, `cops` — policja
- `mission`, `money` — progres
- `rng`, `rand`, `clamp` — utils

Nowe pliki ładuj **po** zależnościach (patrz `index.html`).

## Uruchomienie

```bash
cd topdown-city && python3 -m http.server 8080
# http://localhost:8080
```

Wymaga serwera HTTP (nie `file://`) — skrypty ładowane sekwencyjnie.

## Regeneracja z monolitu

```bash
python3 scripts/split-topdown.py
```

Potem ręcznie przywróć `clamp`/`randInt` w `00-core.js` jeśli skrypt nadpisze.
