-- ============================================================================
-- PRODUCTION-SAFE: specialist-media 1GB videos (45s 4K or 1080p)
-- Purpose: 45 seconds is the only clip rule. Raise the bucket so a 4K phone
--          export that length can upload the same as 1080p. Safe to re-run.
--
-- HOW TO APPLY
--   Supabase Dashboard → SQL Editor → paste this entire file → Run
--   OR (if SUPABASE_DB_URL is set):
--     npm run apply:migration -- supabase/production/apply-specialist-media-video-size-safe.sql
--
-- ALSO REQUIRED (SQL cannot set this)
--   Dashboard → Project Settings → Storage → global file size limit ≥ 1GB.
--   A bucket limit above the project global cap still rejects the object.
-- ============================================================================

update storage.buckets
set file_size_limit = 1073741824
where id = 'specialist-media';
