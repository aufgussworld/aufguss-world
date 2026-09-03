-- ═══════════════════════════════════════════════════════════════════════════
--  aufguss.world — polityki dostępu (Row Level Security)
--  Macierz ról z panelu przetłumaczona na reguły egzekwowane przez bazę.
--  Zasada: portal czyta treści opublikowane; zapisywać może tylko właściciel
--  danego bytu albo administrator.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── FUNKCJE POMOCNICZE ──────────────────────────────────────────────────────
-- security definer + stały search_path: funkcja omija RLS na user_roles
-- (inaczej sprawdzanie roli rekurencyjnie odpytywałoby samo siebie).
create or replace function public.has_role(r app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where profile_id = auth.uid() and role = r and status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('admin');
$$;

-- Czy zalogowany zarządza danym obiektem (należy do jego zespołu)?
create or replace function public.manages_venue(v bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.venue_members
    where venue_id = v and profile_id = auth.uid()
  );
$$;

-- Czy zalogowany jest tym saunamistrzem?
create or replace function public.is_saunamaster(m bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.saunamasters where id = m and profile_id = auth.uid()
  );
$$;

-- ── WŁĄCZENIE RLS ───────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','user_roles','venues','venue_members','saunamasters',
    'saunamaster_venues','events','event_masters','tournaments','tournament_stages',
    'tournament_entries','tournament_results','trainings','posts','comments','follows','role_requests']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ── PROFILE ─────────────────────────────────────────────────────────────────
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ── ROLE ────────────────────────────────────────────────────────────────────
-- KLUCZOWE: użytkownik NIE MOŻE nadać sobie roli. Zapis wyłącznie dla admina.
create policy roles_read       on public.user_roles for select
  using (profile_id = auth.uid() or public.is_admin());
create policy roles_admin_write on public.user_roles for all
  using (public.is_admin()) with check (public.is_admin());

-- Wnioski o rolę: składa je każdy zalogowany, rozstrzyga admin.
create policy rr_read   on public.role_requests for select
  using (profile_id = auth.uid() or public.is_admin());
create policy rr_insert on public.role_requests for insert
  with check (profile_id = auth.uid() and status = 'pending');
create policy rr_admin  on public.role_requests for update
  using (public.is_admin()) with check (public.is_admin());

-- ── OBIEKTY ─────────────────────────────────────────────────────────────────
create policy venues_read on public.venues for select
  using (status = 'published' or public.manages_venue(id));
create policy venues_insert on public.venues for insert with check (public.is_admin());
create policy venues_update on public.venues for update
  using (public.manages_venue(id)) with check (public.manages_venue(id));
create policy venues_delete on public.venues for delete using (public.is_admin());

create policy vm_read  on public.venue_members for select
  using (profile_id = auth.uid() or public.manages_venue(venue_id));
create policy vm_write on public.venue_members for all
  using (public.manages_venue(venue_id)) with check (public.manages_venue(venue_id));

-- ── SAUNAMISTRZOWIE ─────────────────────────────────────────────────────────
create policy sm_read   on public.saunamasters for select
  using (status = 'published' or profile_id = auth.uid() or public.is_admin());
create policy sm_insert on public.saunamasters for insert with check (public.is_admin());
create policy sm_update on public.saunamasters for update
  using (public.is_saunamaster(id)) with check (public.is_saunamaster(id));

-- Saunamistrz sam zarządza listą swoich obiektów (jeden macierzysty pilnuje indeks).
create policy smv_read  on public.saunamaster_venues for select using (true);
create policy smv_write on public.saunamaster_venues for all
  using (public.is_saunamaster(saunamaster_id)) with check (public.is_saunamaster(saunamaster_id));

-- ── WYDARZENIA ──────────────────────────────────────────────────────────────
create policy events_read on public.events for select
  using (status = 'published' or public.manages_venue(venue_id));
create policy events_write on public.events for all
  using (public.manages_venue(venue_id)) with check (public.manages_venue(venue_id));

create policy em_read  on public.event_masters for select using (true);
create policy em_write on public.event_masters for all
  using (exists (select 1 from public.events e where e.id = event_id and public.manages_venue(e.venue_id)))
  with check (exists (select 1 from public.events e where e.id = event_id and public.manages_venue(e.venue_id)));

-- ── TURNIEJE ────────────────────────────────────────────────────────────────
create policy t_read  on public.tournaments for select
  using (status = 'published' or organizer_id = auth.uid() or public.is_admin());
create policy t_write on public.tournaments for all
  using (organizer_id = auth.uid() or public.is_admin())
  with check (organizer_id = auth.uid() or public.is_admin());

-- Etapy, zgłoszenia i wyniki dziedziczą prawa po turnieju.
create policy ts_read  on public.tournament_stages for select using (true);
create policy ts_write on public.tournament_stages for all
  using (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.organizer_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.organizer_id = auth.uid() or public.is_admin())));

create policy te_read  on public.tournament_entries for select using (true);
create policy te_write on public.tournament_entries for all
  using (exists (select 1 from public.tournament_stages s join public.tournaments t on t.id = s.tournament_id
                 where s.id = stage_id and (t.organizer_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.tournament_stages s join public.tournaments t on t.id = s.tournament_id
                 where s.id = stage_id and (t.organizer_id = auth.uid() or public.is_admin())));

create policy tr_read  on public.tournament_results for select using (true);
create policy tr_write on public.tournament_results for all
  using (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.organizer_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.tournaments t where t.id = tournament_id
                 and (t.organizer_id = auth.uid() or public.is_admin())));

-- ── SZKOLENIA ───────────────────────────────────────────────────────────────
-- Widoczne publicznie; dodaje je wyłącznie sam trener (moduł roli Szkoleniowiec).
create policy tr2_read  on public.trainings for select
  using (status = 'published' or public.is_saunamaster(saunamaster_id));
create policy tr2_write on public.trainings for all
  using (public.is_saunamaster(saunamaster_id)) with check (public.is_saunamaster(saunamaster_id));

-- ── WPISY ───────────────────────────────────────────────────────────────────
-- Czytelnik widzi tylko opublikowane; autor i zespół obiektu widzą też szkice.
create policy posts_read on public.posts for select
  using (status = 'published' or author_id = auth.uid()
         or (venue_id is not null and public.manages_venue(venue_id)) or public.is_admin());
create policy posts_insert on public.posts for insert
  with check (author_id = auth.uid() or public.is_admin());
create policy posts_update on public.posts for update
  using (author_id = auth.uid() or (venue_id is not null and public.manages_venue(venue_id)) or public.is_admin())
  with check (author_id = auth.uid() or (venue_id is not null and public.manages_venue(venue_id)) or public.is_admin());
create policy posts_delete on public.posts for delete
  using (author_id = auth.uid() or public.is_admin());

-- ── KOMENTARZE, OBSERWACJE ──────────────────────────────────────────────────
create policy c_read   on public.comments for select
  using (status = 'published' or author_id = auth.uid() or public.is_admin());
create policy c_insert on public.comments for insert with check (author_id = auth.uid());
create policy c_update on public.comments for update
  using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy c_delete on public.comments for delete
  using (author_id = auth.uid() or public.is_admin());

create policy f_all on public.follows for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
--  WIDOK: ranking obiektów blogera — liczony w bazie, nie w przeglądarce.
--  Odpowiednik logiki z blog.html (ranking z ocenionych recenzji).
-- ═══════════════════════════════════════════════════════════════════════════
create or replace view public.reviewer_rankings as
select
  p.author_id,
  p.venue_id,
  v.name        as venue_name,
  v.country,
  v.country_code,
  p.score,
  p.slug        as post_slug,
  p.lead        as note,
  rank() over (partition by p.author_id order by p.score desc, v.name) as global_rank,
  rank() over (partition by p.author_id, v.country order by p.score desc, v.name) as country_rank
from public.posts p
join public.venues v on v.id = p.venue_id
where p.category = 'Recenzja' and p.status = 'published' and p.score is not null;
