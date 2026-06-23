# SMOAC — Current Status

**Last updated:** June 2026  
**Phase 2:** Complete  
**Phase 3a (saved trainers):** Implemented — apply migration + run tests  
**Phase 3b+:** Not started

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
| Middleware session refresh | ✅ |
| `PasswordInput` on all password fields | ✅ |

**Architecture:** [`docs/PHASE2_AUTH_ARCHITECTURE.md`](docs/PHASE2_AUTH_ARCHITECTURE.md)  
**Setup:** [`docs/SUPABASE_AUTH.md`](docs/SUPABASE_AUTH.md)

---

## Phase 3a — Saved trainers (implemented)

| Feature | Status |
|---------|--------|
| `saved_trainers` table + RLS | ✅ (apply migration) |
| Supabase load/save/unsave | ✅ |
| Cross-device persistence | ✅ |
| localStorage one-time import | ✅ |
| Loading + error states | ✅ |

**Docs:** [`docs/PHASE3A_SAVED_TRAINERS.md`](docs/PHASE3A_SAVED_TRAINERS.md)

```bash
# Apply migration in Supabase SQL Editor, then:
npm run test:supabase:saved
```

---

## Phase 3b+ — Other marketplace data (not started)

Still in `localStorage`:

- Saved trainers (hearts)
- Client & specialist applications
- Approved specialist profiles / overrides
- Admin hide list & specialist meta flags

**Plan:** [`docs/PHASE3_SUPABASE_MIGRATION.md`](docs/PHASE3_SUPABASE_MIGRATION.md)

---

## Verify locally

```bash
npm run test:supabase
npm run typecheck
npm run build && npm run start:lan
```

Acceptance: new client signup with ZIP → Supabase `profiles.client_zip_code` set → logout → login → header + explore match ZIP.
