---
name: turniej-trzech-saun
description: Kompletny poradnik systemu sędziowskiego Turnieju Trzech Saun (Sommer Residence, Kuniów k. Kluczborka) — aplikacja w folderze turniej-trzech-saun/ tego repozytorium (Preact + htm bez budowania, GitHub Pages) z bazą Supabase. Używaj przy KAŻDEJ zmianie w systemie (wygląd, karty oceny, punktacja, głosy publiczności, PDF/Excel, feedback), przy wdrażaniu poprawek, przy awarii w trakcie turnieju (logowanie sędziów, brak internetu, kody supervisora, kopie zapasowe, przywracanie) oraz przy rozpoczęciu pracy na nowym komputerze.
---

# System sędziowski Turnieju Trzech Saun

Elektroniczne karty sędziów, wyniki na żywo, porównania, historia zmian i głosy publiczności
dla wewnętrznego turnieju Sommer Residence. Turnieje eliminacyjne: **Sommer HOT / Relax / Banya Cup**
(najlepsza piątka przechodzi dalej) oraz **Finał** — 3 dni (pt Relax, sb HOT, nd Banya), ci sami
zawodnicy, każdy sędzia ma osobną kartę na każdą konkurencję. Wynik finału = suma trzech konkurencji.

| Co | Gdzie |
|---|---|
| Aplikacja (produkcja, prawdziwa baza) | https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/ |
| Wersja demo (dane przykładowe w przeglądarce, PIN supervisora `2026`) | https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/demo/ |
| Kod źródłowy | repo `aufgussworld/aufguss-world`, gałąź `main`, folder `turniej-trzech-saun/` |
| Baza danych | Supabase, projekt `turniej-trzech-saun`, ref `wripvwhwginexvcmwdsq` (org. aufguss.world, Frankfurt, plan Free) — https://supabase.com/dashboard/project/wripvwhwginexvcmwdsq |
| Schemat bazy (pełny, idempotentny) | [supabase/setup.sql](supabase/setup.sql) |

Każdy push na `main` publikuje się automatycznie (GitHub Pages) w ok. 1 minutę.

## Zasady nienaruszalne

1. **Produkcja to żywy turniej.** Push na `main` zmienia aplikację wszystkim sędziom naraz. W trakcie
   oceniania wdrażaj tylko poprawki krytyczne, zawsze po teście w wersji demo i po `check.js` (niżej).
   Zmiany kosmetyczne — przed turniejem albo po nim.
2. **Nie zmieniaj kształtu danych** (pola turnieju, wpis karty `v / n / ni / fb`, nazwy tabel i funkcji
   w bazie) bez przemyślanej migracji. Przeglądarki sędziów trzymają kolejkę niewysłanych ocen
   i kopię stanu w starym formacie.
3. **Punkty zawsze jako liczby całkowite w dziesiątych częściach** (1,3 pkt = `13`). Formatowanie tylko
   funkcjami z `model.js` (`fmt`, `fmtAvg`).
4. **Kodów i haseł nie wpisuje Claude.** Kod supervisora nadaje człowiek w Supabase → SQL Editor
   (przycisk **Run** — „Save” tylko zapisuje tekst zapytania!). Claude może przygotować zapytanie
   z miejscem `'WPISZ-KOD'`. Nie odczytuj zapisanych zapytań użytkownika, w których mogą być kody.
5. **Nigdy nie używaj klucza `service_role` / secret.** W `config.js` jest tylko klucz publishable
   (może być jawny — dane chroni RLS). Repozytorium jest PUBLICZNE: żadnych sekretów w commitach.
6. **Nie kasuj danych w bazie bez kopii** (panel „Kod dostępu i kopie” → kopia ręczna, albo
   `select public.tts_backup('manual');` w SQL Editorze).
7. Styl: interfejs po polsku, nazwy plików po angielsku, ikony wyłącznie SVG z `ui.js` (zero emoji),
   kolory z tokenów CSS (`--brand: #8d2732`, HOT pomarańczowy, Relax niebieski, Banya zielony).
   Biblioteki z CDN z przypiętą wersją.

## Praca na nowym komputerze (np. laptop w hotelu)

Pełna instrukcja krok po kroku: [reference/nowy-komputer.md](reference/nowy-komputer.md). W skrócie:

```bash
gh auth login                                   # konto GitHub: aufgussworld (loguje się użytkownik)
gh repo clone aufgussworld/aufguss-world C:/Users/$USERNAME/Code/aufguss-world
cd C:/Users/$USERNAME/Code/aufguss-world && git pull
node .claude/skills/turniej-trzech-saun/scripts/serve.js   # podgląd: http://localhost:8123/turniej-trzech-saun/demo/
```

W aplikacji Claude Code (desktop) otwórz folder `aufguss-world` — ten skill wczyta się sam,
a podgląd uruchamia konfiguracja `tts` z `.claude/launch.json`. Bez laptopa: claude.ai/code
z podłączonym repo `aufgussworld/aufguss-world` (opis w tym samym pliku).

## Jak wprowadzić zmianę (zawsze w tej kolejności)

1. `git pull` — kod mógł się zmienić na innym komputerze.
2. Znajdź właściwy moduł: mapa plików w [reference/architektura.md](reference/architektura.md).
   Przeczytaj go przed edycją; pisz w stylu otoczenia (komentarze po polsku, szablony `html\`` z htm,
   bez kroku budowania, bez nowych zależności).
3. Przetestuj w wersji demo lokalnie (`/turniej-trzech-saun/demo/`, PIN `2026`; kody sędziów
   są w panelu supervisora → „Sędziowie i kody”). Sprawdź konsolę przeglądarki — zero błędów.
   Supervisor i sędzia mogą działać obok siebie w dwóch kartach (demo synchronizuje karty).
   Zmian w `remote.js` / bazie nie da się sprawdzić w demo — patrz [reference/baza-danych.md](reference/baza-danych.md).
4. Kontrola przed wdrożeniem (składnia + zgodność importów z eksportami):
   ```bash
   node .claude/skills/turniej-trzech-saun/scripts/check.js
   ```
5. Wdrożenie:
   ```bash
   git add turniej-trzech-saun && git commit -m "Turniej Trzech Saun: <co i dlaczego>" && git push
   gh api repos/aufgussworld/aufguss-world/pages/builds/latest --jq '.status + " " + .commit[0:7]'
   ```
   Powtarzaj drugie polecenie, aż pokaże `built <twój commit>` (zwykle < 1 min). Potwierdź na żywo, np.
   `curl -s https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/js/model.js | grep -c <nowa-nazwa>`.
6. **Odświeżenie u wszystkich:** GitHub Pages pozwala przeglądarkom trzymać pliki do 10 minut
   (`Cache-Control: max-age=600`), a moduły nie mają numerów wersji. Po wdrożeniu poproś sędziów
   i supervisora o **Ctrl+F5** (twarde odświeżenie). Logowanie i niewysłane oceny przetrwają
   odświeżenie tej samej karty. Bez tego przeglądarka może połączyć stary plik z nowym — przy nowych
   eksportach skończy się to białym ekranem do czasu twardego odświeżenia.
7. Coś poszło źle → natychmiastowy powrót: `git revert --no-edit HEAD && git push` (potem Ctrl+F5 u wszystkich).

## Szybkie przepisy

| Chcę zmienić… | Gdzie |
|---|---|
| Pozycje karty oceny w **istniejącym** turnieju | w aplikacji: supervisor → turniej → „Karta oceny” (bez kodu!) |
| Domyślne karty dla **nowych** turniejów | `js/templates.js` (karty z „Kryteriów oceniania” Sommer Cup) |
| Zawodników, godziny startu, sędziów, kody | w aplikacji: „Zawodnicy i starty”, „Sędziowie i kody” |
| Liczbę liczonych sędziów, liczbę głosujących, separator dziesiętny, status turnieju | w aplikacji: „Ustawienia” |
| Zasady punktacji, ranking, ex aequo, głosy publiczności | `js/model.js` (+ eksporty w `pdf.js`, `backup.js`) |
| Wygląd, kolory, odstępy | `css/app.css` (tokeny na górze pliku) |
| Teksty w panelu supervisora / sędziego | `js/supervisor.js` / `js/judge.js` |
| Wydruki PDF (karta, wyniki, feedback, ranking publiczności) | `js/pdf.js` |
| Generator feedbacku (szablony zdań) | `js/feedback.js` |
| Dane przykładowe demo | `js/seed.js` — po zmianie podbij `SEED_VERSION` |
| Funkcję lub uprawnienia w bazie | `supabase/setup.sql` w tym skillu → użytkownik uruchamia zmieniony fragment w SQL Editorze → commit |

## Awaria w trakcie turnieju

Procedury (logowanie sędziów, brak internetu, wylogowania, kod supervisora, przywracanie kopii,
uśpiony projekt Supabase, biały ekran po wdrożeniu): [reference/awarie.md](reference/awarie.md).
Najpierw zawsze: co dokładnie widzi użytkownik (treść komunikatu) i na ilu urządzeniach.

## Pliki tego skilla

- [reference/nowy-komputer.md](reference/nowy-komputer.md) — przygotowanie laptopa, claude.ai/code, edycja awaryjna przez github.com
- [reference/architektura.md](reference/architektura.md) — mapa plików, model danych, zasady punktacji, synchronizacja, trasy
- [reference/baza-danych.md](reference/baza-danych.md) — tabele, RLS, funkcje RPC, kody, kopie, przydatne zapytania SQL
- [reference/awarie.md](reference/awarie.md) — objaw → przyczyna → co zrobić
- [supabase/setup.sql](supabase/setup.sql) — pełny schemat bazy (źródło prawdy dla bazy)
- [scripts/check.js](scripts/check.js) — kontrola przed wdrożeniem
- [scripts/serve.js](scripts/serve.js) — lokalny podgląd na porcie 8123
