# Supabase (SMOAC)

Storage setup for specialist profile media. Run SQL in the Supabase SQL editor or via CLI after linking a project.

## Env

Copy `.env.example` → `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, optional until Route Handlers sign uploads)

## Bucket

See [`migrations/20260520000000_specialist_media_bucket.sql`](./migrations/20260520000000_specialist_media_bucket.sql).

App code: `src/lib/supabase/` — path helpers, clients, upload/remove utilities.

## Object layout (`specialist-media`)

| Kind | Path pattern |
|------|----------------|
| Profile photo | `{specialistId}/profile/{file}` |
| Cover / hero | `{specialistId}/cover/{file}` |
| Gallery image | `{specialistId}/gallery/{assetId}/image-{file}` |
| Gallery video | `{specialistId}/gallery/{assetId}/video-{file}` |
| Video poster | `{specialistId}/gallery/{assetId}/poster-{file}` |

Maps to trainer fields: `image`, `heroImage` / cover slideshow, `gallery[]` (`TrainerMediaItem`).
