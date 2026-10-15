# Awarie i procedury w trakcie turnieju

Zasada: najpierw ustal DOKŁADNĄ treść komunikatu, na ilu urządzeniach występuje i od kiedy.
Dane ocen są bezpieczne w trzech miejscach: w bazie, w kolejce przeglądarki sędziego (gdy nie było sieci)
i w kopiach (baza co godzinę o :30 + pliki na komputerze supervisora). Nie czyść danych przeglądarki sędziom.

## Przed turniejem (dzień wcześniej i rano)

1. Otwórz panel Supabase — projekt nie może być uśpiony („Project paused” → „Restore project”).
2. Zaloguj się w aplikacji jako supervisor — wczytują się turnieje.
3. Turniej ma status „W trakcie” (Ustawienia), zawodnicy mają godziny startu, sędziowie mają kody
   (wydruk: „Sędziowie i kody” → „Drukuj kody”).
4. Na komputerze supervisora: „Kod dostępu i kopie” → włączone automatyczne pobieranie kopii o :30.
5. Każdy laptop sędziego: zaloguj kodem, wpisz próbnie i usuń jedną ocenę (znacznik w pasku górnym: „Zapisano”).
6. Zapas: wydrukowane papierowe karty oceny na wypadek całkowitej awarii.

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
| Błędne lub skasowane dane (np. usunięty zawodnik z ocenami) | pomyłka w panelu | supervisor: „Kod dostępu i kopie” → lista kopii → „Przywróć” wybraną (bieżący stan zapisze się najpierw jako „sprzed przywrócenia”); albo „Przywróć z pliku” z kopii JSON z komputera |
| Sędzia wpisał ocenę złemu zawodnikowi | — | sędzia poprawia sam (karty są edytowalne, dopóki turniej nie jest „Zakończony”); każda zmiana jest w „Historii zmian” |
| Pięciu sędziów zamiast czterech | — | supervisor: wyniki → zawodnik → odznaczyć „Liczy się” przy wybranej karcie |
| Wyniki trzeba zamrozić | koniec konkurencji | Ustawienia → status „Zakończony” (karty tylko do odczytu); można cofnąć na „W trakcie” |

## Gdy trzeba poprawić kod w trakcie zawodów

1. Upewnij się, że problem jest w kodzie (powtarzalny, ten sam na wielu urządzeniach, błąd w konsoli).
2. Najmniejsza możliwa poprawka → test w demo lokalnie → `check.js` → commit → push (SKILL.md, sekcja „Jak wprowadzić zmianę”).
3. Po wdrożeniu: wszyscy Ctrl+F5 — najlepiej w przerwie między ceremoniami, nie w trakcie wpisywania ocen.
4. Nie zmieniaj w trakcie zawodów kształtu danych ani funkcji w bazie, chyba że bez tego system nie działa.

## Odtworzenie wyników bez aplikacji

Kopia JSON (`tts-backup-1`) i Excel z komputera supervisora zawierają wszystkie karty. Excel ma arkusze
wyników i kart — w ostateczności wyniki można policzyć w arkuszu. Kopie z bazy pobiera się na stronie
„Kod dostępu i kopie” (Excel / JSON), a administrator może je też odczytać w SQL Editorze
(`select data from public.tts_backups where id = …;`).
