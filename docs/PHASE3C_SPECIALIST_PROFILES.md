# Phase 3c — Public specialist profiles (Supabase)

**Status:** Implemented (apply migration before use)  
**Scope:** Durable public marketplace listings. Admin approve promotes to `specialist_profiles`; specialist edits dual-write; Explore reads hydrated catalog (+ seed fallback).

---

## Database

**Migration:** `supabase/migrations/20260716000000_specialist_profiles.sql`

| Table | Purpose |
|-------|---------|
| `specialist_profiles` | Public listing row (`profile_data` = full Trainer JSON, `overrides` = edit patch) |

**RLS**
- `anon` + `authenticated` can **select** rows with `status = 'approved'` (guest Explore)
- Owners (`user_id`) + `is_admin()` can select/insert/update all statuses
- Delete: admin only

Also updates `owns_marketplace_specialist()` to match `specialist_profiles.user_id` (inquiry ownership).

Apply in Supabase SQL Editor, then:

```bash
npm run test:supabase:tables
npm run test:supabase:profiles
```

---

## Architecture

```
Admin approve / activate
  → syncApprovedProfileFromApplication
  → saveApprovedSpecialistProfile (local cache + upsert specialist_profiles)

Specialist edit profile
  → saveManagedSpecialistProfileEdits
  → saveSpecialistApplication (3b) + saveTrainerProfileOverrides
  → if approved: re-merge → saveApprovedSpecialistProfile → Supabase

Explore / home / saves
  → listPublicMarketplaceTrainers()
  → seed + hydrated approved profiles (DB preferred over seed when both exist)
```

Hydrate runs on subscribe (Explore / profile hooks) and admin dashboard ready.

Local `smoac_approved_specialist_profiles` remains a cache / offline bridge (same pattern as 3b apps). Do not remove until Phase 3e.

---

## Files

| File | Role |
|------|------|
| `supabase/migrations/20260716000000_specialist_profiles.sql` | Schema + RLS |
| `src/lib/profiles/specialist-profiles-db.ts` | Row ↔ Trainer, fetch/upsert |
| `src/lib/approved-specialist-profiles-store.ts` | Hydrate + dual-write |
| `src/lib/marketplace-public-catalog.ts` | Prefer approved/DB over seed |
| `src/lib/specialist-profile-store.ts` | Overrides save also refreshes approved row |
| `src/lib/admin-applications-service.ts` | Reject/archive removes public listing |
| `scripts/test-specialist-profiles.mjs` | Smoke test |

---

## Still local (Phase 3e)

- Seed `data/trainers.ts` (demo catalog when Supabase is off)
- Ops-only admin fields: `isProtected`, `accountKind` (browser meta)

## Phase 3d (done in code — apply migration)

- Hide = `specialist_profiles.status` (`hidden` / `archived`)
- Durable flags: `featured`, `sponsored`, `top_ranked`, `is_premium`
- Local hide/meta mirrors hydrate from remote for admin UI
- Live Explore skips browser-only hide list

**Migration:** `supabase/migrations/20260723140000_specialist_profiles_admin_flags.sql`

---

## Manual QA

1. Apply migration  
2. Admin approve specialist → row in `specialist_profiles` with `status = approved`  
3. Explore (logged out) shows specialist after refresh / other device  
4. Specialist edits bio/price → Explore reflects after hydrate  
5. Reject / archive → listing leaves public catalog (`status` archived)
