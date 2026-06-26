# TOPDOWN Anim Studio

Narzędzie do **tworzenia i ulepszania animacji 8-kierunkowych** — zarówno dla ludzi (warstwy GTA2), jak i zwierząt (poziomy strip PNG jak niedźwiedź).

## Szybki start (przeglądarka)

```bash
cd cursor/topdown-city
npm run dev:anim
# Otwórz http://localhost:8090/tools/anim-studio/
```

1. Wczytaj strip PNG (niedźwiedź) lub kliknij **Załaduj próbkę niedźwiedzia**
2. Ustaw rozmiar klatki / liczbę kierunków
3. **Ulepsz w przeglądarce** — generuje pośrednie klatki ataku (morph + wysunięcie)
4. Pobierz `*-enhanced.png` + `meta.json`

Dla ludzi (punch GTA2): po `npm run gen:gta2` kliknij **Podgląd punch (GTA2)** lub użyj CLI poniżej.

## CLI (batch / CI)

### Pięści 4 → 8 klatek (GTA2)

Wymaga wygenerowanych warstw z `bil.sty`:

```bash
npm run gen:gta2
npm run gen:punch
```

Skrypt `scripts/anim_studio.py`:
- bierze oryginalne `punch0–3` z GTA2
- generuje `punch4–7` (crossfade + wysunięcie ramion w kierunku ciosu)
- aktualizuje `assets/people/gta2/meta.json` (`count: 8`, `step_sec: 0.0525`)

### Niedźwiedź / wildlife (strip)

```bash
npm run gen:bears
python3 scripts/anim_studio.py enhance-strip assets/bears/bear-brown.png assets/bears/meta.json
```

Lub jednym poleceniem (wszystkie warianty):

```bash
npm run gen:bears:attack
```

### Analiza różnic klatek

```bash
python3 scripts/anim_studio.py analyze-punch male arms blue S
```

## Jak to działa

| Tryb | Format | Generator | Ulepszenie |
|------|--------|-----------|------------|
| Ludzie | `parts/bodies/.../punchN/DIR.png` | `gen:gta2` + `gen:punch` | morph + nudge ramion |
| Zwierzęta | poziomy strip `frame×dirs` | `generate-bears.py` | morph ataku z walk + claw pose |

Runtime:
- Ludzie: `living-sprite.js` + `people-sprites.js` (klipy z `meta.json`)
- Zwierzęta: `22-wildlife.js` → `wildAnimFrame()` z `attackFrames` / `attackStep`

## Uwagi

- Oryginalne GTA2 ma tylko **4** klatki punch w `bil.sty` — klatki 4–7 są **syntetyczne** (nie z gry).
- Niedźwiedź LPC ma 1 klatkę ataku na kierunek — studio generuje 4 klatki z przejściami.
- Nie da się „magicznie” zamienić niedźwiedzia w człowieka — to różne formaty assetów; studio używa **tego samego algorytmu ulepszania ruchu** dla obu.
