# Supabase setup (SMOAC)

## Map dashboard keys → `.env.local`

In **Project Settings → API**:

| Supabase dashboard | `.env.local` variable |
|--------------------|----------------------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable key** (`sb_publishable_…` or legacy JWT *anon*) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Secret key** (`sb_secret_…` or legacy JWT *service_role*) | `SUPABASE_SERVICE_ROLE_KEY` |

Also set:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

For iPhone LAN testing, use your Mac IP instead of `localhost`.

## Verify connection

```bash
npm run test:supabase
```

Pass = env loaded, mock mode off, Auth + PostgREST + Postgres + Storage reachable.

## Optional: storage bucket (Phase 5)

Run SQL in the Supabase SQL editor:

`supabase/migrations/20260520000000_specialist_media_bucket.sql`

Not required for Phase 1 auth.
