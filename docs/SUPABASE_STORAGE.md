# Supabase Storage — specialist profile media

Preparation branch: `supabase-storage-setup`. **No UI changes yet** — infrastructure only.

## Media types

| Product surface | Trainer / override field | Storage kind |
|-----------------|--------------------------|--------------|
| Profile avatar | `Trainer.image`, `profilePhotoUrl` | `profile` |
| Hero cover slideshow | `Trainer.heroImage`, `coverImageUrl`, `galleryImages` | `cover` |
| Gallery stills | `Trainer.gallery` (`type: image`) | `gallery-image` |
| Gallery reels | `Trainer.gallery` (`type: video`) | `gallery-video` |
| Video poster | `TrainerMediaItem.poster` | `gallery-video-poster` |

## App modules

| Path | Role |
|------|------|
| `src/lib/supabase/client.ts` | Browser client (`createSupabaseBrowserClient`) |
| `src/lib/supabase/server.ts` | Server client for Route Handlers / RSC |
| `src/lib/supabase/storage-paths.ts` | Path builders & validation |
| `src/lib/supabase/storage.ts` | `uploadSpecialistMedia`, `removeSpecialistMedia` |
| `src/types/supabase-storage.ts` | Upload options & result types |
| `supabase/migrations/*.sql` | Bucket + RLS policies |

## Local dev without Supabase

Mock URLs and picsum placeholders continue to work. `isSupabaseConfigured()` is false until `.env.local` is set; upload helpers throw `SupabaseNotConfiguredError` only when called.

## Next steps (not in this branch)

1. Create Supabase project; run migration SQL.
2. Add `.env.local` from `.env.example`.
3. Replace `ProfileMediaUploadField` blob URLs with `uploadSpecialistMedia` + persisted public URLs.
4. Persist gallery row metadata (Supabase table or `specialist_profiles` JSON).
5. Tighten RLS: `(storage.foldername(name))[1] = specialist_id` matched to auth user.
