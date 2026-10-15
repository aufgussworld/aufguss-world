-- ============================================================================
-- Turniej Trzech Saun — baza systemu sędziowskiego (Supabase / PostgreSQL)
-- Uruchom CAŁY plik w Supabase → SQL Editor → New query → Run.
-- Skrypt można uruchamiać wielokrotnie (tworzy brakujące elementy, nadpisuje funkcje).
--
-- Model dostępu:
--  * Każde urządzenie loguje się anonimowo (Supabase Auth → anonymous sign-ins).
--  * Kod sędziego albo kod supervisora (funkcje tts_login_*) przypisuje urządzeniu rolę
--    w tabeli tts_sessions. Polityki RLS czytają tę rolę — sędzia widzi i zapisuje
--    wyłącznie własne karty, supervisor widzi wszystko.
--  * Administrator nadaje pierwszy kod supervisora funkcją tts_admin_set_supervisor_code
--    (wyłącznie z SQL Editora). Z takim kodem można jedynie ustawić nowy kod — dane turnieju
--    są niewidoczne. Supervisor ustawia własny kod; od tej chwili administrator nie zaloguje
--    się do panelu, a każdy reset kodu przez administratora wyloguje supervisora i zostanie
--    mu pokazany przy następnym logowaniu.
--  * Uwaga: właściciel projektu Supabase zawsze może zajrzeć do tabel przez panel Supabase
--    (Table Editor) — tak jak każdy dostawca hostingu. Pełna poufność wymaga, by projekt
--    należał do organizatora albo by administrator nie miał dostępu do panelu w trakcie turnieju.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------- tabele ----

create table if not exists public.tts_sessions (
  uid uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('supervisor', 'judge')),
  tournament_id text,
  judge_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.tts_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Część turnieju widoczna dla sędziów tego turnieju (zawodnicy, harmonogram, karta oceny).
create table if not exists public.tts_tournaments (
  id text primary key,
  status text not null default 'draft' check (status in ('draft', 'live', 'closed')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Część widoczna tylko dla supervisora (wyłączone karty, dyskwalifikacje, głosy publiczności).
create table if not exists public.tts_tournament_private (
  tournament_id text primary key references public.tts_tournaments (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tts_judge_codes (
  tournament_id text not null references public.tts_tournaments (id) on delete cascade,
  judge_id text not null,
  code text not null,
  primary key (tournament_id, judge_id)
);
create unique index if not exists tts_judge_codes_code on public.tts_judge_codes (code);

-- Karta jednego sędziego dla jednego zawodnika w jednej konkurencji.
create table if not exists public.tts_entries (
  tournament_id text not null references public.tts_tournaments (id) on delete cascade,
  disc text not null,
  contestant_id text not null,
  judge_id text not null,
  v jsonb not null default '{}'::jsonb,   -- oceny (dziesiąte części punktu)
  n jsonb not null default '{}'::jsonb,   -- dodatkowe uwagi do kategorii
  ni jsonb not null default '{}'::jsonb,  -- uwagi do pozycji
  fb jsonb,                               -- feedback dla zawodnika
  updated_at timestamptz not null default now(),
  primary key (tournament_id, disc, contestant_id, judge_id)
);

create table if not exists public.tts_history (
  id bigserial primary key,
  tournament_id text not null references public.tts_tournaments (id) on delete cascade,
  ts timestamptz not null default now(),
  judge_id text not null,
  contestant_id text not null,
  disc text not null,
  item_id text not null,
  f integer,
  t integer
);
create index if not exists tts_history_tournament on public.tts_history (tournament_id, id);

create table if not exists public.tts_backups (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('auto', 'manual', 'before-restore')),
  hash text,
  size_bytes integer,
  data jsonb not null
);

-- --------------------------------------------------- funkcje pomocnicze ----

-- Pełne uprawnienia supervisora dopiero po ustawieniu WŁASNEGO kodu. Z kodem nadanym (lub zresetowanym)
-- przez administratora można wyłącznie zmienić kod — administrator nie zobaczy danych turnieju.
create or replace function public.tts_is_supervisor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tts_sessions where uid = auth.uid() and role = 'supervisor')
     and coalesce((select value from tts_settings where key = 'supervisor_code_set_by'), 'admin') = 'supervisor';
$$;

create or replace function public.tts_judge_tournament() returns text
language sql stable security definer set search_path = public as $$
  select tournament_id from tts_sessions where uid = auth.uid() and role = 'judge';
$$;

create or replace function public.tts_judge_id() returns text
language sql stable security definer set search_path = public as $$
  select judge_id from tts_sessions where uid = auth.uid() and role = 'judge';
$$;

-- --------------------------------------------------------------- RLS ----

alter table public.tts_sessions enable row level security;
alter table public.tts_settings enable row level security;
alter table public.tts_tournaments enable row level security;
alter table public.tts_tournament_private enable row level security;
alter table public.tts_judge_codes enable row level security;
alter table public.tts_entries enable row level security;
alter table public.tts_history enable row level security;
alter table public.tts_backups enable row level security;

do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename like 'tts\_%' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy tts_sessions_own on public.tts_sessions for select to authenticated using (uid = auth.uid());
-- tts_settings: brak polityk — dostęp wyłącznie przez funkcje.

create policy tts_t_supervisor on public.tts_tournaments for all to authenticated
  using (public.tts_is_supervisor()) with check (public.tts_is_supervisor());
create policy tts_t_judge_read on public.tts_tournaments for select to authenticated
  using (id = public.tts_judge_tournament() and status <> 'draft');

create policy tts_tp_supervisor on public.tts_tournament_private for all to authenticated
  using (public.tts_is_supervisor()) with check (public.tts_is_supervisor());

create policy tts_codes_supervisor on public.tts_judge_codes for all to authenticated
  using (public.tts_is_supervisor()) with check (public.tts_is_supervisor());

create policy tts_e_supervisor_read on public.tts_entries for select to authenticated using (public.tts_is_supervisor());
create policy tts_e_supervisor_delete on public.tts_entries for delete to authenticated using (public.tts_is_supervisor());
create policy tts_e_judge_read on public.tts_entries for select to authenticated
  using (tournament_id = public.tts_judge_tournament() and judge_id = public.tts_judge_id());
create policy tts_e_judge_insert on public.tts_entries for insert to authenticated
  with check (tournament_id = public.tts_judge_tournament() and judge_id = public.tts_judge_id());
create policy tts_e_judge_update on public.tts_entries for update to authenticated
  using (tournament_id = public.tts_judge_tournament() and judge_id = public.tts_judge_id())
  with check (tournament_id = public.tts_judge_tournament() and judge_id = public.tts_judge_id());

create policy tts_h_supervisor_read on public.tts_history for select to authenticated using (public.tts_is_supervisor());
create policy tts_h_supervisor_delete on public.tts_history for delete to authenticated using (public.tts_is_supervisor());
create policy tts_h_judge_insert on public.tts_history for insert to authenticated
  with check (tournament_id = public.tts_judge_tournament() and judge_id = public.tts_judge_id());

-- tts_backups: brak polityk — lista, pobieranie i przywracanie przez funkcje supervisora.

-- ------------------------------------------------------------ wyzwalacze ----

-- Sędzia może zapisywać tylko w otwartym turnieju; po zakończeniu wolno mu jeszcze edytować feedback.
create or replace function public.tts_entries_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  if exists (select 1 from tts_sessions where uid = auth.uid() and role = 'judge') then
    select status into st from tts_tournaments where id = new.tournament_id;
    if st is null or st = 'draft' then
      raise exception 'Turniej nie jest otwarty dla sędziów' using errcode = 'P0001';
    end if;
    if st = 'closed' then
      if tg_op = 'INSERT' then
        if new.v <> '{}'::jsonb or new.n <> '{}'::jsonb or new.ni <> '{}'::jsonb then
          raise exception 'Turniej jest zakończony — karty są zablokowane' using errcode = 'P0001';
        end if;
      elsif new.v is distinct from old.v or new.n is distinct from old.n or new.ni is distinct from old.ni then
        raise exception 'Turniej jest zakończony — karty są zablokowane' using errcode = 'P0001';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tts_entries_guard on public.tts_entries;
create trigger tts_entries_guard before insert or update on public.tts_entries
  for each row execute function public.tts_entries_guard();

create or replace function public.tts_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists tts_tournaments_touch on public.tts_tournaments;
create trigger tts_tournaments_touch before update on public.tts_tournaments
  for each row execute function public.tts_touch();
drop trigger if exists tts_private_touch on public.tts_tournament_private;
create trigger tts_private_touch before update on public.tts_tournament_private
  for each row execute function public.tts_touch();

-- Zmiana albo usunięcie kodu sędziego wylogowuje urządzenie, które było nim zalogowane.
create or replace function public.tts_codes_kick() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or new.code is distinct from old.code then
    delete from tts_sessions where role = 'judge' and tournament_id = old.tournament_id and judge_id = old.judge_id;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists tts_codes_kick on public.tts_judge_codes;
create trigger tts_codes_kick after update or delete on public.tts_judge_codes
  for each row execute function public.tts_codes_kick();

-- -------------------------------------------------------------- logowanie ----

create or replace function public.tts_login_supervisor(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if auth.uid() is null then raise exception 'Brak sesji urządzenia' using errcode = 'P0001'; end if;
  select value into h from tts_settings where key = 'supervisor_code_hash';
  if h is null then
    raise exception 'Administrator nie nadał jeszcze kodu supervisora' using errcode = 'P0001';
  end if;
  if crypt(coalesce(p_code, ''), h) <> h then
    perform pg_sleep(1.5);
    raise exception 'Nieprawidłowy kod supervisora' using errcode = 'P0001';
  end if;
  insert into tts_sessions (uid, role) values (auth.uid(), 'supervisor')
    on conflict (uid) do update set role = 'supervisor', tournament_id = null, judge_id = null, created_at = now();
  return public.tts_whoami();
end $$;

create or replace function public.tts_login_judge(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'Brak sesji urządzenia' using errcode = 'P0001'; end if;
  select c.tournament_id, c.judge_id, t.status into r
    from tts_judge_codes c join tts_tournaments t on t.id = c.tournament_id
   where c.code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then
    perform pg_sleep(1.5);
    raise exception 'Nie znaleziono sędziego z takim kodem. Sprawdź kod na kartce od supervisora.' using errcode = 'P0001';
  end if;
  if r.status = 'draft' then
    raise exception 'Ten turniej nie został jeszcze otwarty przez supervisora.' using errcode = 'P0001';
  end if;
  insert into tts_sessions (uid, role, tournament_id, judge_id) values (auth.uid(), 'judge', r.tournament_id, r.judge_id)
    on conflict (uid) do update set role = 'judge', tournament_id = excluded.tournament_id, judge_id = excluded.judge_id, created_at = now();
  return public.tts_whoami();
end $$;

create or replace function public.tts_whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'role', s.role,
    'tournamentId', s.tournament_id,
    'judgeId', s.judge_id,
    'codeSetBy', (select value from tts_settings where key = 'supervisor_code_set_by'),
    'codeChangedAt', (select value from tts_settings where key = 'supervisor_code_changed_at')
  )
  from tts_sessions s where s.uid = auth.uid();
$$;

create or replace function public.tts_logout() returns void
language sql security definer set search_path = public as $$
  delete from tts_sessions where uid = auth.uid();
$$;

create or replace function public.tts_change_supervisor_code(p_old text, p_new text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if not exists (select 1 from tts_sessions where uid = auth.uid() and role = 'supervisor') then
    raise exception 'Brak uprawnień' using errcode = 'P0001';
  end if;
  select value into h from tts_settings where key = 'supervisor_code_hash';
  if h is null or crypt(coalesce(p_old, ''), h) <> h then
    perform pg_sleep(1);
    raise exception 'Obecny kod jest nieprawidłowy' using errcode = 'P0001';
  end if;
  if length(coalesce(p_new, '')) < 8 then
    raise exception 'Nowy kod musi mieć co najmniej 8 znaków' using errcode = 'P0001';
  end if;
  if p_new = p_old then
    raise exception 'Nowy kod musi być inny niż obecny' using errcode = 'P0001';
  end if;
  insert into tts_settings (key, value) values
    ('supervisor_code_hash', crypt(p_new, gen_salt('bf', 10))),
    ('supervisor_code_set_by', 'supervisor'),
    ('supervisor_code_changed_at', to_char(now() at time zone 'Europe/Warsaw', 'YYYY-MM-DD"T"HH24:MI:SS'))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  -- wszystkie inne urządzenia zalogowane jako supervisor (w tym administratora) zostają wylogowane
  delete from tts_sessions where role = 'supervisor' and uid <> auth.uid();
  return public.tts_whoami();
end $$;

-- Przekazanie dostępu po turnieju: supervisor ustawia kod dla następcy (przekazywany przez organizatora).
-- Z takim kodem — jak z kodem administratora — nie widać danych; następca musi ustawić własny kod.
-- Przed przekazaniem zapisuje się kopia zapasowa, a wszyscy supervisorzy zostają wylogowani.
create or replace function public.tts_handover_code(p_current text, p_new text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  if not public.tts_is_supervisor() then raise exception 'Brak uprawnień' using errcode = 'P0001'; end if;
  select value into h from tts_settings where key = 'supervisor_code_hash';
  if h is null or crypt(coalesce(p_current, ''), h) <> h then
    perform pg_sleep(1);
    raise exception 'Obecny kod jest nieprawidłowy' using errcode = 'P0001';
  end if;
  if length(coalesce(p_new, '')) < 8 then
    raise exception 'Kod do przekazania musi mieć co najmniej 8 znaków' using errcode = 'P0001';
  end if;
  if p_new = p_current then
    raise exception 'Kod do przekazania musi być inny niż Twój obecny kod' using errcode = 'P0001';
  end if;
  perform public.tts_backup('manual');
  insert into tts_settings (key, value) values
    ('supervisor_code_hash', crypt(p_new, gen_salt('bf', 10))),
    ('supervisor_code_set_by', 'handover'),
    ('supervisor_code_changed_at', to_char(now() at time zone 'Europe/Warsaw', 'YYYY-MM-DD"T"HH24:MI:SS'))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  delete from tts_sessions where role = 'supervisor';
  return 'Dostęp przekazany';
end $$;

-- Tylko dla administratora (SQL Editor). Ustawia lub resetuje kod supervisora i wylogowuje wszystkich supervisorów.
create or replace function public.tts_admin_set_supervisor_code(p_code text) returns text
language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p_code, '')) < 8 then raise exception 'Kod musi mieć co najmniej 8 znaków'; end if;
  insert into tts_settings (key, value) values
    ('supervisor_code_hash', crypt(p_code, gen_salt('bf', 10))),
    ('supervisor_code_set_by', 'admin'),
    ('supervisor_code_changed_at', to_char(now() at time zone 'Europe/Warsaw', 'YYYY-MM-DD"T"HH24:MI:SS'))
  on conflict (key) do update set value = excluded.value, updated_at = now();
  delete from tts_sessions where role = 'supervisor';
  return 'Kod supervisora ustawiony. Przy pierwszym logowaniu supervisor musi zmienić go na własny.';
end $$;

-- --------------------------------------------------------- kopie zapasowe ----

create or replace function public.tts_snapshot() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'format', 'tts-backup-1',
    'createdAt', now(),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'status', t.status, 'data', t.data,
        'private', coalesce(p.data, '{}'::jsonb),
        'codes', coalesce((select jsonb_object_agg(c.judge_id, c.code) from tts_judge_codes c where c.tournament_id = t.id), '{}'::jsonb)
      ) order by t.created_at)
      from tts_tournaments t left join tts_tournament_private p on p.tournament_id = t.id
    ), '[]'::jsonb),
    'entries', coalesce((select jsonb_agg(to_jsonb(e)) from tts_entries e), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(to_jsonb(h) order by h.id) from tts_history h), '[]'::jsonb)
  );
$$;

-- Kopia całej bazy. Automatyczna (co godzinę o :30) pomija się, gdy nic się nie zmieniło.
create or replace function public.tts_backup(p_kind text default 'auto') returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare d jsonb; h text; last_hash text; new_id bigint;
begin
  d := public.tts_snapshot();
  if jsonb_array_length(d -> 'tournaments') = 0 then return null; end if;
  h := md5((d - 'createdAt')::text);
  select hash into last_hash from tts_backups order by id desc limit 1;
  if p_kind = 'auto' and last_hash = h then return null; end if;
  insert into tts_backups (kind, hash, size_bytes, data) values (p_kind, h, octet_length(d::text), d) returning id into new_id;
  -- automatyczne trzymamy przez tydzień (168 godzin), ręczne i sprzed przywrócenia — wszystkie
  delete from tts_backups where kind = 'auto' and id not in (select id from tts_backups where kind = 'auto' order by id desc limit 168);
  return new_id;
end $$;

create or replace function public.tts_make_backup() returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if not public.tts_is_supervisor() then raise exception 'Brak uprawnień' using errcode = 'P0001'; end if;
  return public.tts_backup('manual');
end $$;

create or replace function public.tts_list_backups()
returns table (id bigint, created_at timestamptz, kind text, size_bytes integer, tournaments integer, entries integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.tts_is_supervisor() then raise exception 'Brak uprawnień' using errcode = 'P0001'; end if;
  return query
    select b.id, b.created_at, b.kind, b.size_bytes,
           jsonb_array_length(b.data -> 'tournaments'), jsonb_array_length(b.data -> 'entries')
      from tts_backups b order by b.id desc limit 200;
end $$;

create or replace function public.tts_get_backup(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d jsonb;
begin
  if not public.tts_is_supervisor() then raise exception 'Brak uprawnień' using errcode = 'P0001'; end if;
  select data into d from tts_backups where id = p_id;
  return d;
end $$;

-- Przywraca stan z kopii (najpierw zapisuje kopię bieżącego stanu jako „before-restore”).
create or replace function public.tts_restore_core(d jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t jsonb; k text; v text; n_t int := 0;
begin
  if d is null or d ->> 'format' is distinct from 'tts-backup-1' then
    raise exception 'To nie jest kopia zapasowa systemu sędziowskiego' using errcode = 'P0001';
  end if;
  perform public.tts_backup('before-restore');
  delete from tts_tournaments;  -- kaskadowo: część prywatna, kody, karty, historia
  for t in select * from jsonb_array_elements(d -> 'tournaments') loop
    insert into tts_tournaments (id, status, data) values (t ->> 'id', coalesce(t ->> 'status', 'draft'), coalesce(t -> 'data', '{}'::jsonb));
    insert into tts_tournament_private (tournament_id, data) values (t ->> 'id', coalesce(t -> 'private', '{}'::jsonb));
    for k, v in select * from jsonb_each_text(coalesce(t -> 'codes', '{}'::jsonb)) loop
      if v is not null and v <> '' then
        insert into tts_judge_codes (tournament_id, judge_id, code) values (t ->> 'id', k, v) on conflict do nothing;
      end if;
    end loop;
    n_t := n_t + 1;
  end loop;
  insert into tts_entries (tournament_id, disc, contestant_id, judge_id, v, n, ni, fb, updated_at)
    select e.tournament_id, e.disc, e.contestant_id, e.judge_id, coalesce(e.v, '{}'), coalesce(e.n, '{}'), coalesce(e.ni, '{}'), e.fb, coalesce(e.updated_at, now())
      from jsonb_populate_recordset(null::tts_entries, coalesce(d -> 'entries', '[]'::jsonb)) e
     where exists (select 1 from tts_tournaments x where x.id = e.tournament_id);
  insert into tts_history (id, tournament_id, ts, judge_id, contestant_id, disc, item_id, f, t)
    select h.id, h.tournament_id, h.ts, h.judge_id, h.contestant_id, h.disc, h.item_id, h.f, h.t
      from jsonb_populate_recordset(null::tts_history, coalesce(d -> 'history', '[]'::jsonb)) h
     where exists (select 1 from tts_tournaments x where x.id = h.tournament_id);
  perform setval(pg_get_serial_sequence('public.tts_history', 'id'), greatest(coalesce((select max(id) from tts_history), 0), 1));
  return jsonb_build_object('tournaments', n_t);
end $$;

create or replace function public.tts_restore_backup(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.tts_is_supervisor() then raise exception 'Brak uprawnień' using errcode = 'P0001'; end if;
  return public.tts_restore_core((select data from tts_backups where id = p_id));
end $$;

create or replace function public.tts_restore_snapshot(p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.tts_is_supervisor() then raise exception 'Brak uprawnień' using errcode = 'P0001'; end if;
  return public.tts_restore_core(p_data);
end $$;

-- ------------------------------------------------------------- uprawnienia ----
-- Jawne uprawnienia (projekt może mieć wyłączone automatyczne udostępnianie tabel).
-- Niezalogowani (anon) nie dostają niczego; zalogowane urządzenia — tylko to, na co pozwalają polityki RLS.

grant usage on schema public to authenticated;
revoke all on public.tts_sessions, public.tts_settings, public.tts_tournaments, public.tts_tournament_private,
  public.tts_judge_codes, public.tts_entries, public.tts_history, public.tts_backups from anon;
revoke all on public.tts_settings, public.tts_backups from authenticated;
grant select on public.tts_sessions to authenticated;
grant select, insert, update, delete on public.tts_tournaments, public.tts_tournament_private,
  public.tts_judge_codes, public.tts_entries, public.tts_history to authenticated;
grant usage, select on sequence public.tts_history_id_seq to authenticated;

revoke execute on all functions in schema public from anon;
grant execute on function
  public.tts_is_supervisor(), public.tts_judge_tournament(), public.tts_judge_id(), public.tts_whoami(),
  public.tts_login_supervisor(text), public.tts_login_judge(text), public.tts_logout(),
  public.tts_change_supervisor_code(text, text), public.tts_handover_code(text, text), public.tts_make_backup(), public.tts_list_backups(),
  public.tts_get_backup(bigint), public.tts_restore_backup(bigint), public.tts_restore_snapshot(jsonb)
  to authenticated;

revoke execute on function public.tts_admin_set_supervisor_code(text) from public, anon, authenticated;
revoke execute on function public.tts_backup(text) from public, anon, authenticated;
revoke execute on function public.tts_snapshot() from public, anon, authenticated;
revoke execute on function public.tts_restore_core(jsonb) from public, anon, authenticated;
revoke execute on function public.tts_entries_guard() from public, anon, authenticated;
revoke execute on function public.tts_codes_kick() from public, anon, authenticated;

-- --------------------------------------------------- automatyczne kopie ----

do $$
begin
  if exists (select 1 from cron.job where jobname = 'tts-backup') then
    perform cron.unschedule('tts-backup');
  end if;
  perform cron.schedule('tts-backup', '30 * * * *', 'select public.tts_backup(''auto'')');
end $$;

-- ------------------------------------------------------------ czas rzeczywisty ----

do $$
declare tbl text;
begin
  foreach tbl in array array['tts_tournaments', 'tts_tournament_private', 'tts_entries', 'tts_history', 'tts_judge_codes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Gotowe. Następny krok (administrator): nadaj pierwszy kod supervisora, np.
--   select public.tts_admin_set_supervisor_code('TU-WPISZ-KOD');
