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
| `assets/login-hero.jpg` | grafika ekranu logowania (od organizatora) |
| `js/app.js` | start aplikacji, ekran logowania, wymuszona zmiana kodu supervisora, routing po `#hash`, pasek górny, znacznik synchronizacji, automatyczna kopia co godzinę o :30 (supervisor) |
| `js/store.js` | magazyn stanu (demo: localStorage `tts-demo-v1`; live: pamięć + `remote.js`), akcje: `updateT`, `createTournament`, `deleteTournament`, `setScore`, `logChange`, `setNote`, `setItemNote`, `setFeedback`, sesja w sessionStorage |
| `js/remote.js` | tryb produkcyjny: logowanie anonimowe + RPC ról, pobieranie danych, zapisy z kolejką offline, czas rzeczywisty, odświeżanie co 60 s, kopie w bazie, przekazanie dostępu |
| `js/model.js` | logika punktacji i formatowanie: `parseScore`, `entryStats`, `contestantDisc`, `assignRanks`, `disciplineResults`, `finalResults`, `audienceStats`, `audienceRanking`, `orderedContestants`, `fmt`, `fmtAvg`, `toCSV`, `download` |
| `js/templates.js` | domyślne karty oceny (Relax / HOT / Banya) według „Kryteriów oceniania” |
| `js/wizard.js` | kreator nowego turnieju (rodzaj → zawodnicy → harmonogram → sędziowie → karta → podsumowanie) |
| `js/editors.js` | edytory: zawodnicy i harmonogram startów, import finalistów z eliminacji, sędziowie i kody (+ wydruk kodów PDF), edytor karty oceny |
| `js/judge.js` | panel sędziego: karta ocen (`ScoreCard`), pola z walidacją, uwagi do pozycji i kategorii, eksport karty PDF/Excel, porównanie zawodników, „Mój ranking” |
| `js/supervisor.js` | panel supervisora: lista turniejów, wyniki na żywo (`ResultsTab`: kolejność startowa / ranking), karty sędziów (macierz), porównanie „oczami sędziego”, historia zmian, głosy publiczności (`AudienceTab`: kolejność występów / ranking, podium, CSV/PDF), ustawienia, strona „Kopie zapasowe i kod dostępu” (`SystemPage`: lista kopii, `BackupPreview` — podgląd kopii obok obecnego stanu, `RestoreDialog` — przywrócenie po wpisaniu kodu, zmiana kodu, przekazanie dostępu) |
| `js/feedback.js` | generator feedbacku dla zawodnika (szablony zdań; opcjonalnie `TTS_CONFIG.feedbackEndpoint` — miejsce na przyszłe AI) + okno edycji |
| `js/pdf.js` | PDF: karta sędziego, feedback, wyniki, ranking publiczności (nagłówek z logo, stopka z adresem) |
| `js/backup.js` | format kopii `tts-backup-1` (JSON), podział turnieju na wiersze bazy, eksport Excel, automatyczne pobieranie kopii o :30 |
| `js/ui.js` | ikony SVG (słownik `P`), logo, awatary, odznaki konkurencji, `Segmented`, `Modal`, dymki uwag, toasty |
| `js/seed.js` | dane demo (turnieje `fin25`, `hot26`, `rlx26`, `bny26`; PIN `2026`); po zmianie podbić `SEED_VERSION` |
| `css/app.css` | całe style; tokeny kolorów i czcionek na górze (`:root`) |

## Trasy (`location.hash`)

- `#/` logowanie (sędzia: kod 6 znaków; supervisor: kod dostępu; w demo również PIN i szybkie wejścia).
- Sędzia: `#/j/ocena/<disc>/<idZawodnika>`, `#/j/porownanie/<disc>`, `#/j/ranking/<disc>`.
- Supervisor: `#/s` (lista), `#/s/new` (kreator), `#/s/system` (kopie zapasowe, przywracanie, kod dostępu),
  `#/s/t/<idTurnieju>/<zakładka>`: `wyniki`, `karty`, `porownanie`, `historia`, `publicznosc`,
  `zawodnicy`, `sedziowie`, `karta`, `ustawienia`. `TournamentView` ma `key` = id turnieju, więc stan
  zakładek (np. wybrana konkurencja) zeruje się przy przejściu do innego turnieju.

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
    fb: { sections: [{ id, title, text }], updatedAt, source },  u: znacznikCzasu } } } },
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
