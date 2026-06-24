# Jak uruchomić grę online (GitHub Pages)

## Dlaczego 404?

404 = repo jest publiczne, ale **Pages nie ma jeszcze włączonego źródła**.
Sam kod na gałęzi `gh-pages` nie wystarczy — trzeba **jednorazowo** wybrać gałąź w ustawieniach.

## Włączenie (telefon lub komputer)

1. Otwórz: **https://github.com/PGodlewskiGiho/topdown/settings/pages**

2. W sekcji **Build and deployment** → **Source** wybierz:
   - **Deploy from a branch** ← ważne, NIE „GitHub Actions”

3. Ustaw:
   - **Branch:** `gh-pages`
   - **Folder:** `/ (root)`
   - Kliknij **Save**

4. Odśwież stronę Settings → Pages — po ~1–2 min powinno być:
   > *Your site is live at https://pgodlewskigiho.github.io/topdown/*

5. Otwórz grę (Ctrl+F5 / wyczyść cache):
   **https://pgodlewskigiho.github.io/topdown/**

## Co już jest gotowe

- Gałąź **`gh-pages`** — pełna gra + niedźwiedzie + plik `.nojekyll`
- Nie trzeba nic budować ani płacić

## Jeśli nadal 404

- Poczekaj 2–5 minut po Save
- Sprawdź, czy repo jest **Public** (Settings → General → Visibility)
- Upewnij się, że wybrałeś gałąź **`gh-pages`**, nie `main`
- Sprawdź dokładny URL z zielonego komunikatu na stronie Pages

## Lokalnie (bez GitHub)

```bash
cd cursor/topdown-city
python3 -m http.server 8080
```

→ http://localhost:8080
