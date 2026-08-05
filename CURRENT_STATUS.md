# SMOAC — Current Status

**Last updated:** August 5, 2026  
**Phase 2:** Complete  
**Phase 3a (saved trainers):** Complete — live load is Supabase-only (no local import)  
**Phase 3b (applications):** Complete (fetch-only hydrate when Supabase active)  
**Phase 3c (specialist profiles):** Complete in code  
**Phase 3d (admin flags / hide):** Complete in code  
**Phase 3e (prefer Supabase only):** Mostly done — remaining: optional backfill scripts + retire `dev-auth` when ready  

---

## Homepage baseline (July 31 — good build-from point)

Live on `smoac.com` / branch `supabase-storage-setup`:

| Area | Status |
|------|--------|
| Document scroll (no nested page-transition scrollport) | ✅ |
| Mobile header stays solid while scrolling | ✅ |
| Light-speed welcome (first visit + `/?replay-intro=1`) | ✅ |
| No homepage peek before warp (SiteIntroBoot) | ✅ |
| Dead location-modal gate/CSS removed | ✅ |
| Ops: `scripts/wipe-marketplace-users.mjs` | ✅ |

**Do not regress:** `overflow-x: clip` (not `hidden`) on `.app-main` / `.page-transition*`; welcome cover z-index below `--z-welcome-intro`.

---

## Recent polish (Aug 2026)

| Area | Status |
|------|--------|
| Edit profile = client-faithful layout + persisted `profileStyle` | ✅ |
| Profile sheet close remnant (iOS) | ✅ |
| Clear location (guest + signed-in profile ZIP) | ✅ |
| Header ZIP → Explore without re-prompt | ✅ |
| Pro trial emails / Plan tab / Stripe placements | ✅ |

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
| No local mirror after successful Supabase write | ✅ |
| Live load error does not fall back to localStorage | ✅ |
| One-time `importLocalSavedTrainers` retired | ✅ |

**Docs:** [`docs/PHASE3A_SAVED_TRAINERS.md`](docs/PHASE3A_SAVED_TRAINERS.md)

---

## Phase 3b — Applications (done)

| Feature | Status |
|---------|--------|
| `client_applications` + `specialist_applications` | ✅ |
| Signup/onboarding → Supabase | ✅ |
| Admin hydrate from DB (no auto-import of browser leftovers) | ✅ |
| Live snapshots do not seed from localStorage pre-hydrate | ✅ |
| Onboarding draft (local until submit) | ✅ (intentional) |
| Dead `importLocal*Applications` helpers removed | ✅ |

**Docs:** [`docs/PHASE3B_APPLICATIONS.md`](docs/PHASE3B_APPLICATIONS.md)

---

## Phase 3c / 3d — Profiles + admin moderation (done in code)

| Feature | Status |
|---------|--------|
| `specialist_profiles` approve → Explore | ✅ |
| Edit profile dual-write → DB | ✅ |
| Hide / featured / sponsored / top_ranked flags | ✅ |
| Live Explore skips browser-only hide list | ✅ |
| Public profile page skips local overrides when live | ✅ |
| Profile overrides memory-only when live | ✅ |
| Specialist media upload → Storage bucket when live | ✅ |

**Docs:** [`docs/PHASE3C_SPECIALIST_PROFILES.md`](docs/PHASE3C_SPECIALIST_PROFILES.md), [`docs/SUPABASE_STORAGE.md`](docs/SUPABASE_STORAGE.md)

---

## Phase 3e — Prefer Supabase only (mostly done)

**Shipped:**

- Live approved catalog: memory + Supabase only (no localStorage write/read as authority)
- Public Explore / cards / profile pages: no local override overlay when live
- Applications hydrate: fetch-only (no auto `importLocal*` into shared DB)
- Application + catalog snapshots: never seed from localStorage when live
- Saved trainers: no post-success local mirror; live errors stay empty + error (no local invent)
- Seed + localStorage remain for `npm run dev` without Supabase env
- Admin specialists table reads `specialist_profiles` when live
- Admin revenue can show Stripe MRR; specialist analytics use site_visits + saves
- Search / contact / booking click event pipeline for specialist analytics
- Hide / admin-meta mirrors memory-only when live (ops-only fields `isProtected` / `accountKind` remain session memory until DB columns)

**Still to do:**

- [ ] Explicit backfill scripts for any remaining local-only data (support/ops only)
- [ ] Delete remaining local bridge modules + retire `dev-auth` when demo-without-env is an explicit product mode

**Ops (prod Vercel):**

- [x] `CRON_SECRET` set — daily trial expiry + reminder cron authorized
- [ ] Confirm `EMAIL_FROM` is a full `Name <addr@verified-domain>` (Resend). Local still uses `onboarding@resend.dev`.

**Stripe (prod keys present):** checkout → webhook → `specialist_billing` path is live.

**Plan:** [`docs/PHASE3_SUPABASE_MIGRATION.md`](docs/PHASE3_SUPABASE_MIGRATION.md)
