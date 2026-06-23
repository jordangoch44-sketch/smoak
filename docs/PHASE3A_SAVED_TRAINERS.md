# Phase 3a — Saved trainers (Supabase)

**Status:** Implemented  
**Scope:** Client shortlist hearts only — no applications, admin, pricing, or analytics.

---

## Database

**Migration:** `supabase/migrations/20260606000000_saved_trainers.sql`

```sql
saved_trainers (
  user_id uuid → auth.users(id),  -- same uuid as profiles.user_id
  specialist_id text,             -- marketplace catalog slug (e.g. marcus-chen)
  created_at timestamptz,
  primary key (user_id, specialist_id)
)
```

**RLS:** authenticated users may `SELECT` / `INSERT` / `DELETE` only where `auth.uid() = user_id`.

Apply in Supabase SQL Editor or:

```bash
npm run apply:migration -- supabase/migrations/20260606000000_saved_trainers.sql
```

Verify:

```bash
npm run test:supabase:tables
npm run test:supabase:saved
```

---

## Architecture

```
SaveTrainerButton / NavbarSavedLink / ClientDashboard
  → useSavedTrainers() (SavedTrainersContext)
  → saved-trainers-store.ts (in-memory cache + useSyncExternalStore)
      → saved-trainers-service.ts (Supabase CRUD)
      → saved-trainers-storage.ts (localStorage fallback + one-time import)
```

### Load path (signed-in client + Supabase)

1. `AuthSessionContext` restores session → store subscribes to auth changes.
2. `fetchSavedTrainerIds` loads rows for `session.userId`.
3. If legacy `localStorage` has ids for that user → `importLocalSavedTrainers` → clear local key.
4. On fetch error → fallback to localStorage cache + `savesError` message.

### Write path

`toggleSavedTrainerId` → optimistic cache update → `insertSavedTrainer` / `deleteSavedTrainer` → rollback on error.

### Dev mock (no Supabase env)

Falls back to per-user `localStorage` (`smoac_saved_specialists_${userId}`).

---

## Files changed (Phase 3a)

| File | Role |
|------|------|
| `supabase/migrations/20260606000000_saved_trainers.sql` | Table + RLS + grants |
| `src/types/database.ts` | `SavedTrainerRow` type |
| `src/lib/saved-trainers-service.ts` | Supabase fetch/insert/delete/import |
| `src/lib/saved-trainers-store.ts` | Reactive store, loading/error, toggle |
| `src/lib/saved-trainers-storage.ts` | Legacy localStorage + migration import |
| `src/lib/saved-trainers-user.ts` | Client user id + storage key helpers |
| `src/contexts/SavedTrainersContext.tsx` | `isSavesLoading`, `isSavesReady`, `savesError` |
| `src/components/trainers/SaveTrainerButton.tsx` | Disabled while loading; heart from store |
| `src/components/dashboard/ClientDashboardPageClient.tsx` | Waits for saves; count from store |
| `src/components/saved/SavedPanelContent.tsx` | Loading + error copy |
| `src/components/layout/NavbarSavedLink.tsx` | Badge from `savedCount` |
| `src/components/layout/MobileBottomNav.tsx` | Saved tab badge |
| `scripts/test-saved-trainers.mjs` | RLS + persistence acceptance test |
| `scripts/test-supabase-tables.mjs` | Probes `saved_trainers` table |

---

## Acceptance test (manual)

1. Apply migration + `npm run build && npm run start:lan`
2. Log in as **User A** (client) → save 2 specialists on Explore/profile
3. Dashboard → “2 in your shortlist”; nav badge shows 2
4. Logout → login as User A → still 2
5. Open same URL on phone (LAN) → still 2
6. Log in as **User B** → 0 saved; hearts empty
7. Unsave one as User A → count 1; refresh → still 1

---

## Not in scope (Phase 3b+)

- `admin-clients-service.ts` saved counts (still localStorage for admin mock)
- Specialist applications, catalog DB, admin meta
