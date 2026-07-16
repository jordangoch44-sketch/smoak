# Phase 3 — Marketplace data: localStorage → Supabase

**Goal:** Move durable user-generated marketplace data from browser `localStorage` to Supabase tables with RLS, while keeping ephemeral UI prefs client-side where appropriate.

**Prerequisite:** Phase 2 complete (auth, `profiles`, `user_roles`).

---

## Migration order (recommended)

Migrate in dependency order so public catalog and admin flows stay consistent.

```
1. saved_trainers          (client shortlist — highest user value)
2. client_applications     (Join Now client intake)
3. specialist_applications (Join Now specialist intake + onboarding_data)
4. specialist_profiles     (approved public listings + overrides)
5. admin metadata          (visibility, featured, premium flags)
6. hidden_trainers         (moderation hide list)
```

Each step: **schema → service layer → RLS → UI hook swap → backfill script → remove localStorage store**.

---

## Inventory: localStorage today

| Key / store | Module | Phase 3 target |
|-------------|--------|----------------|
| `smoac_saved_specialists_${userId}` | `saved-trainers-storage.ts` | `saved_trainers` table |
| `smoac_pending_save` | `pending-save-storage.ts` | Server row or ephemeral session (keep client until login) |
| `smoac_client_applications` | `client-application-storage.ts` | `client_applications` |
| `smoac_specialist_applications` | `specialist-application-storage.ts` | `specialist_applications` |
| `smoac_specialist_onboarding_draft` | specialist onboarding | Column on `specialist_applications` or `profiles.onboarding_data` |
| `smoac_approved_specialist_profiles` | `approved-specialist-profiles-store.ts` | `specialist_profiles` / materialized public view |
| `smoac_specialist_profile_overrides` | `specialist-profile-store.ts` | `specialist_profiles` JSON or normalized columns |
| `smoac_hidden_specialists` | `hidden-trainers-storage.ts` | `specialist_visibility` or `hidden_trainers` |
| `smoac_admin_specialist_meta` | `admin-specialist-meta-store.ts` | `specialist_admin_meta` |
| `smoac_create_account_profile` | `create-account-profile-storage.ts` | **Remove** — data already in `profiles` after signup |
| `smoac_dev_auth` | `auth-session-storage.ts` | **Remove** when dev mock retired |
| `smoac_internal_auth` | `internal-auth-session-storage.ts` | Supabase session only |

**Keep client-side (no migration):**

| Key | Module | Reason |
|-----|--------|--------|
| `userZipCode`, geo keys | `user-location-storage.ts` | Guest UX cache; synced from `profiles.client_zip_code` on login |
| `smoac_geocoded_zip_cache` | `geocoded-zip-cache.ts` | Performance cache |
| `smoac_recent_zips` / searches | `recent-*-storage.ts` | Ephemeral UX |
| Toast / scroll / intro flags | various | UI-only |

---

## Proposed tables (sketch)

### `saved_trainers`

```sql
create table public.saved_trainers (
  user_id uuid references auth.users(id) on delete cascade,
  specialist_id text not null,  -- or uuid FK when catalog is DB-backed
  created_at timestamptz default now(),
  primary key (user_id, specialist_id)
);
-- RLS: user_id = auth.uid()
```

### `client_applications`

Align with `types/client-application.ts`. Link `user_id` after signup.

### `specialist_applications`

Align with `types/specialist-application.ts`. Status workflow: `PENDING` → `APPROVED` / `NEEDS_CHANGES`.

On approve: promote to `specialist_profiles` (public catalog row).

### `specialist_profiles`

Public marketplace listing — replaces `approved-specialist-profiles-store` + seed `data/trainers.ts` merge logic in `marketplace-public-catalog.ts`.

Consider:

- `trainer_id` (slug)
- `user_id` (owner)
- JSON `profile_data` for flexible fields during migration
- Generated columns for explore filters (city, zip, specialty)

### Admin tables

`specialist_admin_meta` (featured, top_ranked, premium_override) — service role or admin RLS.

---

## Service layer pattern

For each domain, mirror Phase 2:

```
lib/{domain}/
  {domain}-service.ts      # Supabase reads/writes (no React)
  {domain}-store.ts        # subscribe/getSnapshot (thin wrapper)
contexts/ or hooks/          # useSavedTrainers, etc.
```

**Rules:**

1. Components never call `localStorage` directly — only stores/services.
2. Stores support **optimistic update + rollback** on API error.
3. Feature-flag dual-read during migration: try Supabase → fallback localStorage → enqueue backfill.

---

## Catalog strategy

Today: `data/trainers.ts` seed + `application-to-trainer.ts` + localStorage approvals.

Phase 3 end state:

```
marketplace-public-catalog.ts
  → listPublicMarketplaceTrainers()
      → SELECT from specialist_profiles WHERE status = 'approved' AND NOT hidden
```

Seed data becomes SQL seed migration or admin-import script, not bundled TS for production.

---

## Per-feature migration checklist

### Saved trainers (Phase 3a — done)

- [x] SQL table + RLS
- [x] `lib/saved-trainers-service.ts` (Supabase)
- [x] Update `SavedTrainersProvider` to load on `session.userId`
- [x] Migrate `smoac_saved_specialists_*` on first login
- [x] QA: save heart, login gate, logout, cross-device

### Client applications (Phase 3b — done)

- [x] Table linked to `user_id`
- [x] `submitClientApplication` writes Supabase post-signup
- [x] Admin panel reads from DB (hydrate + dual-write)
- [x] localStorage kept as import/fallback bridge

### Specialist applications + onboarding (Phase 3b — done)

- [x] Table with `application_data` jsonb
- [x] Specialist wizard submit → Supabase
- [x] Onboarding draft remains local until submit
- [x] Dashboard/admin pending from hydrated store

### Public specialist profiles (Phase 3c)

- [x] Approval promotes application → `specialist_profiles`
- [x] Edit profile saves to DB (dual-write via approved store + overrides)
- [x] Explore/trainers routes read from catalog service (hydrate + seed)
- [ ] Remove `approved-specialist-profiles-store.ts` local cache (Phase 3e)

### Admin moderation

- [ ] Hidden list + meta flags in DB
- [ ] Admin services use service role or admin RLS
- [ ] Remove `hidden-trainers-storage.ts`, `admin-specialist-meta-store.ts`

---

## Backfill & rollout

1. **Script per domain** in `scripts/migrate-{domain}-to-supabase.mjs` — reads localStorage export JSON (support tool), upserts with service role.
2. **Dual-write period** (optional): write both localStorage and Supabase; read Supabase first.
3. **Cutover**: remove localStorage writes; one-time migration banner for existing users.
4. **Dev mock cleanup**: delete `dev-auth.ts` marketplace path when Supabase required everywhere.

---

## Testing matrix

| Flow | Phase 3 verify |
|------|----------------|
| Save specialist (logged in) | Row in `saved_trainers`; survives refresh |
| Saved panel / mobile nav badge | Count from DB |
| Client Join Now | Application in DB + profile row |
| Specialist onboarding | Application pending in DB |
| Admin approve | Public explore shows specialist |
| Specialist edit profile | Changes in DB, explore reflects |
| Admin hide | Specialist removed from public catalog |
| iPhone LAN | Same as desktop after login |

---

## Files to delete after Phase 3

- `lib/create-account-profile-storage.ts` (signup draft)
- `lib/client-application-storage.ts`
- `lib/specialist-application-storage.ts`
- `lib/approved-specialist-profiles-store.ts`
- `lib/specialist-profile-store.ts` (localStorage overrides)
- `lib/hidden-trainers-storage.ts`
- `lib/admin-specialist-meta-store.ts`
- Most keys in `lib/dev-storage-keys.ts`
- `data/admin-applications-seed.ts` (replace with SQL seed)

---

## Estimated effort

| Milestone | Scope |
|-----------|--------|
| **3a** | Saved trainers + pending save |
| **3b** | Client + specialist applications |
| **3c** | Public catalog + profile edits |
| **3d** | Admin moderation + seed migration |
| **3e** | Remove localStorage stores + dev mock auth |

Do not batch all migrations in one PR — ship 3a–3e as separate reviewable units.
