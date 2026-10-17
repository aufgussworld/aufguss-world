# Architektura systemu

## Technologia

- Statyczna strona bez kroku budowania: ES modules + **Preact z htm** (`https://unpkg.com/htm@3.1.1/preact/standalone.module.js`,
  przez `js/lib.js`). Szablony: ``html`<div class=${x}>…</div>` ``, komponenty: `<${Comp} prop=${v} />`.
- Hosting: GitHub Pages z repo `aufgussworld/aufguss-world` (plik `.nojekyll` w katalogu głównym).
- Baza: Supabase (`@supabase/supabase-js@2.115.0` jako ESM z jsDelivr, ładowany tylko w trybie produkcyjnym).
- PDF: pdfmake 0.2.12 (cdnjs, ładowany na żądanie). Excel: SheetJS xlsx 0.18.5 (cdnjs, na żądanie).
- Czcionki: Fraunces (nagłówki), Instrument Sans (interfejs), JetBrains Mono (liczby/kody) z Google Fonts.
- Marka: Sommer Residence — bordo `#8D2732`, pasek górny `#5c1520`, złoto `#e6c79a`; logo
  `assets/logo-sommer-residence.png` (białe; na jasnym tle barwione maską CSS, w PDF przekolorowane canvasem).

## Pliki (`turniej-trzech-saun/`)

| Plik | Odpowiada za |
|---|---|
| `index.html` | wejście produkcyjne: wczytuje `config.js`, potem `js/app.js` |
| `config.js` | `window.TTS_CONFIG = { mode: 'live', supabaseUrl, supabaseAnonKey }` (klucz publishable); opcjonalnie `feedbackEndpoint` |
| `demo/index.html` | wersja demo: `TTS_CONFIG = { mode: 'demo' }`, te same `../css` i `../js` |
| `demo-beta/index.html`, `demo-beta/js/`, `demo-beta/css/beta.css` | demo nowych funkcji do akceptacji: wspólny kod z `../js`, a wybrane moduły podmienione mapą importów — patrz [Demo nowych funkcji](#demo-nowych-funkcji-demo-beta) |
| `instrukcja/index.html`, `instrukcja/img/` | instrukcja obsługi dla sędziów (statyczna strona, własny CSS, zrzuty z demo); przycisk „Instrukcja” w pasku sędziego i odnośnik pod logowaniem — patrz [instrukcja-sedziow.md](instrukcja-sedziow.md) |
| `assets/login-hero.jpg` | grafika ekranu logowania (od organizatora) |
| `assets/favicon-16.png`, `assets/favicon-32.png`, `assets/apple-touch-icon.png` | favicon i ikona na ekran telefonu: biały sygnet Sommer Residence (wieniec z monogramem SR, wycięty z `logo-sommer-residence.png`, wiersze 0–130, kolumny 45–205) na bordowym tle `#8D2732`; podpięte w `index.html` i `demo/index.html` |
| `js/app.js` | start aplikacji, ekran logowania, wymuszona zmiana kodu supervisora, routing po `#hash`, pasek górny, znacznik synchronizacji, automatyczna kopia co godzinę o :30 (supervisor) |
| `js/store.js` | magazyn stanu (demo: localStorage `tts-demo-v1`; live: pamięć + `remote.js`), akcje: `updateT`, `createTournament`, `deleteTournament`, `setScore`, `logChange`, `setNote`, `setItemNote`, `setFeedback`, sesja w sessionStorage |
| `js/remote.js` | tryb produkcyjny: logowanie anonimowe + RPC ról, pobieranie danych, zapisy z kolejką offline, czas rzeczywisty, odświeżanie co 60 s, kopie w bazie, przekazanie dostępu |
| `js/model.js` | logika punktacji i formatowanie: `parseScore`, `entryStats`, `contestantDisc`, `assignRanks`, `disciplineResults`, `finalResults`, `audienceStats`, `audienceRanking`, `orderedContestants`, `fmt`, `fmtAvg`, `toCSV`, `download` |
| `js/templates.js` | domyślne karty oceny (Relax / HOT / Banya) według „Kryteriów oceniania” |
| `js/wizard.js` | kreator nowego turnieju (rodzaj → zawodnicy → harmonogram → sędziowie → karta → podsumowanie) |
| `js/editors.js` | edytory: zawodnicy i harmonogram startów, import finalistów z eliminacji, sędziowie i kody (+ wydruk kodów PDF), edytor karty oceny |
| `js/judge.js` | panel sędziego: karta ocen (`ScoreCard`), pola z walidacją, uwagi do pozycji i kategorii, eksport karty PDF/Excel, porównanie zawodników, „Mój ranking” |
| `js/supervisor.js` | panel supervisora: lista turniejów, wyniki na żywo (`ResultsTab`: kolejność startowa / ranking), karty sędziów (macierz), porównanie „oczami sędziego”, historia zmian, głosy publiczności (`AudienceTab`: kolejność występów / ranking, podium, CSV/PDF), ustawienia, strona „Kopie zapasowe i kod dostępu” (`SystemPage`: lista kopii, `BackupPreview` — podgląd kopii obok obecnego stanu, `RestoreDialog` — przywrócenie po wpisaniu kodu, zmiana kodu, przekazanie dostępu) |
| `js/feedback.js` | generator szkicu feedbacku (szablony zdań; opcjonalnie `TTS_CONFIG.feedbackEndpoint` — miejsce na przyszłe AI, dziś nieustawione, więc także w produkcji działa wbudowany generator) + `FeedbackModal`: sędzia — „Zapisz szkic” / „Zatwierdź feedback” / „Usuń feedback” (bez PDF); supervisor (readOnly) — podgląd i „Zbiorczy PDF zawodnika”; `FeedbackBadge` |
| `js/pdf.js` | PDF: karta sędziego, wyniki, ranking publiczności, **zbiorczy feedback zawodnika** (`contestantFeedbackPDF` — strona tytułowa + każda zatwierdzona opinia na osobnej stronie; `feedbackZip` — wszystkie pliki turnieju w ZIP, JSZip 3.10.1 z cdnjs); nagłówek z logo, stopka z adresem |
| `js/backup.js` | format kopii `tts-backup-1` (JSON), podział turnieju na wiersze bazy, eksport Excel, automatyczne pobieranie kopii o :30 |
| `js/ui.js` | ikony SVG (słownik `P`), logo, awatary, odznaki konkurencji, `Segmented`, `Modal`, dymki uwag, toasty |
| `js/seed.js` | dane demo (turnieje `fin25`, `hot26`, `rlx26`, `bny26`; PIN `2026`); po zmianie podbić `SEED_VERSION` |
| `css/app.css` | całe style; tokeny kolorów i czcionek na górze (`:root`) |

## Trasy (`location.hash`)

- `#/` logowanie (sędzia: kod 6 znaków; supervisor: kod dostępu; w demo również PIN i szybkie wejścia).
- Sędzia: `#/j/ocena/<disc>/<idZawodnika>`, `#/j/porownanie/<disc>`, `#/j/ranking/<disc>`.
- Supervisor: `#/s` (lista), `#/s/new` (kreator), `#/s/system` (kopie zapasowe, przywracanie, kod dostępu),
  `#/s/t/<idTurnieju>/<zakładka>`: `wyniki`, `karty`, `porownanie`, `historia`, `publicznosc`, `feedback`,
  `zawodnicy`, `sedziowie`, `karta`, `ustawienia`. `TournamentView` ma `key` = id turnieju, więc stan
  zakładek (np. wybrana konkurencja) zeruje się przy przejściu do innego turnieju.

## Feedback dla zawodników

- Sędzia na swojej karcie: „Feedback dla zawodnika” → „Przygotuj szkic feedbacku” (generator z ocen i uwag) → edycja →
  **„Zapisz szkic”** (`approved: false`) albo **„Zatwierdź feedback”** (`approved: true`, `approvedAt`) albo **„Usuń feedback”**
  (`fb` usunięte). Sędzia NIE pobiera PDF. Przycisk na karcie pokazuje stan: „Feedback dla zawodnika” / „Feedback — szkic” (żółty) /
  „Feedback zatwierdzony” (zielony). Zmiana tekstu i ponowne „Zatwierdź” aktualizuje wersję; feedback można przygotować także w turnieju
  zakończonym (wyzwalacz bazy blokuje wtedy tylko `v`, `n`, `ni`).
- `model.js`: `feedbackState(e)` → `none` / `draft` / `approved`; `fbApproved(e)` — zatwierdzony i niepusty;
  `approvedFeedback(t, cid)` — lista `{ disc, judge, fb, stats }` ze wszystkich konkurencji turnieju (w finale trzy dni).
- Supervisor: zakładka **„Feedback zawodników”** (`FeedbackTab`): liczniki (zatwierdzone, szkice, karty bez feedbacku, zawodnicy z plikiem),
  tabela zawodnik × sędzia (ikona ✓ zatwierdzony, ołówek — szkic, „—” brak, „·” nie oceniał; kliknięcie otwiera opinię do odczytu),
  przycisk **PDF** przy zawodniku i **„Pobierz wszystkie — ZIP”**. Macierz „Karty sędziów” rozróżnia szkic i zatwierdzony feedback.
- PDF zawodnika (`ocena-seansu-<zawodnik>-<turniej>.pdf`): strona tytułowa (turniej, konkurencja/termin, liczba opinii, lista sędziów —
  w finale z konkurencją i godziną startu), potem każda opinia od nowej strony: konkurencja, start, ocena tego sędziego z tabelą kategorii,
  sekcje feedbacku, podpis sędziego z datą zatwierdzenia. Szkice i opinie puste są pomijane.
- Dane demo (`seed.js`, `SEED_VERSION = 3`): przykładowy feedback (co piąta opinia to szkic) w hot26, rlx26, fin25 (6 pierwszych w każdej
  konkurencji) i bny26 (3 pierwszych); osobny generator losowy `rng(5150)`, żeby nie zmieniać pozostałych danych demo.

## Kolejność wierszy (wyniki i głosy publiczności)

- „Kolejność startowa” (domyślnie): `orderedContestants(t, disc)` — po dacie i godzinie startu, potem po `t.order`;
  kolumna „Nr” = pozycja na tej liście. W klasyfikacji łącznej finału — kolejność z pierwszego dnia (`FINAL_ORDER[0]` = Relax).
- „Ranking”: `disciplineResults` / `finalResults` (miejsca ex aequo, DSQ na końcu); głosy publiczności — `audienceRanking`.
- Eksporty wyników (CSV, PDF) są zawsze w kolejności rankingu.

## Model danych (obiekt turnieju w aplikacji)

```js
{
  id, name, type: 'relax' | 'hot' | 'banya' | 'final',
  status: 'draft' | 'live' | 'closed',      // szkic: sędziowie nie wejdą; zakończony: karty tylko do odczytu
  dateFrom, dateTo, place,
  panelSize: 4,            // ilu sędziów liczy się na ceremonię (przy 5 supervisor odznacza „Liczy się”)
  decimalMode: 'both' | 'comma',
  audienceSize: 12,        // liczba głosujących z publiczności
  contestants: [{ id, first, last, photo /* dataURL | null */, start: { [disc]: { date, time } } }],
  judges: [{ id, first, last, code }],     // w bazie kod jest w osobnej tabeli tts_judge_codes
  order: { [disc]: [idZawodnika, …] },     // kolejność / numery startowe
  cards: { [disc]: { duration, categories: [{ id, name, items: [{ id, label, kind: 'plus' | 'minus' | 'bin', max, hint? }] }] } },
  scores: { [disc]: { [cid]: { [jid]: {
    v: { [itemId]: dziesiąte },  n: { [catId]: 'Dodatkowe uwagi' },  ni: { [itemId]: 'uwaga do pozycji' },
    fb: { sections: [{ id, title, text }], updatedAt, source, approved, approvedAt },  u: znacznikCzasu } } } },
  history: [{ ts, j, c, d, i, f, t }],     // kto, komu, konkurencja, pozycja, z → na
  excluded: { 'disc|cid|jid': true },      // karty wyłączone z liczenia
  dq: { 'disc|cid': 'powód' },             // dyskwalifikacje
  audience: { [disc]: { [cid]: [dziesiąte | null, …] } },
}
```

`disc` to konkurencja: w eliminacjach równa `type`, w finale `relax`, `hot`, `banya` (kolejność `FINAL_ORDER`).

## Zasady punktacji (`model.js`)

- Wpis sędziego: liczba ≥ 0 z dokładnością 0,1 (przecinek lub kropka; w trybie `comma` tylko przecinek).
  Punkty karne (`minus`) wpisuje się BEZ minusa — system je odejmuje; minus na początku = błąd od razu.
  `bin` = tylko 0 albo max. Nieprawidłowy wpis wraca do poprzedniej wartości z komunikatem.
- Karta sędziego: suma `plus` + `bin` − suma `minus`.
- Wynik zawodnika w konkurencji: suma kart sędziów, którzy zaczęli oceniać i nie są wyłączeni.
  Gdy liczonych sędziów jest więcej niż `panelSize`, wyniki pokazują ostrzeżenie — supervisor decyduje, kogo nie liczyć.
- Ranking: miejsca ex aequo (1, 2, 2, 4); zdyskwalifikowani na końcu bez miejsca.
- Finał: suma trzech konkurencji. Zaproszenie 6. miejsca do finału — poza aplikacją.
- **Głosy publiczności (regulamin):** odrzuca się jedną najwyższą i jedną najniższą ocenę, z pozostałych
  liczy średnią arytmetyczną (zaokrągloną do 0,01) i mnoży przez 10. Przy komplecie głosów wynik = suma
  pozostałych; przy niepełnym komplecie braki NIE obniżają wyniku. Minimum 3 głosy. Ranking po wyniku,
  remisy ex aequo. Nie liczy się do wyniku turnieju — wyłania Nagrodę Publiczności.

## Tryb demo a produkcja

- **Demo** (`mode: 'demo'`): wszystko w localStorage przeglądarki, karty tej samej przeglądarki synchronizują
  się zdarzeniem `storage`. Idealne do testów zmian interfejsu i punktacji.
- **Produkcja** (`mode: 'live'`): stan w pamięci w tym samym kształcie co demo, a `remote.js`:
  - loguje urządzenie anonimowo (Supabase Auth, sesja w sessionStorage — osobno dla każdej karty),
    rolę nadaje RPC `tts_login_judge` / `tts_login_supervisor`;
  - zmiany supervisora zapisuje po 0,6 s (porównując odcisk turnieju); oceny sędziów trafiają do kolejki
    `tts-live-outbox` w localStorage i są wysyłane od razu, a przy braku sieci co 5 s aż do skutku;
  - odbiera zmiany innych na żywo (Realtime `postgres_changes`) i co 60 s odświeża całość, sprawdzając
    przy tym, czy sesja wciąż istnieje (inaczej zdarzenie `tts-session-lost` → wylogowanie z komunikatem);
  - trzyma kopię stanu w sessionStorage (`tts-live-cache`), więc po przeładowaniu bez internetu można dalej oceniać;
  - błąd `P0001` (reguła biznesowa, np. turniej zakończony) usuwa wpis z kolejki, `42501` (brak uprawnień) wymusza odświeżenie.
- Supervisor z kodem nadanym przez administratora (lub przekazanym przez poprzednika) nie widzi danych,
  dopóki nie ustawi własnego kodu (`session.codeSetBy !== 'supervisor'` → ekran wymuszonej zmiany).

## Demo nowych funkcji (`demo-beta/`)

Pokazuje nowe funkcje do akceptacji, gdy trwa turniej, bez zmiany żadnego pliku, który ładuje produkcja albo `/demo/`.

- `demo-beta/index.html` — jak `demo/index.html` (`mode: 'demo'`), plus `css/beta.css` po `../css/app.css` i **mapa importów**:
  dla każdego podmienionego modułu dwa wpisy `"../js/<plik>": "./js/<plik>"` i `"./js/<plik>": "./js/<plik>"`, na końcu
  prefiks `"./js/": "../js/"`. Podmienione dziś: `judge.js`, `model.js`. Wszystko inne (także importy z wnętrza
  podmienionych modułów, np. `./store.js`) idzie ze wspólnego `js/`. Jedna kopia `store.js` → te same dane demo
  (localStorage `tts-demo-v1`) co `/demo/`.
- Podmiana kolejnego modułu: skopiuj `js/<plik>.js` do `demo-beta/js/` i dopisz OBA wpisy do mapy. Drugi wpis
  (`./js/<plik>` na siebie) jest konieczny: bez niego import z wnętrza bety (np. `judge.js` → `./model.js`) trafiłby przez
  prefiks do starej wersji z `js/` — powstałyby dwie kopie modułu (dokładny wpis wygrywa z prefiksem; mapa nie działa
  rekurencyjnie). Sprawdzenie w przeglądarce: w zakładce Sieć każdy podmieniony plik ładuje się raz i tylko z `demo-beta/js/`.
  Importy w kopii zostają `./x.js`, więc po akceptacji plik przechodzi do `js/` bez poprawek.
- `check.js` sprawdza składnię `demo-beta/js/*.js` i importy: kopia względem eksportów `js/` oraz moduły `js/` względem
  eksportów kopii (np. `supervisor.js` importuje `ScoreCard` z `judge.js`).
- Mapy importów: Chrome/Edge 89+, Safari 16.4+, Firefox 108+ — dotyczy tylko bety; produkcja po wdrożeniu mapy nie używa.

### Co jest teraz w becie (od 2026-10-17)

`demo-beta/js/judge.js` = `js/judge.js` z commita `26e1382` + zmiany:

- `ScoreSlider` — suwak 0–maks. (dziesiąte części) pod nazwą pozycji `plus` / `minus`; nie dla `bin` i nie na karcie
  zablokowanej / tylko do odczytu (tam zostaje tekst zakresu). Mysz: wartość od razu w miejscu kliknięcia i przy przeciąganiu.
  Dotyk: `touch-action: pan-y` — ruch w pionie przewija stronę, wartość zmienia ruch w bok (> 6 px) albo stuknięcie;
  `pointercancel` przywraca ocenę sprzed gestu. Klawiatura: strzałki ±0,1, PageUp/PageDown ±1, Home/End.
  Zapis przez `setScore` na żywo (jak wpisywanie w pole), w historii jeden wpis `logChange` po puszczeniu (klawiatura:
  po 0,8 s przerwy); wartość „z” czytana świeżo ze store (`getT`), bo pole obok mogło przed chwilą zapisać wpis.
  W produkcji kolejka `tts-live-outbox` łączy zapisy tej samej karty (klucz turniej|konkurencja|zawodnik|sędzia,
  wysyłka po 350 ms), więc przeciąganie nie zalewa bazy zapisami.
- `ScoreInput` — zmiana oceny z zewnątrz (suwak, inne urządzenie) czyści komunikat o błędnym wpisie w polu.
- `PeerButton` / `PeerPopover` / `peerRows` — przycisk (ikona `ranking`) po prawej od pola punktów; okienko z ocenami
  **tego samego sędziego** w tej pozycji u zawodników, którzy ją mają, plus bieżący zawodnik (zaznaczony, wartość na żywo);
  kolejność startowa albo od najwyższej, pasek względem maksimum, dymek z uwagą do pozycji, liczba ocenionych i średnia.
  Położenie: po prawej od przycisku; gdy brak miejsca (prawa kolumna karty, telefon) — pod wierszem albo nad nim,
  liczone względem `visualViewport`. Zamykanie: X, Esc (tylko okienko — nie okno karty u supervisora), klik poza
  okienkiem i poza wierszem tej pozycji (suwak i pole tej pozycji działają przy otwartym okienku). U supervisora
  (karta tylko do odczytu) teksty „Oceny sędziego: …” i „ta karta”. Przycisk jest nieaktywny, dopóki żaden inny
  zawodnik nie ma oceny w tej pozycji.
- Wskazówka nad kartą wspomina suwak i przycisk ocen.
- `CompareCell` (od 2026-10-17) — **poprawianie ocen w porównaniu zawodników**: u sędziego (`CompareView` / `Comparison`
  z `editable`, przekazywanym tylko z `JudgeApp` przy statusie „W trakcie”; nie w „Suma 3 dni”, nie u supervisora,
  nie w trybie sumy kart) każda ocena pozycji jest przyciskiem; kliknięcie otwiera pole (fokus w `useLayoutEffect`,
  żeby szybko wpisana cyfra nie trafiła obok), walidacja `parseScore` (także `bin`: tylko 0 albo maks.). Enter zapisuje
  (błąd — komunikat pod polem, pole zostaje), Esc anuluje, wyjście z pola zapisuje poprawną wartość, a błędną odrzuca
  z komunikatem (toast). Zapis jak w karcie: `setScore` + `logChange` (wartość „z” świeża ze store), więc karta
  zawodnika, sumy kategorii, wynik i wyróżnienia w tabeli zmieniają się od razu. Nad tabelą podpowiedź z ołówkiem.

`demo-beta/js/model.js` = `js/model.js` z commita `26e1382` + jedna zmiana (od 2026-10-17): `parseScore` przyjmuje wpis
bez zera przed separatorem — „,8” / „.8” = 0,8 (jak w Excelu; po wyjściu z pola widać „0,8”). Działa w karcie, w porównaniu
i w głosach publiczności. Bez zmian: „,85” (za dokładnie), sam „,” (nie liczba), kropka w trybie „tylko przecinek”, `bin` tylko
0 / maks. Wskazówka nad kartą: „<kbd>,8</kbd> = 0,8”.

`demo-beta/css/beta.css`, sekcja „karta oceny”: nowy układ wiersza `.item` (nazwa i pod nią suwak w kolumnie 2;
uwaga, pole i przycisk ocen po prawej na wysokość obu wierszy; `bin` — przyciski Nie/Tak w drugim wierszu; telefon
≤ 820 px: nazwa na całą szerokość, pod nią suwak, pole 76 px i przycisk), suwak, okienko, większe cele dotyku
(`pointer: coarse`) oraz poprawka szerokości strony na telefonie (`.split` `minmax(0, 1fr)`, zawijane przyciski `.sc-foot`
— wcześniej strona była o ~44 px szersza od ekranu). Sekcja „porównanie zawodników”: przyciski ocen (`.cv-btn`, ołówek
po najechaniu; na ekranach dotykowych ramka zawsze widoczna), pole edycji `.cv-edit`, dymek błędu `.cv-err`.
Sekcji „tylko demo-beta” (dopisek „· nowe funkcje” przy znaczku Demo) NIE przenosić.

### Wdrożenie po akceptacji

1. `git pull`; sprawdź, czy `js/judge.js` lub `js/model.js` zmieniły się od bazy bety:
   `git log --oneline 26e1382.. -- turniej-trzech-saun/js/judge.js turniej-trzech-saun/js/model.js`. Jeśli tak — połącz zmiany
   (`git diff --no-index turniej-trzech-saun/js/judge.js turniej-trzech-saun/demo-beta/js/judge.js`, tak samo `model.js`).
2. Skopiuj `demo-beta/js/judge.js` → `js/judge.js` i `demo-beta/js/model.js` → `js/model.js`. Sekcje „karta oceny” i „porównanie zawodników” z `beta.css` dopisz
   na końcu `css/app.css` (nadpisują stare reguły `.item`; porządniej — zastąp nimi reguły `.item` w app.css i ich
   odpowiedniki w `@media (max-width: 820px)`).
3. Instrukcja dla sędziów: rozdział o wpisywaniu ocen — suwak i przycisk ocen; rozdział o porównaniu — poprawianie ocen
   kliknięciem; nowe zrzuty ([instrukcja-sedziow.md](instrukcja-sedziow.md)).
4. Wyczyść betę: usuń `demo-beta/js/judge.js`, `demo-beta/js/model.js` i obie sekcje z `beta.css`, z mapy importów
   usuń ich wpisy
   (strona `demo-beta/` zostaje na kolejne funkcje). Aktualizacja tego pliku i dziennika zmian.
5. `check.js`, test w `/demo/`, commit, push, potem **Ctrl+F5 u wszystkich** (zmieniają się `judge.js`, `model.js` i `app.css`).
   Wystawione oceny są bezpieczne: kształt danych bez zmian, kolejka offline ze starego formatu działa dalej.

## Kopie zapasowe i eksporty

- W bazie: `pg_cron` co godzinę o :30 (tylko gdy coś się zmieniło), automatyczne trzymane 168 sztuk (7 dni),
  ręczne i „sprzed przywrócenia” — bezterminowo. Strona „Kopie zapasowe i kod dostępu” (`#/s/system`):
  lista kopii z kolumną „Zmiana” (ile kart przybyło/ubyło od poprzedniej kopii — spadek = sygnał problemu),
  przyciski Podgląd / Excel / JSON / Przywróć….
- **Podgląd** (`BackupPreview`): wczytuje kopię (`tts_get_backup`, pamięć podręczna w oknie), pokazuje wybrany
  turniej i konkurencję: wynik w kopii, wynik teraz, różnicę; liczby kart, zmian w historii i głosów (kopia vs teraz);
  strzałki „Wcześniejsza / Późniejsza” przechodzą po kopiach. Ten sam podgląd otwiera się po wybraniu pliku JSON.
- **Przywracanie** (`RestoreDialog`): wymaga wpisania kodu supervisora — w produkcji sprawdza go baza funkcją
  `tts_login_supervisor` (`remote.verifySupervisorCode`; dla tego urządzenia tylko odświeża sesję), w demo PIN `2026`.
  Potem `tts_restore_backup(id)` albo `tts_restore_snapshot(json)`: kopia „sprzed przywrócenia”, zastąpienie
  WSZYSTKICH turniejów. Usunięcie i odtworzenie kodów sędziów wylogowuje sędziów (wyzwalacz `tts_codes_kick`) —
  logują się ponownie tymi samymi kodami, a ich niewysłane oceny z kolejki dochodzą po zalogowaniu.
- Na komputerze supervisora: o :30 automatycznie pobierają się pliki Excel + JSON (przełącznik na tej samej
  stronie, zapamiętywany w przeglądarce), gdy jakiś turniej ma status „W trakcie”.
- Sędzia: po seansie może pobrać swoją kartę jako PDF lub Excel (zabezpieczenie na wypadek awarii).
- Supervisor: wyniki CSV/PDF, ranking publiczności CSV/PDF, pełny Excel turnieju w „Ustawieniach”.

## Konwencje kodu

- Komentarze i teksty po polsku; nazwy zmiennych po angielsku; wcięcia 2 spacje; pojedyncze cudzysłowy.
- Nowa ikona: dopisz ścieżkę SVG do słownika `P` w `ui.js`, używaj `<${Icon} name="…" />`.
- Kolory tylko przez zmienne CSS; klasy konkurencji `d-hot`, `d-relax`, `d-banya`.
- Nowy eksport między modułami → zawsze `check.js` przed wdrożeniem (brak eksportu = biały ekran).
