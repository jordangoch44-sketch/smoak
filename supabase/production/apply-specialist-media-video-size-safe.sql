-- ============================================================================
-- PRODUCTION-SAFE: specialist-media 100MB videos
-- Purpose: raise the specialist-media bucket file size limit so 45s phone
--          clips (and their JPEG thumbnails) can upload. Safe to re-run.
--
-- HOW TO APPLY
--   Supabase Dashboard → SQL Editor → paste this entire file → Run
--   OR (if SUPABASE_DB_URL is set):
--     npm run apply:migration -- supabase/production/apply-specialist-media-video-size-safe.sql
--
-- ALSO CHECK
--   Dashboard → Project Settings → Storage → global file size limit ≥ 100MB.
--   A bucket limit above the project global cap still rejects the object.
-- ============================================================================

update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'application/pdf'
  ]
where id = 'specialist-media';
