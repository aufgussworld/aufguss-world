-- ═══════════════════════════════════════════════════════════════════════════
--  aufguss.world — RESET: usuwa wszystko, co tworzą migracje 0001–0005 i seed.
--  Bezpieczny do wielokrotnego uruchamiania (każde "if exists").
--  Nie rusza schematu auth ani kont użytkowników.
-- ═══════════════════════════════════════════════════════════════════════════

drop trigger if exists on_auth_user_created on auth.users;

drop view if exists
  public.claimable_venues, public.my_content_reports, public.report_rejection_watch,
  public.reporter_reputation, public.reviewer_rankings, public.translation_queue
cascade;

drop table if exists
  public.comments, public.content_reports, public.countries, public.country_translations,
  public.event_masters, public.event_translations, public.events, public.follows,
  public.locales, public.post_translations, public.posts, public.profiles,
  public.report_blocks, public.report_limits, public.role_requests,
  public.saunamaster_venues, public.saunamasters, public.tournament_entries,
  public.tournament_results, public.tournament_stages, public.tournament_translations,
  public.tournaments, public.training_translations, public.trainings,
  public.ugc_translations, public.user_roles, public.venue_members,
  public.venue_translations, public.venues
cascade;

drop function if exists
  public.autoblock_after_rejections, public.guard_content_report, public.handle_new_user,
  public.has_role, public.invalidate_translation, public.is_admin, public.is_report_blocked,
  public.is_saunamaster, public.manages_venue, public.route_content_report,
  public.touch_updated_at, public.venues_l10n
cascade;

drop type if exists
  public.app_role, public.content_status, public.cover_variant, public.event_scope,
  public.event_type, public.post_category, public.report_kind, public.report_status,
  public.role_status, public.translation_status, public.venue_member_role
cascade;
