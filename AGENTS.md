# Instrukcja dla agentów AI (TOPDOWN CITY)

**Przeczytaj przed każdą zmianą w repo.** Te reguły zapobiegają zepsuciu deployu i pętli odświeżania.

## Gdzie jest gra

| Ścieżka | Rola |
|---------|------|
| `cursor/topdown-city/` | **Jedyny** katalog z grą (`index.html`, `js/`, `styles/`, `assets/`) |
| `.github/workflows/deploy-pages.yml` | Deploy na GitHub Pages (artifact = `cursor/topdown-city`) |

## Czego NIGDY nie robić

1. **Nie twórz `index.html` w rootcie repo** (`/index.html`). Root nie jest stroną gry. Redirecty stamtąd psują live URL i powodują pętle.
2. **Nie dodawaj `?v=`** do URL skryptów, CSS ani assetów (ani w HTML, ani w JS).
3. **Nie dodawaj skryptów redirect** (`location.replace`, `location.assign`, `location.href = …`) w żadnym `index.html`.
4. **Nie zapisuj `tdc_build` w localStorage** ani nie wymuszaj przeładowania strony dla cache-bustingu.
5. **Nie kopiuj gry do roota** ani do `docs/` — duplikacja plików się rozjedzie.
6. **Nie zmieniaj** `path:` w `deploy-pages.yml` na coś innego niż `cursor/topdown-city` bez wyraźnej prośby użytkownika.

## Co robić przed commitem

```bash
cd cursor/topdown-city
npm run check
```

`npm run check` musi przejść. Commituj i pushuj na **`main`**.

## Deploy (GitHub Pages)

- **Źródło Pages:** `GitHub Actions` (nie „Deploy from branch” z folderem `/`).
- Workflow: `Deploy TOPDOWN CITY to GitHub Pages`.
- **URL gry:** https://pgodlewskigiho.github.io/topdown/
- Assety: ścieżki względne od roota Pages, np. `assets/people/gta2/...`

Szczegóły: [GRA-ONLINE.md](GRA-ONLINE.md).

## Typowe błędy agentów

| Błąd | Skutek | Poprawka |
|------|--------|----------|
| Root `index.html` z redirectem | `/topdown/` nie ładuje gry lub pętla | Usuń root `index.html` |
| `?v=` w tagach `<script>` | Nieskończone przeładowania u części userów | Usuń wszystkie `?v=` |
| Edycja plików poza `cursor/topdown-city/` | Gra się nie aktualizuje na Pages | Edytuj tylko katalog gry |
| Branch deploy + Actions naraz | 404, stare pliki, zły `index.html` | Tylko GitHub Actions |

## Nowe pliki JS

Każdy nowy plik w `cursor/topdown-city/js/` musi być dodany jako `<script src="…">` w `cursor/topdown-city/index.html`. Smoke-check to weryfikuje.
