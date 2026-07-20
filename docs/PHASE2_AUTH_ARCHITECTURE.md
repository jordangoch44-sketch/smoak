# Phase 2 — Auth & profiles architecture

**Status:** Complete (Supabase-backed marketplace auth)  
**Last updated:** June 2026

Phase 2 moves **identity, roles, and client profile fields** to Supabase. Marketplace catalog, saves, and applications remain in `localStorage` (Phase 3).

---

## Runtime modes

| Mode | When | Session source |
|------|------|----------------|
| **Supabase (production)** | `NEXT_PUBLIC_SUPABASE_URL` + anon key in build; `SupabaseConfigProvider` enables client | `supabase.auth` + `profiles` / `user_roles` |
| **Dev mock** | `npm run dev` without Supabase env | `localStorage` (`smoac_dev_auth`) + `lib/dev-auth.ts` credentials |

Production LAN testing (`npm run build && npm run start:lan`) always uses Supabase when env is set.

---

## Data model (Supabase)

```
auth.users
  └── public.user_roles     (client | specialist | owner_admin | staff_admin, is_premium)
  └── public.profiles       (first_name, client_zip_code, specialist fields, onboarding_data)
```

- **Role** lives only in `user_roles` — never sent on `profiles` upsert.
- **Client ZIP** lives in `profiles.client_zip_code` — not `zip_code` (optional denormalized column in migration 20260604000000).
- RLS: authenticated users read/write own rows; admins read via `is_admin()`.

Migrations: `supabase/migrations/20260603*.sql` through `20260605000000_*.sql`.

---

## Auth flow (marketplace)

```
LoginPageClient / CreateAccountWizardClient
  → useAuthSession().signInWithPassword | signUp
  → lib/auth/marketplace-auth.ts
      → supabase.auth.signInWithPassword | signUp
      → profile-service.ts (signup only): upsert user_roles + profiles
      → buildAuthSessionFromSupabaseUser()
  → auth-session-store.ts (in-memory + notify subscribers)
  → AuthSessionContext (hydrate location, onAuthStateChange)
```

### Session shape (`types/auth.ts`)

| Field | Source |
|-------|--------|
| `userId` | `auth.users.id` |
| `role` | `user_roles.role` → mapped to client/specialist/admin |
| `firstName` | `profiles.first_name` (no email-prefix fallback) |
| `clientZipCode` | `profiles.client_zip_code` |
| `clientCity` | `profiles.client_city` |
| `isPremium` | `user_roles.is_premium` |

---

## Client location (ZIP)

Signed-in clients: **`profiles.client_zip_code` is source of truth**.

```
buildAuthSessionFromSupabaseUser  →  session.clientZipCode
  → lib/client-profile-location.ts
      getEffectiveClientZip()      header + explore default filters
      getEffectiveUserCoordinates() proximity sort
      syncLocalStorageFromProfileZip()  guest cache sync (logout clears)
```

Guest users: ZIP from `user-location-storage.ts` (`userZipCode` key) via location panel.

Explore merges profile ZIP into filters via `explore-location-filters.ts` + `useExploreTrainers`.

---

## Internal (admin) portal

Separate stack — does not share marketplace session:

- Route: `/internal/login` → `InternalAuthSessionContext`
- Same Supabase user; role must be `owner_admin` or `staff_admin` in `user_roles`
- `signInAdminWithPassword` in `marketplace-auth.ts`

---

## Key files

| Area | Path |
|------|------|
| Browser auth client | `lib/supabase/client.ts` |
| Session proxy (Next 16) | `src/proxy.ts` → `lib/supabase/middleware.ts` (`updateSession`) |
| Sign-in/up/reset | `lib/auth/marketplace-auth.ts` |
| Profile DB writes | `lib/profiles/profile-service.ts` |
| Session store | `lib/auth-session-store.ts`, `contexts/AuthSessionContext.tsx` |
| Location from profile | `lib/client-profile-location.ts` |
| Dev mock credentials | `lib/dev-auth.ts` (dev-only fallback) |
| Auth logging | `lib/auth/auth-logger.ts` (dev/server only) |
| Password UI | `components/ui/PasswordInput.tsx` |
| Callback route | `app/auth/callback/route.ts` |

---

## Setup & verify

See [`docs/SUPABASE_AUTH.md`](./SUPABASE_AUTH.md) and [`docs/SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).

```bash
npm run test:supabase
npm run typecheck
npm run build && npm run start:lan
```

Manual QA: client signup with ZIP → logout → login → header ZIP + explore filters match profile.

---

## Intentionally retained (not Phase 2 dead code)

| Item | Why |
|------|-----|
| `lib/dev-auth.ts` | Fallback when Supabase env missing in `npm run dev` |
| `lib/auth-session-storage.ts` | Persists dev mock session; clears legacy keys when Supabase on |
| `lib/create-account-profile-storage.ts` | Admin QA draft of last wizard submit (Phase 3) |
| `user-location-storage.ts` | Guest ZIP + cache; synced from profile on client login |

---

## Next: Phase 3

See [`docs/PHASE3_SUPABASE_MIGRATION.md`](./PHASE3_SUPABASE_MIGRATION.md).
