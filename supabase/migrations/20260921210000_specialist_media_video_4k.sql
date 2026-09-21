-- 45s is the product cap for profile clips, including 4K 60fps phone video.
-- 100MB rejected typical 4K 45s exports. 1GB covers Camera-app 4K.
--
-- ALSO REQUIRED (SQL cannot set this):
--   Dashboard → Project Settings → Storage → global file size limit ≥ 1GB.

update storage.buckets
set file_size_limit = 1073741824
where id = 'specialist-media';
