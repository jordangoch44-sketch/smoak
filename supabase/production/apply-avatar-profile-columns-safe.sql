-- ============================================================================
-- FIX: profiles.avatar_url / avatar_path missing on live project
-- Evidence: authenticated Storage upload to `avatars` succeeds, but
--   PATCH profiles with avatar_url returns:
--   42703 / PGRST204 — column profiles.avatar_url does not exist
--
-- HOW TO APPLY
--   Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_url text not null default '',
  add column if not exists avatar_path text not null default '';

comment on column public.profiles.avatar_url is
  'Public URL (or stable public object URL) for account avatar display';
comment on column public.profiles.avatar_path is
  'Stable Storage path in avatars bucket, e.g. clients/{user_id}/avatar.webp';

-- Ensure API roles can use the table (service_role probes + authenticated updates)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
