-- ═══════════════════════════════════════════════════════════════════════════
--  aufguss.world — wielojęzyczność (migracja 0003)
--
--  Dwie ścieżki, świadomie różne:
--   1. TREŚĆ KURATOROWANA (obiekty, wydarzenia, turnieje, wpisy, szkolenia)
--      — tłumaczona Z GÓRY do tabel tłumaczeń. Musi być poprawna, ma być
--        indeksowana przez wyszukiwarki, zmienia się rzadko.
--   2. TREŚĆ UŻYTKOWNIKÓW (komentarze) — tłumaczona NA ŻĄDANIE i zapamiętywana
--      w pamięci podręcznej. Nieograniczona objętość, jakość mniej krytyczna.
--      Model z Booking: „Pokaż oryginał / Przetłumacz".
--
--  Nazwy własne (obiektów, osób) NIE SĄ tłumaczone — zgodnie z zasadą portalu.
--  Tłumaczymy: opisy, miasta, tytuły wydarzeń, treść wpisów.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── JĘZYKI PORTALU ──────────────────────────────────────────────────────────
create table public.locales (
  code        text primary key,              -- BCP-47, np. 'pl', 'en', 'cs'
  name_native text not null,                 -- nazwa w danym języku (dla przełącznika)
  name_en     text not null,
  is_active   boolean not null default false,-- widoczny w portalu
  is_default  boolean not null default false,
  fallback    text references public.locales(code),  -- łańcuch zapasowy
  position    integer not null default 100
);
create unique index locales_one_default on public.locales (is_default) where is_default;

insert into public.locales (code, name_native, name_en, is_active, is_default, fallback, position) values
  ('pl','Polski',     'Polish',    true,  true,  null, 10),
  ('en','English',    'English',   true,  false, null, 20),   -- en jest końcem łańcucha
  ('de','Deutsch',    'German',    true,  false, 'en', 30),
  ('cs','Čeština',    'Czech',     true,  false, 'en', 40),
  ('nl','Nederlands', 'Dutch',     true,  false, 'en', 50),
  ('it','Italiano',   'Italian',   true,  false, 'en', 60),
  -- druga fala — wgrane, ale wyłączone do czasu uzupełnienia tłumaczeń
  ('hu','Magyar',     'Hungarian', false, false, 'en', 70),
  ('fr','Français',   'French',    false, false, 'en', 80),
  ('fi','Suomi',      'Finnish',   false, false, 'en', 90),
  ('no','Norsk',      'Norwegian', false, false, 'en', 100),
  ('da','Dansk',      'Danish',    false, false, 'en', 110),
  ('lt','Lietuvių',   'Lithuanian',false, false, 'en', 120),
  ('lv','Latviešu',   'Latvian',   false, false, 'en', 130),
  ('et','Eesti',      'Estonian',  false, false, 'en', 140),
  -- kraje, w których MAMY obiekty, a nie było ich w planie językowym
  ('sk','Slovenčina', 'Slovak',    false, false, 'cs', 150),
  ('ro','Română',     'Romanian',  false, false, 'en', 160);

-- ── KRAJE ───────────────────────────────────────────────────────────────────
-- Dotąd `venues.country` trzymał WOLNY TEKST PO POLSKU ('Niemcy'). Przy 14 językach
-- to nie do utrzymania — nazwa kraju musi być słownikiem, a nie polem tekstowym.
create table public.countries (
  code       text primary key,               -- ISO 3166-1 alpha-2, małymi (zgodne z country_code)
  name_en    text not null
);

create table public.country_translations (
  country_code text not null references public.countries(code) on delete cascade,
  locale       text not null references public.locales(code) on delete cascade,
  name         text not null,
  primary key (country_code, locale)
);

-- Kraje wynikające z obecnych danych + tłumaczenia PL/EN (reszta przez agentów).
insert into public.countries (code, name_en) values
  ('pl','Poland'),('de','Germany'),('nl','Netherlands'),('cz','Czechia'),('it','Italy'),
  ('be','Belgium'),('at','Austria'),('ch','Switzerland'),('sk','Slovakia'),('hu','Hungary'),
  ('ro','Romania'),('no','Norway'),('fi','Finland'),('dk','Denmark'),('fr','France'),
  ('se','Sweden'),('gb','United Kingdom'),('lt','Lithuania'),('lv','Latvia'),('ee','Estonia')
on conflict do nothing;

insert into public.country_translations (country_code, locale, name) values
  ('pl','pl','Polska'),('de','pl','Niemcy'),('nl','pl','Holandia'),('cz','pl','Czechy'),
  ('it','pl','Włochy'),('be','pl','Belgia'),('at','pl','Austria'),('ch','pl','Szwajcaria'),
  ('sk','pl','Słowacja'),('hu','pl','Węgry'),('ro','pl','Rumunia'),('no','pl','Norwegia'),
  ('fi','pl','Finlandia'),('dk','pl','Dania'),('fr','pl','Francja'),('se','pl','Szwecja'),
  ('gb','pl','Wielka Brytania'),('lt','pl','Litwa'),('lv','pl','Łotwa'),('ee','pl','Estonia')
on conflict do nothing;
insert into public.country_translations (country_code, locale, name)
  select code, 'en', name_en from public.countries on conflict do nothing;

-- Obiekty wskazują kraj kodem; polska nazwa przestaje być źródłem prawdy.
alter table public.venues
  add constraint venues_country_fk foreign key (country_code) references public.countries(code);
comment on column public.venues.country is
  'Historyczna nazwa po polsku z prototypu. Źródłem prawdy jest country_code + country_translations.';

-- ── STATUS TŁUMACZENIA ──────────────────────────────────────────────────────
create type translation_status as enum ('machine','reviewed','human');
comment on type translation_status is
  'machine = wynik agenta AI; reviewed = sprawdzone przez człowieka; human = tłumaczone ręcznie.';

-- Język, w którym treść powstała (z niego tłumaczą agenci).
alter table public.venues       add column source_locale text references public.locales(code) default 'pl';
alter table public.events       add column source_locale text references public.locales(code) default 'pl';
alter table public.tournaments  add column source_locale text references public.locales(code) default 'pl';
alter table public.posts        add column source_locale text references public.locales(code) default 'pl';
alter table public.trainings    add column source_locale text references public.locales(code) default 'pl';
alter table public.comments     add column source_locale text references public.locales(code) default 'pl';

-- ── TŁUMACZENIA TREŚCI KURATOROWANEJ ────────────────────────────────────────
-- source_hash: skrót tekstu źródłowego z chwili tłumaczenia. Gdy oryginał się
-- zmieni, skrót przestaje pasować → tłumaczenie jest NIEAKTUALNE i wraca do kolejki.

create table public.venue_translations (
  venue_id    bigint not null references public.venues(id) on delete cascade,
  locale      text   not null references public.locales(code) on delete cascade,
  city        text,                          -- Warszawa / Warsaw / Warschau
  description text,
  status      translation_status not null default 'machine',
  source_hash text,
  translated_by text,                        -- 'ai:<model>' albo uuid redaktora
  translated_at timestamptz not null default now(),
  primary key (venue_id, locale)
);
-- NAZWA obiektu celowo poza tabelą: nazwa własna się nie tłumaczy.

create table public.event_translations (
  event_id    bigint not null references public.events(id) on delete cascade,
  locale      text   not null references public.locales(code) on delete cascade,
  title       text,
  description text,
  status      translation_status not null default 'machine',
  source_hash text,
  translated_by text,
  translated_at timestamptz not null default now(),
  primary key (event_id, locale)
);

create table public.tournament_translations (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  locale        text   not null references public.locales(code) on delete cascade,
  tagline       text,
  status        translation_status not null default 'machine',
  source_hash   text,
  translated_by text,
  translated_at timestamptz not null default now(),
  primary key (tournament_id, locale)
);

create table public.post_translations (
  post_id     bigint not null references public.posts(id) on delete cascade,
  locale      text   not null references public.locales(code) on delete cascade,
  title       text,
  lead        text,
  body        jsonb,                         -- dokument ProseMirror, ta sama struktura co oryginał
  status      translation_status not null default 'machine',
  source_hash text,
  translated_by text,
  translated_at timestamptz not null default now(),
  primary key (post_id, locale)
);

create table public.training_translations (
  training_id bigint not null references public.trainings(id) on delete cascade,
  locale      text   not null references public.locales(code) on delete cascade,
  title       text,
  description text,
  status      translation_status not null default 'machine',
  source_hash text,
  translated_by text,
  translated_at timestamptz not null default now(),
  primary key (training_id, locale)
);

-- ── TŁUMACZENIA TREŚCI UŻYTKOWNIKÓW (na żądanie, z pamięcią podręczną) ──────
-- Komentarzy i opinii NIE tłumaczymy z góry: jest ich nieograniczenie wiele,
-- a większość nikt nigdy nie przeczyta w obcym języku. Pierwszy czytelnik
-- uruchamia tłumaczenie, kolejni dostają je z bazy.
create table public.ugc_translations (
  source_kind   text   not null,             -- 'comment'
  source_id     bigint not null,
  locale        text   not null references public.locales(code) on delete cascade,
  text          text   not null,
  engine        text,                        -- model, który tłumaczył
  source_hash   text,
  created_at    timestamptz not null default now(),
  primary key (source_kind, source_id, locale)
);
comment on table public.ugc_translations is
  'Pamięć podręczna tłumaczeń treści użytkowników. Wypełniana leniwie, model „Pokaż oryginał".';

-- ── KOLEJKA PRACY DLA AGENTÓW AI ────────────────────────────────────────────
-- Czego brakuje albo co się zdezaktualizowało. Agent czyta ten widok, tłumaczy,
-- zapisuje wynik ze statusem 'machine'; redaktor może podnieść do 'reviewed'.
create or replace view public.translation_queue as
  select 'venue' as kind, v.id, l.code as locale, v.source_locale,
         (t.venue_id is null) as missing,
         (t.source_hash is distinct from md5(coalesce(v.description,''))) as stale
  from public.venues v
  cross join public.locales l
  left join public.venue_translations t on t.venue_id = v.id and t.locale = l.code
  where l.is_active and l.code <> v.source_locale and v.status = 'published'
    and (t.venue_id is null or t.source_hash is distinct from md5(coalesce(v.description,'')))
union all
  select 'event', e.id, l.code, e.source_locale,
         (t.event_id is null),
         (t.source_hash is distinct from md5(coalesce(e.title,'') || coalesce(e.description,'')))
  from public.events e
  cross join public.locales l
  left join public.event_translations t on t.event_id = e.id and t.locale = l.code
  where l.is_active and l.code <> e.source_locale and e.status = 'published'
    and (t.event_id is null or t.source_hash is distinct from md5(coalesce(e.title,'') || coalesce(e.description,'')))
union all
  select 'post', p.id, l.code, p.source_locale,
         (t.post_id is null),
         (t.source_hash is distinct from md5(coalesce(p.title,'') || coalesce(p.lead,'') || p.body::text))
  from public.posts p
  cross join public.locales l
  left join public.post_translations t on t.post_id = p.id and t.locale = l.code
  where l.is_active and l.code <> p.source_locale and p.status = 'published'
    and (t.post_id is null or t.source_hash is distinct from md5(coalesce(p.title,'') || coalesce(p.lead,'') || p.body::text));

-- ── ODCZYT Z ŁAŃCUCHEM ZAPASOWYM ────────────────────────────────────────────
-- Czytelnik NIGDY nie widzi pustego pola: brak estońskiego → angielski → oryginał.
create or replace function public.venues_l10n(p_locale text)
returns table (
  id bigint, slug text, name text, city text, description text,
  country_code text, country text, lat double precision, lng double precision,
  website text, translation_status translation_status
)
language sql stable as $$
  select v.id, v.slug, v.name,
         coalesce(t.city, fb.city, v.city),
         coalesce(t.description, fb.description, v.description),
         v.country_code,
         coalesce(ct.name, ct_en.name, v.country),
         v.lat, v.lng, v.website,
         t.status
  from public.venues v
  left join public.locales  l   on l.code = p_locale
  left join public.venue_translations t  on t.venue_id = v.id and t.locale = p_locale
  left join public.venue_translations fb on fb.venue_id = v.id and fb.locale = l.fallback
  left join public.country_translations ct    on ct.country_code = v.country_code and ct.locale = p_locale
  left join public.country_translations ct_en on ct_en.country_code = v.country_code and ct_en.locale = 'en'
  where v.status = 'published';
$$;

-- ── PRZEJĘCIE WIZYTÓWKI („to mój obiekt") ───────────────────────────────────
-- Portal jest żywym organizmem: obiekty powstają i znikają. Obiekt spoza bazy
-- może zgłosić właściciel, a obiekt roboczy — przejąć.
alter table public.role_requests
  add column contact_email text,
  add column contact_phone text,
  add column proposed_name text,             -- gdy obiektu NIE MA jeszcze w bazie
  add column proposed_city text,
  add column proposed_country_code text references public.countries(code),
  add column proposed_website text;

comment on column public.role_requests.proposed_name is
  'Wypełniane, gdy zgłaszający chce dodać obiekt nieobecny w bazie. Gdy przejmuje istniejący — używa venue_id.';

-- Obiekt jest „do przejęcia", gdy nikt nim jeszcze nie zarządza.
create or replace view public.claimable_venues as
  select v.id, v.slug, v.name, v.city, v.country_code, v.status
  from public.venues v
  where not exists (select 1 from public.venue_members m where m.venue_id = v.id);

-- ── RLS DLA NOWYCH TABEL ────────────────────────────────────────────────────
alter table public.locales               enable row level security;
alter table public.countries             enable row level security;
alter table public.country_translations  enable row level security;
alter table public.venue_translations    enable row level security;
alter table public.event_translations    enable row level security;
alter table public.tournament_translations enable row level security;
alter table public.post_translations     enable row level security;
alter table public.training_translations enable row level security;
alter table public.ugc_translations      enable row level security;

-- Słowniki czyta każdy; zmienia wyłącznie administrator.
create policy loc_read  on public.locales for select using (true);
create policy loc_write on public.locales for all using (public.is_admin()) with check (public.is_admin());
create policy cty_read  on public.countries for select using (true);
create policy cty_write on public.countries for all using (public.is_admin()) with check (public.is_admin());
create policy ctt_read  on public.country_translations for select using (true);
create policy ctt_write on public.country_translations for all using (public.is_admin()) with check (public.is_admin());

-- Tłumaczenia czyta każdy; zapisuje właściciel treści albo administrator
-- (agent AI działa kluczem serwisowym, który i tak omija RLS).
create policy vt_read  on public.venue_translations for select using (true);
create policy vt_write on public.venue_translations for all
  using (public.manages_venue(venue_id)) with check (public.manages_venue(venue_id));

create policy et_read  on public.event_translations for select using (true);
create policy et_write on public.event_translations for all
  using (exists (select 1 from public.events e where e.id = event_id and public.manages_venue(e.venue_id)))
  with check (exists (select 1 from public.events e where e.id = event_id and public.manages_venue(e.venue_id)));

create policy tt_read  on public.tournament_translations for select using (true);
create policy tt_write on public.tournament_translations for all
  using (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.organizer_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.organizer_id = auth.uid() or public.is_admin())));

create policy pt_read  on public.post_translations for select using (true);
create policy pt_write on public.post_translations for all
  using (exists (select 1 from public.posts p where p.id = post_id
                 and (p.author_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.posts p where p.id = post_id
                 and (p.author_id = auth.uid() or public.is_admin())));

create policy trt_read  on public.training_translations for select using (true);
create policy trt_write on public.training_translations for all
  using (exists (select 1 from public.trainings t where t.id = training_id and public.is_saunamaster(t.saunamaster_id)))
  with check (exists (select 1 from public.trainings t where t.id = training_id and public.is_saunamaster(t.saunamaster_id)));

-- Pamięć podręczna tłumaczeń UGC: czyta każdy, zapisuje warstwa serwerowa.
create policy ugc_read  on public.ugc_translations for select using (true);
create policy ugc_write on public.ugc_translations for all
  using (public.is_admin()) with check (public.is_admin());
