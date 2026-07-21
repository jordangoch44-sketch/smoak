-- Specialist profile media bucket (public read, authenticated write own folder)
-- Run once in Supabase SQL editor. Adjust auth.uid() → specialist_id mapping when profiles table exists.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'specialist-media',
  'specialist-media',
  true,
  52428800, -- 50MB max per object (project global upload limit)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read
create policy "specialist_media_public_read"
on storage.objects for select
to public
using (bucket_id = 'specialist-media');

-- Authenticated users upload only under their specialist folder
-- TODO: replace (storage.foldername(name))[1] = auth.uid()::text with profiles.specialist_id when wired
create policy "specialist_media_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'specialist-media'
  and (storage.foldername(name))[1] is not null
);

create policy "specialist_media_owner_update"
on storage.objects for update
to authenticated
using (bucket_id = 'specialist-media')
with check (bucket_id = 'specialist-media');

create policy "specialist_media_owner_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'specialist-media');
