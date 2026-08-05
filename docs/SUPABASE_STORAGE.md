# Supabase Storage — specialist profile media

Live when Supabase env is configured. Specialist dashboard media fields upload to the **specialist-media** bucket and persist public URLs on the profile / application.

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
| `src/components/dashboard/specialist/ProfileMediaUploadField.tsx` | UI upload → Storage when live |
| `src/types/supabase-storage.ts` | Upload options & result types |
| `supabase/migrations/*.sql` | Bucket + RLS policies |

## Local dev without Supabase

Mock URLs and picsum placeholders continue to work. `isSupabaseConfigured()` is false until `.env.local` is set; upload helpers throw `SupabaseNotConfiguredError` only when called. Without a specialist id / Storage, the field may fall back to a data URL for local preview.

## Optional follow-ups

1. Tighten RLS: `(storage.foldername(name))[1] = specialist_id` matched to auth user.
2. Normalize gallery row metadata if still partly JSON-in-profile.
