-- Phone profile clips are allowed up to 100MB in the app
-- (`SPECIALIST_STORAGE_LIMITS.galleryVideo`). The original bucket cap was 50MB,
-- which rejected typical 4K iPhone exports with:
--   "The object exceeded the maximum allowed size"
--
-- Also allow video/x-m4v (accepted by the specialist-video API).
--
-- If uploads still fail after this, raise the project Storage global file size
-- limit to at least 100MB (Dashboard → Project Settings → Storage).

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
