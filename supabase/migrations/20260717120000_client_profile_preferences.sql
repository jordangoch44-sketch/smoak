-- Client profile preferences + dedicated avatars bucket
-- Extends public.profiles for client account editing without duplicating Auth email.

alter table public.profiles
  add column if not exists display_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists client_state text not null default '',
  add column if not exists avatar_url text not null default '',
  add column if not exists avatar_path text not null default '',
  add column if not exists preferred_radius_miles integer,
  add column if not exists preferred_price_min numeric,
  add column if not exists preferred_price_max numeric,
  add column if not exists preferred_professions text[] not null default '{}',
  add column if not exists preferred_specialties text[] not null default '{}',
  add column if not exists preferred_gender text not null default '',
  add column if not exists preferred_session_format text not null default '';

comment on column public.profiles.display_name is
  'Optional client display name for chrome/avatars. Auth email remains authoritative for login.';
comment on column public.profiles.avatar_path is
  'Stable Storage object path in avatars bucket (not a signed URL).';
comment on column public.profiles.preferred_radius_miles is
  'Preferred specialist search radius in miles. NULL means Automatic.';
comment on column public.profiles.preferred_price_min is
  'Optional preferred session price floor (USD).';
comment on column public.profiles.preferred_price_max is
  'Optional preferred session price ceiling (USD).';
comment on column public.profiles.preferred_session_format is
  'in_person | online | either | mobile | gym | home | empty';

-- Public avatars bucket (5MB images). Paths: clients/{user_id}/avatar.*
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
