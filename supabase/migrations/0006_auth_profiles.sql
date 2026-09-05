-- ═══════════════════════════════════════════════════════════════════════════
--  aufguss.world — migracja 0006: profile z logowania Google / Facebook
--  Konta z OAuth nie mają pola display_name w metadanych — Google daje
--  full_name / name / avatar_url (picture), Facebook full_name / name / picture.
--  Wyzwalacz bierze pierwszą dostępną nazwę i zapisuje avatar.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(m->>'display_name'), ''),
      nullif(trim(m->>'full_name'), ''),
      nullif(trim(m->>'name'), ''),
      nullif(trim(m->>'preferred_username'), ''),
      split_part(coalesce(new.email, 'uzytkownik'), '@', 1)
    ),
    coalesce(nullif(m->>'avatar_url', ''), nullif(m->>'picture', ''))
  )
  on conflict (id) do nothing;
  insert into public.user_roles (profile_id, role) values (new.id, 'user')
  on conflict (profile_id, role) do nothing;
  return new;
end $$;

comment on function public.handle_new_user() is
  'Nowe konto (e-mail, Google, Facebook) dostaje profil z nazwą i avatarem z metadanych oraz rolę user.';
