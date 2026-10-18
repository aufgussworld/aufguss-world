# Awarie i procedury w trakcie turnieju

Zasada: najpierw ustal DOKŁADNĄ treść komunikatu, na ilu urządzeniach występuje i od kiedy.
Dane ocen są bezpieczne w trzech miejscach: w bazie, w kolejce przeglądarki sędziego (gdy nie było sieci)
i w kopiach (baza co godzinę o :30 + pliki na komputerze supervisora). Nie czyść danych przeglądarki sędziom.

## Przed turniejem (dzień wcześniej i rano)

1. Otwórz panel Supabase — projekt nie może być uśpiony („Project paused” → „Restore project”).
2. Zaloguj się w aplikacji jako supervisor — wczytują się turnieje.
3. Turniej ma status „W trakcie” (Ustawienia), zawodnicy mają godziny startu, sędziowie mają kody
   (wydruk: „Sędziowie i kody” → „Drukuj kody”).
4. Na komputerze supervisora: „Kopie i przywracanie” → włączone automatyczne pobieranie kopii o :30.
5. Każdy laptop sędziego: zaloguj kodem, wpisz próbnie i usuń jedną ocenę (znacznik w pasku górnym: „Zapisano”).
6. Zapas: wydrukowane papierowe karty oceny na wypadek całkowitej awarii.
7. Sędziom: link do instrukcji (https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/instrukcja/) albo jej wydruk;
   w panelu sędziego jest też przycisk „Instrukcja”.

## Objaw → przyczyna → co zrobić

| Objaw (komunikat) | Przyczyna | Co zrobić |
|---|---|---|
| Sędzia: „Nie znaleziono sędziego z takim kodem” | literówka lub kod zmieniony | supervisor sprawdza kod w „Sędziowie i kody”; kod ma 6 znaków (bez O/0, I/1) |
| Sędzia: „Ten turniej nie został jeszcze otwarty przez supervisora” | status `Szkic` | supervisor: Ustawienia → status „W trakcie” |
| Sędzia: „Brak dostępu do turnieju” / nagłe wylogowanie | supervisor zmienił lub usunął kod tego sędziego, cofnął turniej do szkicu albo usunął sędziego | zalogować się ponownie (nowym) kodem **na tym samym laptopie i w tej samej przeglądarce** — niewysłane oceny z kolejki wyślą się same |
| „Zbyt wiele prób logowania z tej sieci” | limit anonimowych logowań (wspólne IP hotelu) | odczekać kilka minut; na stałe: Supabase → Authentication → Rate Limits → podnieść limit anonimowych logowań |
| „Logowanie urządzeń jest wyłączone w ustawieniach bazy” | wyłączone anonymous sign-ins | Supabase → Authentication → Sign In / Providers → Allow anonymous sign-ins → Save |
| Pasek górny: „Brak połączenia · N czeka” | brak internetu lub chwilowy problem z bazą | oceniać dalej — kolejka wyśle się sama (co 5 s); NIE zamykać karty przeglądarki do czasu „Zapisano” (po zamknięciu karty logowanie wymaga internetu; kolejka zostaje w przeglądarce) |
| Żółty pasek „Brak połączenia z bazą — pracujesz na kopii…” | przeładowanie strony bez internetu | jak wyżej; po powrocie sieci odświeżyć stronę |
| Supervisor: „Administrator nie nadał jeszcze kodu supervisora” | w bazie nie ma kodu (zapytanie zapisane „Save”, a nie uruchomione „Run”) | administrator w SQL Editorze: `select public.tts_admin_set_supervisor_code('…');` → **Run** |
| Supervisor zapomniał kodu | — | administrator resetuje kodem jak wyżej; supervisor loguje się nim i ustawia własny (wszystkie dane zostają) |
| Supervisor wylogowany z komunikatem o zmianie kodu | kod zmieniono na innym urządzeniu (albo reset przez administratora) | zalogować się aktualnym kodem |
| Wszyscy: „Brak połączenia z bazą danych” przy logowaniu, a internet działa | projekt Supabase uśpiony lub awaria Supabase | panel Supabase → Restore project; status: https://status.supabase.com; w razie dłuższej awarii — papierowe karty, potem wpisanie ocen |
| Biały ekran / „Ładowanie…” bez końca po wdrożeniu | przeglądarka połączyła stare i nowe pliki (cache do 10 min) albo błąd w kodzie | **Ctrl+F5**; jeśli nadal — konsola (F12) pokaże błąd; natychmiast `git revert --no-edit HEAD && git push`, potem Ctrl+F5 |
| Błędne lub skasowane dane (np. usunięty zawodnik z ocenami, „zniknęły” karty) | pomyłka w panelu albo błąd | procedura „Przywracanie danych z wybranej godziny” niżej |
| Sędzia wpisał ocenę złemu zawodnikowi | — | sędzia poprawia sam (karty są edytowalne, dopóki turniej nie jest „Zakończony”); każda zmiana jest w „Historii zmian” |
| Pozycja karna ma na karcie przyciski „Nie · 0 / Tak · 1” — sędzia nie wpisze np. 0,5, a „Tak” nie odejmuje punktów. Zgłoszenia: 2026-10-17 Banya „Zastosowanie mniej niż trzech przedmiotów do rozprowadzania ciepła”; 2026-10-18 „Użycie więcej niż 3 zapachów (/ kompozycji)” — Relax, HOT i Banya | w karcie TEGO turnieju pozycja ma rodzaj „Tak / Nie (0 albo max)”. „Więcej niż 3 zapachy” miało tak w szablonie `js/templates.js` do 2026-10-18 (szablon już poprawiony, ale dotyczy tylko NOWYCH turniejów) — więc najpewniej we WSZYSTKICH turniejach założonych wcześniej; „mniej niż trzech przedmiotów” w szablonie było karne (zmiana w edytorze karty albo kreatorze). **„Tak / Nie” liczy się jako punkty DODATNIE** — „Tak · 1” dodaje 1 pkt zamiast odjąć (różnica 2 pkt na karcie) i podnosi maksimum karty o 1 | bez zmiany kodu i bez ruszania ocen w bazie: przed zmianą „Kopie i przywracanie” → „Zrób kopię teraz”; supervisor → turniej → „Karta oceny” → (w finale przełącznik kart Relax / HOT / Banya) → w tym wierszu „Rodzaj punktów” = „Punkty karne (odejmowane)”, „Maks.” wg regulaminu → zapisuje się samo. Zmienia się tylko karta (ustawienia turnieju); wpisy ocen zostają nietknięte — sprawdzone na demo 2026-10-18: oceny identyczne przed i po, wynik każdego zawodnika niższy dokładnie o 2 pkt × liczba „Tak”. Wystawione „Tak” (1) stają się karą −1, „Nie” (0) zostaje 0; sędziowie widzą zwykłe pole z suwakiem/wpisem (u nich zmiana dochodzi w ≤ 60 s; można odświeżyć F5) i mogą poprawić wartość. Sprawdzić z sędziami karty z „Tak”, czy oznaczało naruszenie. Powtórzyć w KAŻDYM turnieju i każdej karcie, która ma tę pozycję. |
| Pięciu sędziów zamiast czterech | — | supervisor: wyniki → zawodnik → odznaczyć „Liczy się” przy wybranej karcie |
| Wyniki trzeba zamrozić | koniec konkurencji | Ustawienia → status „Zakończony” (karty tylko do odczytu); można cofnąć na „W trakcie” |

## Przywracanie danych z wybranej godziny

1. Supervisor: menu boczne turnieju → **„Kopie i przywracanie”** (albo na liście turniejów „Kopie zapasowe i kod dostępu”).
2. Na liście kopii kolumna **„Zmiana”** pokazuje, ile kart przybyło lub ubyło od poprzedniej kopii — ujemna
   liczba (na czerwono) to pierwszy trop, kiedy coś się popsuło.
3. **„Podgląd”** przy wybranej kopii → wybierz turniej i konkurencję. Podgląd pokazuje wynik w kopii, wynik teraz
   i różnicę (wiersze z różnicą są zaznaczone) oraz liczby kart, zmian w historii i głosów.
   Strzałkami **„Wcześniejsza / Późniejsza”** przechodzisz godzina po godzinie i szukasz ostatniego dobrego stanu.
4. **„Przywróć ten stan…”** → wpisz **kod supervisora** (ten sam co przy logowaniu) → „Przywróć ten stan”.
   - Najpierw zapisze się kopia bieżącego stanu („sprzed przywrócenia”) — przywrócenie można cofnąć tą samą drogą.
   - Zastąpione zostają WSZYSTKIE turnieje (zwykle trwa tylko jeden, więc to bez znaczenia).
   - Sędziowie zostaną wylogowani — logują się ponownie tymi samymi kodami; ich niewysłane oceny dojdą po zalogowaniu.
5. Ten sam przebieg dla pliku: „Przywróć z pliku” → wybierz JSON (np. z folderu „Pobrane” komputera supervisora)
   → podgląd → przywrócenie z kodem.

Kopia powstaje o :30 tylko wtedy, gdy od poprzedniej coś się zmieniło — brak kopii z danej godziny jest normalny.
Przed ryzykowną operacją w panelu warto kliknąć „Zrób kopię teraz”.

## Po turnieju: feedback dla zawodników

1. Supervisor → turniej → **„Feedback zawodników”**. Liczniki pokazują, ile opinii jest zatwierdzonych, ile czeka jako szkic
   i ile kart nie ma feedbacku.
2. Szkice nie trafiają do plików — jeśli sędzia ma szkic, poproś go o zatwierdzenie (sędzia może to zrobić także po zakończeniu turnieju).
3. **„Pobierz wszystkie — ZIP”** (albo „PDF” przy zawodniku) → w folderze „Pobrane” jest archiwum z plikiem
   `ocena-seansu-<zawodnik>-<turniej>.pdf` dla każdego zawodnika z co najmniej jedną zatwierdzoną opinią.
4. Każdy plik dołącz do maila do właściwego zawodnika.

## Gdy trzeba poprawić kod w trakcie zawodów

1. Upewnij się, że problem jest w kodzie (powtarzalny, ten sam na wielu urządzeniach, błąd w konsoli).
2. Najmniejsza możliwa poprawka → test w demo lokalnie → `check.js` → commit → push (SKILL.md, sekcja „Jak wprowadzić zmianę”).
3. Po wdrożeniu: wszyscy Ctrl+F5 — najlepiej w przerwie między ceremoniami, nie w trakcie wpisywania ocen.
4. Nie zmieniaj w trakcie zawodów kształtu danych ani funkcji w bazie, chyba że bez tego system nie działa.

## Odtworzenie wyników bez aplikacji

Kopia JSON (`tts-backup-1`) i Excel z komputera supervisora zawierają wszystkie karty. Excel ma arkusze
wyników i kart — w ostateczności wyniki można policzyć w arkuszu. Kopie z bazy pobiera się na stronie
„Kopie zapasowe i kod dostępu” (Excel / JSON), a administrator może je też odczytać w SQL Editorze
(`select data from public.tts_backups where id = …;`).
