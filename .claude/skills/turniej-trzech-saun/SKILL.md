---
name: turniej-trzech-saun
description: Kompletny poradnik systemu sędziowskiego Turnieju Trzech Saun (Sommer Residence, Kuniów k. Kluczborka) — aplikacja w folderze turniej-trzech-saun/ tego repozytorium (Preact + htm bez budowania, GitHub Pages) z bazą Supabase. Używaj przy KAŻDEJ zmianie w systemie (wygląd, karty oceny, punktacja, głosy publiczności, PDF/Excel, feedback), przy wdrażaniu poprawek, przy awarii w trakcie turnieju (logowanie sędziów, brak internetu, kody supervisora, kopie zapasowe, przywracanie) oraz przy rozpoczęciu pracy na nowym komputerze. Po KAŻDEJ zmianie w systemie ten skill trzeba zaktualizować w tym samym commicie.
---

# System sędziowski Turnieju Trzech Saun

Elektroniczne karty sędziów, wyniki na żywo, porównania, historia zmian i głosy publiczności
dla wewnętrznego turnieju Sommer Residence. Turnieje eliminacyjne: **Sommer HOT / Relax / Banya Cup**
(najlepsza piątka przechodzi dalej) oraz **Finał** — 3 dni (pt Relax, sb HOT, nd Banya), ci sami
zawodnicy, każdy sędzia ma osobną kartę na każdą konkurencję. Wynik finału = suma trzech konkurencji.

| Co | Gdzie |
|---|---|
| Aplikacja (produkcja, prawdziwa baza) | https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/ |
| Instrukcja dla sędziów (przycisk „Instrukcja” w panelu sędziego) | https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/instrukcja/ |
| Wersja demo (dane przykładowe w przeglądarce, PIN supervisora `2026`) | https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/demo/ |
| Kod źródłowy | repo `aufgussworld/aufguss-world`, gałąź `main`, folder `turniej-trzech-saun/` |
| Baza danych | Supabase, projekt `turniej-trzech-saun`, ref `wripvwhwginexvcmwdsq` (org. aufguss.world, Frankfurt, plan Free) — https://supabase.com/dashboard/project/wripvwhwginexvcmwdsq |
| Schemat bazy (pełny, idempotentny) | [supabase/setup.sql](supabase/setup.sql) |

Każdy push na `main` publikuje się automatycznie (GitHub Pages) w ok. 1 minutę.

## Każda zmiana = aktualizacja tego skilla (obowiązkowo)

Ten skill jest JEDYNĄ dokumentacją systemu i musi zawsze opisywać stan na `main` — niezależnie od tego,
czy zmianę robi się na komputerze stacjonarnym, na laptopie, w claude.ai/code czy ręcznie na github.com.
Pamięć Claude nie przechodzi między komputerami; ten skill przechodzi (jest w repozytorium).

Przy KAŻDEJ zmianie w systemie, w tym samym commicie:

1. Popraw pliki skilla, których zmiana dotyczy:
   - nowy lub zmieniony moduł, trasa, komponent, pole danych, zasada punktacji → [reference/architektura.md](reference/architektura.md);
   - tabela, funkcja, uprawnienie, harmonogram w bazie → [supabase/setup.sql](supabase/setup.sql) i [reference/baza-danych.md](reference/baza-danych.md);
   - nowa funkcja w panelu, nowy komunikat albo procedura dla supervisora / sędziów → [reference/awarie.md](reference/awarie.md)
     (i „Szybkie przepisy” niżej);
   - zmiana sposobu pracy, wdrażania lub narzędzi → ten plik i [reference/nowy-komputer.md](reference/nowy-komputer.md);
   - zmiana WIDOCZNA DLA SĘDZIEGO → także instrukcja dla sędziów `turniej-trzech-saun/instrukcja/` (tekst, a przy zmianie
     wyglądu — zrzuty); procedura w [reference/instrukcja-sedziow.md](reference/instrukcja-sedziow.md).
2. Dopisz zmianę do „Dziennika zmian” na końcu tego pliku (data, co, dlaczego).
3. Commituj razem: `git add turniej-trzech-saun .claude` — kod i dokumentacja nigdy osobno.

Zmiana, której nie ma w skillu, jest niedokończona.

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
6. **Nie kasuj danych w bazie bez kopii** (panel „Kopie i przywracanie” → „Zrób kopię teraz”, albo
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
5. **Aktualizacja skilla** — sekcja „Każda zmiana = aktualizacja tego skilla” wyżej (pliki reference + dziennik zmian).
6. Wdrożenie (kod i skill w jednym commicie):
   ```bash
   git add turniej-trzech-saun .claude && git commit -m "Turniej Trzech Saun: <co i dlaczego>" && git push
   gh api repos/aufgussworld/aufguss-world/pages/builds/latest --jq '.status + " " + .commit[0:7]'
   ```
   Powtarzaj drugie polecenie, aż pokaże `built <twój commit>` (zwykle < 1 min). Potwierdź na żywo, np.
   `curl -s https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/js/model.js | grep -c <nowa-nazwa>`.
7. **Odświeżenie u wszystkich:** GitHub Pages pozwala przeglądarkom trzymać pliki do 10 minut
   (`Cache-Control: max-age=600`), a moduły nie mają numerów wersji. Po wdrożeniu poproś sędziów
   i supervisora o **Ctrl+F5** (twarde odświeżenie). Logowanie i niewysłane oceny przetrwają
   odświeżenie tej samej karty. Bez tego przeglądarka może połączyć stary plik z nowym — przy nowych
   eksportach skończy się to białym ekranem do czasu twardego odświeżenia.
8. Coś poszło źle → natychmiastowy powrót: `git revert --no-edit HEAD && git push` (potem Ctrl+F5 u wszystkich).

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
| Wydruki PDF (karta, wyniki, zbiorczy feedback zawodnika, ranking publiczności) | `js/pdf.js` |
| Generator feedbacku (szablony zdań), okno szkic / zatwierdź / usuń | `js/feedback.js` |
| Wysłać zawodnikom feedback po turnieju | w aplikacji: supervisor → „Feedback zawodników” → „Pobierz wszystkie — ZIP” (albo PDF przy zawodniku) → pliki do maili |
| Dane przykładowe demo | `js/seed.js` — po zmianie podbij `SEED_VERSION` |
| Funkcję lub uprawnienia w bazie | `supabase/setup.sql` w tym skillu → użytkownik uruchamia zmieniony fragment w SQL Editorze → commit |
| Przywrócić dane z wybranej godziny | w aplikacji: supervisor → „Kopie i przywracanie” → „Podgląd” → strzałki między godzinami → „Przywróć ten stan…” → kod supervisora |
| Instrukcję dla sędziów (tekst, zrzuty ekranu) | `turniej-trzech-saun/instrukcja/index.html` + `img/` — [reference/instrukcja-sedziow.md](reference/instrukcja-sedziow.md) |
| Kolejność wierszy w wynikach / głosach publiczności | przełącznik „Kolejność startowa / Ranking” w `ResultsTab` i `AudienceTab` (`js/supervisor.js`) |

## Awaria w trakcie turnieju

Procedury (logowanie sędziów, brak internetu, wylogowania, kod supervisora, przywracanie kopii,
uśpiony projekt Supabase, biały ekran po wdrożeniu): [reference/awarie.md](reference/awarie.md).
Najpierw zawsze: co dokładnie widzi użytkownik (treść komunikatu) i na ilu urządzeniach.

## Pliki tego skilla

- [reference/nowy-komputer.md](reference/nowy-komputer.md) — przygotowanie laptopa, claude.ai/code, edycja awaryjna przez github.com
- [reference/architektura.md](reference/architektura.md) — mapa plików, model danych, zasady punktacji, synchronizacja, trasy
- [reference/baza-danych.md](reference/baza-danych.md) — tabele, RLS, funkcje RPC, kody, kopie, przydatne zapytania SQL
- [reference/awarie.md](reference/awarie.md) — objaw → przyczyna → co zrobić
- [reference/instrukcja-sedziow.md](reference/instrukcja-sedziow.md) — instrukcja dla sędziów: kiedy aktualizować, jak robić zrzuty ekranu
- [supabase/setup.sql](supabase/setup.sql) — pełny schemat bazy (źródło prawdy dla bazy)
- [scripts/check.js](scripts/check.js) — kontrola przed wdrożeniem
- [scripts/serve.js](scripts/serve.js) — lokalny podgląd na porcie 8123
- [scripts/receive-files.js](scripts/receive-files.js), [scripts/build-font-css.js](scripts/build-font-css.js) — narzędzia do zrzutów ekranu instrukcji

## Dziennik zmian

Najnowsze na górze. Każdy wpis: data — co — dlaczego.

- **2026-10-15** — Feedback zbiorczy: sędzia tylko zapisuje szkic, zatwierdza albo usuwa feedback (bez PDF); supervisor w nowej
  zakładce „Feedback zawodników” pobiera dla każdego zawodnika jeden PDF z zatwierdzonymi opiniami wszystkich sędziów (każda na
  osobnej stronie; w finale ze wszystkich trzech dni) albo wszystkie pliki naraz w ZIP. Pole `fb.approved` / `fb.approvedAt`
  (bez zmian w bazie — `fb` to jsonb). Dane demo z przykładowym feedbackiem (SEED_VERSION 3). Instrukcja dla sędziów: rozdział 8
  przepisany, nowe zrzuty okna feedbacku. Powód: zawodnik ma dostać po turnieju jeden plik z opiniami wszystkich sędziów.

- **2026-10-15** — Instrukcja obsługi dla sędziów (`turniej-trzech-saun/instrukcja/`, 14 rozdziałów, zrzuty z demo,
  wersja do druku); przycisk „Instrukcja” w górnym pasku sędziego i odnośnik pod logowaniem sędziego; ikona `book`.
  Pasek sędziego nie łamie się przy ~1280 px (napisy w jednej linii, przy ≤ 1440 px chowa się napis obok logo).
  Okno feedbacku nie twierdzi już, że w produkcji szkic pisze model AI (pisze go wbudowany generator).
  Zasada: zmiana widoczna dla sędziego = aktualizacja instrukcji. Powód: prośba organizatora.

- **2026-10-15** — Favicon: sygnet z logo Sommer Residence (biały na bordowym, 16/32 px + ikona 180 px na telefon)
  zamiast trzech kolorowych słupków. Powód: spójność z marką organizatora.

- **2026-10-15** — Wyniki na żywo: przełącznik „Kolejność startowa” (domyślnie, z kolumną „Nr”) / „Ranking”;
  w klasyfikacji łącznej finału kolejność z pierwszego dnia (Relax). Kopie: podgląd stanu z wybranej godziny
  obok obecnych wyników (strzałki między kopiami, zaznaczone różnice), kolumna „Zmiana” liczby kart na liście kopii,
  przywracanie z bazy i z pliku wymaga kodu supervisora (demo: PIN). Strona „Kopie zapasowe i kod dostępu”
  z przywracaniem na górze. Poprawka: zmiana turnieju w adresie nie przenosi już ustawień widoku poprzedniego
  turnieju (`key` na `TournamentView`). Powód: prośba organizatora przed turniejem w Kuniowie.
- **2026-10-15** — Zasada „każda zmiana = aktualizacja skilla” i dziennik zmian w tym pliku.
- **2026-10-15** — Głosy publiczności: wynik = średnia bez skrajnych × 10 (regulamin; głosów bywa mniej niż 12);
  widok kolejność występów / ranking, podium, eksport CSV/PDF.
- **2026-10-15** — Poradnik serwisowy jako skill w repozytorium (praca z innego komputera).
- **2026-10-15** — Przekazanie dostępu kolejnemu supervisorowi (`tts_handover_code`).
- **2026-10-15** — Wersja produkcyjna na Supabase: logowanie kodami, RLS, kolejka offline, kopie co godzinę,
  eksport kart sędziów do PDF/Excel; baza oddana pusta, kod supervisora ustawiony przez supervisora.
