# Phase 3b — Applications (Supabase)

**Status:** Implemented (apply migration before use)  
**Scope:** Client + specialist Join Now / onboarding applications. Catalog promotion, approved profiles, and hide list remain local until Phase 3c/3d.

---

## Database

**Migration:** `supabase/migrations/20260607000000_applications.sql`

| Table | Purpose |
|-------|---------|
| `client_applications` | Client questionnaire queue (`PENDING` → `ACTIVE` / `REJECTED` / `ARCHIVED`) |
| `specialist_applications` | Specialist onboarding queue + `application_data` jsonb |

**RLS:** own rows via `user_id = auth.uid()`; admins via `is_admin()`.

Passwords are **never** stored — stripped before upsert.

Apply in Supabase SQL Editor, then:

```bash
npm run test:supabase:tables
npm run test:supabase:applications
```

---

## Architecture

```
CreateAccountWizard / SpecialistOnboardingWizard
  → submitClientApplication / submitSpecialistApplication (async)
  → *-application-storage.ts (cache + localStorage bridge)
      → applications/*-applications-db.ts (Supabase upsert/fetch)
Admin dashboard
  → refresh*FromRemote on ready
  → existing approve/reject/archive services (sync cache + async upsert)
```

Onboarding drafts stay in `localStorage` until submit (`smoac_specialist_onboarding_draft`).

---

## Files

| File | Role |
|------|------|
| `supabase/migrations/20260607000000_applications.sql` | Schema + RLS |
| `src/lib/applications/client-applications-db.ts` | Client CRUD |
| `src/lib/applications/specialist-applications-db.ts` | Specialist CRUD |
| `src/lib/client-application-storage.ts` | Hydrate + dual-write |
| `src/lib/specialist-application-storage.ts` | Hydrate + dual-write |
| `src/lib/client-application-submit.ts` | Async submit |
| `src/lib/specialist-application-submit.ts` | Async submit |
| `scripts/test-applications.mjs` | RLS acceptance test |

---

Approve/activate promotes to `specialist_profiles` (Phase 3c). See [`PHASE3C_SPECIALIST_PROFILES.md`](./PHASE3C_SPECIALIST_PROFILES.md).

## Still local (Phase 3d+)

- `smoac_hidden_specialists`
- `smoac_admin_specialist_meta`
- Seed `data/trainers.ts` public catalog merge (DB preferred when approved row exists)

---

## Manual QA

1. Apply migration  
2. New client signup → row in `client_applications` with `user_id`  
3. Specialist onboarding submit → row in `specialist_applications` (no password in jsonb)  
4. Logout/login on another device → admin queue still shows apps (as admin)  
5. Approve/reject still works in admin UI  
