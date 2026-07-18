-- ============================================================================
-- PRODUCTION-SAFE: Client avatars Storage bucket
-- Purpose: create the `avatars` bucket + ownership RLS used by client profile photos
--
-- HOW TO APPLY
--   Supabase Dashboard → SQL Editor → paste this entire file → Run
--   OR (if SUPABASE_DB_URL is set):
--     npm run apply:migration -- supabase/production/apply-avatars-bucket-safe.sql
--
-- Bucket path convention:
--   clients/{auth.uid()}/avatar.webp
-- ============================================================================

-- Profile columns used by client avatar flow (no-op if already present)
alter table public.profiles
  add column if not exists avatar_url text not null default '',
  add column if not exists avatar_path text not null default '',
  add column if not exists display_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists client_state text not null default '',
  add column if not exists preferred_radius_miles integer,
  add column if not exists preferred_price_min numeric,
  add column if not exists preferred_price_max numeric,
  add column if not exists preferred_professions text[] not null default '{}',
  add column if not exists preferred_specialties text[] not null default '{}',
  add column if not exists preferred_gender text not null default '',
  add column if not exists preferred_session_format text not null default '';

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
);
