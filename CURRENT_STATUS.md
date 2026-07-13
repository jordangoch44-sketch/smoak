# SMOAC — Current Status

**Last updated:** July 2026  
**Phase 2:** Complete  
**Phase 3a (saved trainers):** Complete  
**Phase 3b (applications):** Implemented — apply migration + run tests  
**Phase 3c+:** Not started

---

## Phase 2 — Auth & profiles (done)

| Feature | Status |
|---------|--------|
| Supabase Auth signup/login/logout | ✅ |
| `user_roles` + `profiles` upsert on signup | ✅ |
| `profiles.first_name` → dashboard greeting | ✅ |
| `profiles.client_zip_code` → header + explore | ✅ |
| Password reset flow | ✅ |
| Internal admin login (`/internal/login`) | ✅ |

**Docs:** [`docs/PHASE2_AUTH_ARCHITECTURE.md`](docs/PHASE2_AUTH_ARCHITECTURE.md)

---

## Phase 3a — Saved trainers (done)

| Feature | Status |
|---------|--------|
| `saved_trainers` table + RLS | ✅ |
| Cross-device save hearts | ✅ |

**Docs:** [`docs/PHASE3A_SAVED_TRAINERS.md`](docs/PHASE3A_SAVED_TRAINERS.md)

---

## Phase 3b — Applications (implemented)

| Feature | Status |
|---------|--------|
| `client_applications` + `specialist_applications` | ✅ (apply migration) |
| Signup/onboarding → Supabase | ✅ |
| Admin hydrate + approve/reject dual-write | ✅ |
| Onboarding draft (local until submit) | ✅ (intentional) |

**Docs:** [`docs/PHASE3B_APPLICATIONS.md`](docs/PHASE3B_APPLICATIONS.md)

```bash
# Apply supabase/migrations/20260607000000_applications.sql then:
npm run test:supabase:applications
```

---

## Phase 3c+ — Not started

Still in `localStorage`:

- Approved specialist profiles / overrides  
- Admin hide list & specialist meta flags  
- Public catalog still merges seed + local approved store  

**Plan:** [`docs/PHASE3_SUPABASE_MIGRATION.md`](docs/PHASE3_SUPABASE_MIGRATION.md)
