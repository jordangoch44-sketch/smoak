# SMOAC — Current Status

**Last updated:** July 27, 2026  
**Phase 2:** Complete  
**Phase 3a (saved trainers):** Complete  
**Phase 3b (applications):** Complete (fetch-only hydrate when Supabase active)  
**Phase 3c (specialist profiles):** Complete in code  
**Phase 3d (admin flags / hide):** Complete in code  
**Phase 3e (prefer Supabase only):** In progress — live reads no longer promote localStorage

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
| No local mirror after successful Supabase write | ✅ (3e) |
| Live load error does not fall back to localStorage | ✅ (3e) |

**Docs:** [`docs/PHASE3A_SAVED_TRAINERS.md`](docs/PHASE3A_SAVED_TRAINERS.md)

---

## Phase 3b — Applications (done)

| Feature | Status |
|---------|--------|
| `client_applications` + `specialist_applications` | ✅ |
| Signup/onboarding → Supabase | ✅ |
| Admin hydrate from DB (no auto-import of browser leftovers) | ✅ (3e) |
| Live snapshots do not seed from localStorage pre-hydrate | ✅ (3e) |
| Onboarding draft (local until submit) | ✅ (intentional) |

**Docs:** [`docs/PHASE3B_APPLICATIONS.md`](docs/PHASE3B_APPLICATIONS.md)

---

## Phase 3c / 3d — Profiles + admin moderation (done in code)

| Feature | Status |
|---------|--------|
| `specialist_profiles` approve → Explore | ✅ |
| Edit profile dual-write → DB | ✅ |
| Hide / featured / sponsored / top_ranked flags | ✅ |
| Live Explore skips browser-only hide list | ✅ |
| Public profile page skips local overrides when live | ✅ (3e) |
| Profile overrides memory-only when live | ✅ (3e) |

**Docs:** [`docs/PHASE3C_SPECIALIST_PROFILES.md`](docs/PHASE3C_SPECIALIST_PROFILES.md)

Apply migrations in Supabase if not already:

- `20260716000000_specialist_profiles.sql`
- `20260723140000_specialist_profiles_admin_flags.sql`

---

## Phase 3e — Prefer Supabase only (in progress)

**Shipped:**

- Live approved catalog: memory + Supabase only (no localStorage write/read as authority)
- Public Explore / cards / profile pages: no local override overlay when live
- Applications hydrate: fetch-only (no auto `importLocal*` into shared DB)
- Application + catalog snapshots: never seed from localStorage when live
- Saved trainers: no post-success local mirror; live errors stay empty + error (no local invent)
- Seed + localStorage remain for `npm run dev` without Supabase env
- Admin specialists table reads `specialist_profiles` when live
- Admin revenue can show Stripe MRR; specialist analytics use site_visits + saves

**Still to do:**

- [ ] Explicit backfill scripts for any remaining local-only data
- [ ] Delete local bridge modules + retire `dev-auth` when demo-without-env is an explicit product mode
- [x] Hide / admin-meta mirrors memory-only when live (ops-only fields `isProtected` / `accountKind` remain session memory until DB columns)
- [ ] Retire saved-trainers one-time `importLocalSavedTrainers` after migration window
- [x] Search / contact / booking click event pipeline for specialist analytics
  - Migration: `20260727140000_specialist_engagement_events.sql` (apply in Supabase SQL Editor)

**Stripe (prod keys present):** checkout → webhook → `specialist_billing` path is live. Set `CRON_SECRET` in Vercel so daily trial expiry cron is authorized.

**Plan:** [`docs/PHASE3_SUPABASE_MIGRATION.md`](docs/PHASE3_SUPABASE_MIGRATION.md)
