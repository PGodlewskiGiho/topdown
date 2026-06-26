# Retrospektywa projektu — TOPDOWN CITY

Dokument do wykorzystania przy kolejnych projektach (gry, narzędzia, projekty z agentami AI).
Stan repo: ~58 plików JS, ~21k linii, 64+ zmergowanych PR, deploy na GitHub Pages.

---

## 1. Kontekst

| Aspekt | Jak było w tym projekcie |
|--------|--------------------------|
| Stack | Canvas 2D, vanilla JS (bez bundlera), Python do assetów |
| Deploy | GitHub Actions → Pages, gra w `cursor/topdown-city/` |
| Dev model | Cursor Cloud Agent + auto-merge do `main` |
| Assety | PNG generowane w CI, metadata w git |
| Testy | Smoke-check strukturalny (`npm run check`), brak testów behawioralnych |

---

## 2. Co zadziałało — powtarzaj

### 2.1 Wczesny podział monolitu

- Jeden plik HTML → katalog z numerowanymi modułami (`01-world.js`, `15-combat.js`…)
- `docs/MODULES.md` — mapa „zadanie → plik”
- **Lekcja:** nawet bez ESM/bundlera podziel monolit i opisz gdzie co leży. To tańsze niż refactor później.

### 2.2 Jeden punkt rozszerzeń (`Game.register()`)

- Nowe systemy (wildlife, drift, railways…) rejestrują hooki: `update`, `drawActors`, `drawMap`
- Nie trzeba edytować pętli głównej dla każdej nowej funkcji świata
- **Lekcja:** w projekcie „rosnącym organicznie” wprowadź **registry / hooki** jak najwcześniej.

### 2.3 Dokumentacja porażek, nie tylko instrukcji

- `AGENTS.md` — tabela: błąd → skutek → poprawka (root `index.html`, `?v=`, redirecty)
- `.cursor/rules/` — polityka auto-merge, deploy
- **Lekcja:** pisz „czego nigdy nie rób i dlaczego”. To zwraca się wielokrotnie przy pracy z AI i nowymi contributorami.

### 2.4 Smoke-check pod realne awarie

- `npm run check`: brak `?v=`, spójność `<script>` z plikami, brak root `index.html`
- Łapie błędy deployu, nie logikę gry
- **Lekcja:** pierwszy test = **inwarianty deployu**. Tanie, wysoki ROI.

### 2.5 Pipeline assetów oddzielony od runtime

- Python: `gen_gta2`, `anim_studio.py`, `generate-bears.py`
- JS: `people-sprites.js`, `living-sprite.js` — tylko ładowanie i odtwarzanie
- **Lekcja:** runtime nie powinien wiedzieć, *jak* powstały klatki — tylko *jak je czytać*.

### 2.6 Static deploy bez bundlera (świadomie)

- Zero npm dependencies w runtime, `python3 -m http.server` do devu
- **Lekcja:** bundler wchodzi, gdy bolą: load order, typy, tree-shaking, testy modułowe — nie „na zapas”.

---

## 3. Co poszło źle — unikaj

### 3.1 Structural CI ≠ jakość produktu

- CI mówi „pliki istną”, nie „gra działa”
- Ostatnie ~15 PR (#70–#81): wielokrotne poprawki punch, boot prefetch, 503
- **Lekcja:** dodaj choćby manualną checklistę w PR albo 1 test E2E (Playwright).

### 3.2 Global scope bez limitu skali

- 58 plików w jednym scope, jedyny graf zależności = kolejność `<script>` w `index.html`
- **Lekcja:** po ~30–40 plikach JS albo registry + konwencje, albo ESM + bundler.

### 3.3 Monolity w „modularnym” projekcie

| Plik | ~Linii | Problem |
|------|--------|---------|
| `08-render-assets.js` | 2268 | Pojazdy, budynki, tekstury w jednym pliku |
| `01-world.js` | 2246 | Generacja miasta, biomy, katalog aut |
| `22-wildlife.js` | 1589 | Wszystkie gatunki w jednym pliku |

- **Lekcja:** limit **400–600 linii na plik**. Podział na pliki ≠ modularizacja.

### 3.4 End-to-end bez myślenia (case: animacja punch)

Warstwy tego samego buga:

1. **Content** — GTA2 ma 4 klatki, gra chce 8 → syntetyczne klatki
2. **Runtime** — aim zmieniał kierunek co klatkę → skok między folderami
3. **Boot** — prefetch `blue/jeans`, gracz ma inne kolory z kreatora
4. **Infra** — 28 równoległych requestów → 503 na GitHub Pages
5. **Gate** — loading kończył się przy proxy (sample outfit), nie outfit gracza

- **Lekcja:** przy feature z assetami + loading zadaj 3 pytania:
  - Czy prefetch ładuje **ten sam klucz** co runtime?
  - Czy gate czeka na **100% tego klucza**?
  - Czy hosting wytrzyma **burst requestów**? (max 4–6 równolegle + retry)

### 3.5 Auto-merge bez smoke QA

- Szybka dostawa (64 PR), ale też reverty (seam weld, filtry GTA2) i iteracje UI (Onimusha → Metin → kulka)
- **Lekcja:** auto-merge OK dla docs/refactor. Dla UI/animacji/deploy — minimum krótki smoke przed merge.

### 3.6 Assety: zero PNG w git + CI-only

- Plus: lekkie repo. Minus: świeży clone bez `gen:*` = brak sprite’ów, zależność od zewnętrznego `bil.sty`, 503 przy agresywnym prefetch
- **Lekcja:** wcześnie wybierz: **assets in repo** vs **assets at build time**. Hybryda wymaga doskonałego README.

### 3.7 Hybrydowa architektura rozszerzeń

- `Game.register()` dla wildlife, drift… ale traffic/combat/police hardcoded w `20-main.js`
- **Lekcja:** jeden wzorzec rozszerzeń — albo dwa świadome, udokumentowane.

---

## 4. Checklist — start nowego projektu

Skopiuj i wypełnij przed pierwszym commitem feature’owym.

### Decyzje architektoniczne

- [ ] Bundler na start? (Nie, dopóki <40 plików JS i brak testów modułowych)
- [ ] Assety: w repo / CI / CDN?
- [ ] Extension point (registry) — nazwa, hooki, dokumentacja
- [ ] Limit linii na plik: _____ (rekomendacja: 500)
- [ ] Język commitów / kodu / UI — jeden czy mix?

### CI / jakość

- [ ] Smoke strukturalny (pliki, deploy path, antywzorce)
- [ ] Checklist manualna w PR template (min. 5 kroków)
- [ ] 1 test E2E lub nagranie smoke (opcjonalnie na start, obowiązkowo przed „v1”)

### Praca z agentami AI

- [ ] `AGENTS.md` — antywzorce + gdzie jest kod
- [ ] Reguła: kiedy auto-merge, kiedy czekać na człowieka
- [ ] Nowy plik JS → aktualizacja loadera (tu: `index.html` + smoke-check)

### Deploy

- [ ] Jeden katalog źródłowy (tu: `cursor/topdown-city/`)
- [ ] Brak cache-bustingu przez `?v=` / redirect / localStorage reload
- [ ] `version.json` lub inny sposób invalidacji cache — udokumentowany

---

## 5. Definition of Done (szablon)

Dla każdej większej feature’y wypełnij przed merge:

```markdown
## Feature: _______________

### Funkcjonalnie
- [ ] Działa w happy path (opisz: _______________)
- [ ] Edge case: _______________
- [ ] Nie psuje: _______________

### Assety / loading (jeśli dotyczy)
- [ ] Prefetch ładuje ten sam outfit/klucz co runtime
- [ ] Loading gate czeka na właściwy zestaw (nie proxy)
- [ ] Brak 503 / failed loads w konsoli (Network tab)
- [ ] Hard refresh (Ctrl+Shift+R) — OK

### Kod
- [ ] Plik < 600 linii lub uzasadniony split
- [ ] `npm run check` przechodzi
- [ ] MODULES.md / ARCHITECTURE.md zaktualizowane (jeśli nowy moduł)

### Smoke (min. 2 min)
- [ ] Start gry → menu → wejście do świata
- [ ] _______________ (specyficzne dla feature)
```

### Przykład z tego projektu — animacja punch

- [ ] 8 klatek punch w każdym z 8 kierunków
- [ ] Postać nie przesuwa się podczas ciosu (freeze movement)
- [ ] Kierunek twarzy zablokowany na czas ataku
- [ ] Zero pop-in po ekranie loading
- [ ] Brak 503 w konsoli przy boot

---

## 6. Checklist smoke przed merge (uniwersalna)

Minimum przed merge do `main` (gry akcji / open world):

1. **Boot** — loading kończy się, gra wchodzi do menu
2. **Core loop** — ruch pieszo + jedna akcja (np. atak / interakcja)
3. **Pojazd** — wsiadanie, jazda, wysiadanie (jeśli dotyczy)
4. **Regresja** — jedna rzecz, która już kiedyś się psuła (tu: punch w 4 kierunkach)
5. **Konsola** — brak czerwonych errorów, brak masowych 503

Czas: ~2–5 minut. Taniej niż 10 PR-ów „Fix X again”.

---

## 7. Antywzorce — katalog

| Antywzorzec | Skutek w tym projekcie | Co robić następnym razem |
|-------------|------------------------|---------------------------|
| Prefetch innego klucza niż runtime | Animacje doczytują się w grze | Ten sam mapper outfitu w boot i w draw |
| 92% loaded = OK | Loading kończy się za wcześnie | Gate na 100% krytycznego zestawu |
| 28 równoległych fetchy PNG | 503 GitHub Pages | Max 4–6 + retry z backoff |
| Auto-merge bez smoke | Regresje UI/animacji | Smoke checklist w PR |
| Monolit 2000+ linii | Agent/człowiek edytuje na ślepo | Split + limit 500 linii |
| Tylko structural CI | 15 PR na ten sam bug | 1 test E2E lub checklist |
| Revert zamiast flagi | Stracona praca, chaos w historii | Feature flag / config toggle |
| Dokumentacja tylko „jak uruchomić” | Powtarzające się błędy deployu | AGENTS.md z tabelą porażek |

---

## 8. Metryki referencyjne (ten projekt)

| Metryka | Wartość |
|---------|---------|
| Pliki JS | 58 |
| Linie JS (bez lib) | ~21 000 |
| Zmergowane PR | 64+ |
| Branchy lokalne `cursor/*` | ~49 (do sprzątania) |
| Testy automatyczne | 0 (tylko smoke-check) |
| Największy plik | `08-render-assets.js` (~2268 linii) |
| Systemy `Game.register()` | ~18 |
| PNG w git | 0 (generowane w CI) |

---

## 9. Roadmap lessons — co było na liście, a nie doszło

Z `docs/ROADMAP.md`:

| Zaplanowane | Status | Wniosek |
|-------------|--------|---------|
| Manualna checklista smoke (Faza 1) | ❌ Nie zrobione | Gdyby było — mniej PR punch |
| Split dużych plików | ❌ Nadal monolity | Ustaw limit i egzekwuj |
| ES modules + Vite (Faza 5) | ⏸ Odłożone | OK na ten scale, ale limit się zbliża |
| Unit testy RNG/physics | ⏸ Odłożone | Rozsądne odłożenie, ale E2E wcześniej |

---

## 10. Szablon PR (skopiuj do `.github/pull_request_template.md`)

```markdown
## Co zmienia
<!-- 1–3 zdania -->

## Definition of Done
- [ ] `npm run check` przechodzi
- [ ] Smoke (2 min): start → _______________
- [ ] Brak nowych errorów/503 w konsoli
- [ ] Dokumentacja zaktualizowana (jeśli nowy moduł/antywzorzec)

## Ryzyko regresji
<!-- np. animacje, deploy, save format -->

## Screenshots / nagranie
<!-- opcjonalnie, obowiązkowe przy UI -->
```

---

## 11. Jedno zdanie na koniec

**Projekt wygrał na architekturze rozszerzeń i dokumentacji porażek; przegrał na braku definition of done i testów tego, co user widzi.**

Następny projekt: ten sam stack może zostać — dodaj **checklistę w PR**, **limit 500 linii/plik** i **jeden test lub 2-min smoke** przed merge.

---

## Powiązane pliki w repo

| Plik | Zawartość |
|------|-----------|
| [AGENTS.md](AGENTS.md) | Antywzorce deployu dla agentów |
| [cursor/topdown-city/docs/ARCHITECTURE.md](cursor/topdown-city/docs/ARCHITECTURE.md) | `Game.register()`, hooki |
| [cursor/topdown-city/docs/MODULES.md](cursor/topdown-city/docs/MODULES.md) | Mapa zadań → pliki |
| [cursor/topdown-city/docs/ROADMAP.md](cursor/topdown-city/docs/ROADMAP.md) | Plan faz rozwoju |
| [GRA-ONLINE.md](GRA-ONLINE.md) | GitHub Pages, troubleshooting |

---

*Ostatnia aktualizacja: 2026-06-26 — na podstawie pełnej analizy repo (historia git, CI, kod, 64+ PR).*
