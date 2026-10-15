# Baza danych (Supabase)

- Projekt: `turniej-trzech-saun`, ref `wripvwhwginexvcmwdsq`, URL `https://wripvwhwginexvcmwdsq.supabase.co`,
  organizacja aufguss.world, region Frankfurt, plan **Free**.
- Panel: https://supabase.com/dashboard/project/wripvwhwginexvcmwdsq (SQL Editor: menu po lewej → „SQL Editor”).
- Schemat: [../supabase/setup.sql](../supabase/setup.sql) — idempotentny; ponowne uruchomienie całości
  nadpisuje funkcje, polityki i uprawnienia, NIE kasuje danych.
- Ustawienia projektu (zrobione przy uruchomieniu 15.10.2026): Authentication → anonymous sign-ins **włączone**;
  Rate Limits → anonimowe logowania **100/h** (laptopy w hotelu wychodzą z jednego IP); Data API →
  „Automatically expose new tables” **wyłączone** (nowa tabela wymaga jawnych `GRANT` jak w setup.sql).
- Kod supervisora jest ustawiony (15.10.2026, ustawił go sam supervisor — `supervisor_code_set_by = 'supervisor'`).

## Model dostępu

Każde urządzenie loguje się anonimowo (Supabase Auth). Rolę nadaje kod — funkcja zapisuje wiersz
w `tts_sessions` (`uid` urządzenia → `supervisor` albo `judge` + turniej + sędzia). Polityki RLS czytają tę rolę:

- **sędzia** widzi swój turniej (tylko gdy status ≠ `draft`) i wyłącznie WŁASNE karty; może dopisywać historię swoich zmian;
- **supervisor** widzi i zmienia wszystko — ale tylko gdy `tts_settings.supervisor_code_set_by = 'supervisor'`
  (`tts_is_supervisor()`); z kodem administratora lub przekazanym (`admin` / `handover`) może jedynie zmienić kod;
- niezalogowani (`anon`) nie mają żadnych uprawnień.

Uwaga: właściciel projektu Supabase zawsze może zajrzeć do tabel przez Table Editor (jak każdy dostawca hostingu).

## Tabele

| Tabela | Zawartość |
|---|---|
| `tts_sessions` | `uid` urządzenia → rola, `tournament_id`, `judge_id` |
| `tts_settings` | `supervisor_code_hash` (bcrypt), `supervisor_code_set_by` (`admin` / `supervisor` / `handover`), `supervisor_code_changed_at`; brak polityk — dostęp tylko przez funkcje |
| `tts_tournaments` | `id`, `status`, `data` (jsonb: część widoczna dla sędziów — nazwa, zawodnicy, harmonogram, karty, sędziowie bez kodów) |
| `tts_tournament_private` | `data` (jsonb: `excluded`, `dq`, `audience`) — tylko supervisor |
| `tts_judge_codes` | `(tournament_id, judge_id) → code` (unikalny globalnie); zmiana lub usunięcie kodu wylogowuje tego sędziego (wyzwalacz `tts_codes_kick`) |
| `tts_entries` | karta: `(tournament_id, disc, contestant_id, judge_id)` → `v`, `n`, `ni`, `fb`; wyzwalacz `tts_entries_guard` blokuje sędziom zapis w turnieju `draft` i zmiany w `closed` |
| `tts_history` | dziennik zmian ocen (`f` → `t`, w dziesiątych) |
| `tts_backups` | kopie (`kind`: `auto` / `manual` / `before-restore`, `data` w formacie `tts-backup-1`) |

Podział obiektu turnieju na wiersze: `splitTournament` / `assembleTournament` w `js/backup.js`.
Realtime włączony dla: `tts_tournaments`, `tts_tournament_private`, `tts_entries`, `tts_history`, `tts_judge_codes`.

## Funkcje (RPC)

| Funkcja | Kto | Co robi |
|---|---|---|
| `tts_login_judge(p_code)` | urządzenie | kod sędziego → sesja sędziego (turniej musi mieć status ≠ `draft`; zły kod = 1,5 s opóźnienia) |
| `tts_login_supervisor(p_code)` | urządzenie | kod supervisora → sesja supervisora; brak kodu w bazie = „Administrator nie nadał jeszcze kodu supervisora” |
| `tts_whoami()` / `tts_logout()` | urządzenie | bieżąca rola / wylogowanie |
| `tts_change_supervisor_code(p_old, p_new)` | supervisor | nowy kod (≥ 8 znaków, inny niż stary) → `set_by = 'supervisor'`, wylogowuje inne urządzenia supervisora |
| `tts_handover_code(p_current, p_new)` | supervisor | kopia ręczna + kod dla następcy (`set_by = 'handover'`) + wylogowanie wszystkich supervisorów |
| `tts_admin_set_supervisor_code(p_code)` | **tylko SQL Editor** | nadanie / reset kodu (`set_by = 'admin'`), wylogowuje supervisorów |
| `tts_make_backup()` / `tts_list_backups()` / `tts_get_backup(id)` | supervisor | kopia ręczna / lista / pobranie |
| `tts_restore_backup(id)` / `tts_restore_snapshot(json)` | supervisor | przywrócenie (najpierw kopia `before-restore`, potem zastąpienie WSZYSTKICH turniejów stanem z kopii). Aplikacja wywołuje je dopiero po potwierdzeniu kodem supervisora — kod sprawdza `tts_login_supervisor` (bez zmian w bazie). Wzmocnienie na przyszłość: parametr `p_code` sprawdzany w samych funkcjach przywracania (wymaga `drop function` starych sygnatur i nowych `grant`). |
| `tts_backup(kind)` | `pg_cron` / SQL Editor | kopia; `auto` pomijana, gdy nic się nie zmieniło; automatycznych trzymamy 168 |

`pg_cron`: zadanie `tts-backup`, harmonogram `30 * * * *` (co godzinę o :30).

## Przydatne zapytania (SQL Editor → wklej → **Run**)

Stan kodu supervisora (bez ujawniania kodu):
```sql
select key, case when key = 'supervisor_code_hash' then '(ustawiony)' else value end as value, updated_at
from public.tts_settings order by key;
```

Reset kodu supervisora (np. zapomniany) — kod wpisuje użytkownik, min. 8 znaków; supervisor po zalogowaniu musi ustawić własny:
```sql
select public.tts_admin_set_supervisor_code('WPISZ-KOD');
```

Przegląd danych:
```sql
select id, status, data->>'name' as nazwa, updated_at from public.tts_tournaments order by updated_at desc;
select role, count(*) from public.tts_sessions group by role;               -- zalogowane urządzenia
select id, created_at, kind, size_bytes from public.tts_backups order by id desc limit 20;
select jobname, schedule, active from cron.job;                              -- tts-backup, 30 * * * *
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
```

Kopia ręczna przed ryzykowną operacją:
```sql
select public.tts_backup('manual');
```

Czyszczenie WSZYSTKICH danych (tylko po wyraźnej decyzji użytkownika i po kopii!):
```sql
delete from public.tts_tournaments;   -- kaskadowo: część prywatna, kody, karty, historia
delete from public.tts_backups;
delete from public.tts_sessions;
```

## Jak bezpiecznie zmienić coś w bazie

1. Zmień odpowiedni fragment w `supabase/setup.sql` (w tym skillu) — plik jest źródłem prawdy.
2. Najpierw kopia: `select public.tts_backup('manual');`.
3. Użytkownik wkleja do SQL Editora TYLKO zmieniony fragment (np. jeden `create or replace function …`
   razem z ewentualnymi `grant` / `revoke` dla niej) albo cały plik — i klika **Run**.
   Nowa tabela: pamiętaj o `enable row level security`, politykach, `grant` dla `authenticated`
   i ewentualnie dodaniu do publikacji `supabase_realtime`.
4. Sprawdź działanie w produkcyjnej aplikacji (logowanie supervisora i sędziego).
5. Commit `setup.sql` razem ze zmianami w kodzie aplikacji.

Test RLS bez ryzyka: zapytanie w transakcji zakończonej błędem wycofuje wszystkie zmiany, np.
```sql
do $$ begin
  -- … operacje testowe …
  raise exception 'wycofaj test';
end $$;
```

## Plan Free — uśpienie projektu

Projekty Supabase na planie Free są usypiane po ok. tygodniu bez aktywności. Uśpiony projekt = aplikacja
nie łączy się z bazą. **Dzień przed turniejem i rano w dniu turnieju** otwórz panel projektu — jeśli widać
„Project paused”, kliknij „Restore project” (kilka minut). Rozwiązanie na stałe: plan Pro.

## Przeniesienie projektu do organizatora (opcjonalnie, w przyszłości)

Supabase: Project Settings → General → Transfer project (do organizacji organizatora). Adres i klucz
publishable się nie zmieniają, więc `config.js` zostaje bez zmian.
