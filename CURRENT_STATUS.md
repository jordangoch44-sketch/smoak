# SMOAC — Current Status

**Last updated:** August 6, 2026  
**Branch:** `supabase-storage-setup` (live on [smoac.com](https://smoac.com))  
**Phase 2:** Complete  
**Phase 3a (saved trainers):** Complete — live load is Supabase-only (no local import)  
**Phase 3b (applications):** Complete (fetch-only hydrate when Supabase active)  
**Phase 3c (specialist profiles):** Complete in code  
**Phase 3d (admin flags / hide):** Complete in code  
**Phase 3e (prefer Supabase only):** Mostly done — remaining: optional backfill scripts + retire `dev-auth` when ready  

---

## Checkpoint — August 6, 2026

| Area | Status |
|------|--------|
| Bottom nav: instant highlight on phones; Marketplace/Search use session catalog (no RSC Supabase wait on soft nav) | ✅ live |
| Route loading shells for home / explore / saved / profile | ✅ live |
| Boost modal: full details (you get / appears / will not) + Stripe checkout | ✅ live |
| Boost theme: neon yellow (Pro = purple, Pro trial = blue) | ✅ live |
| Boost CTAs open modal in-place (home, explore, rankings, dashboard) | ✅ live |
| Inquiry: server `POST /api/inquiry/submit`; SMOAC favicon | ✅ live |

**Boost add-ons (catalog):** Boosted profile $49 · Category spotlight $99 · Top ranking boost $149 · Homepage spotlight $199 — separate from Pro.

**Do not regress:** soft-nav catalog via `usePublicCatalog` / approved profiles store; organic ranks stay unlabeled by boosts.

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
- [x] `EMAIL_FROM=SMOAC <noreply@smoac.com>` (Resend domain verified Aug 2026)
- [x] Inquiry submit via authenticated `POST /api/inquiry/submit` (server write + email)

**Stripe (prod keys present):** checkout → webhook → `specialist_billing` path is live.

**Plan:** [`docs/PHASE3_SUPABASE_MIGRATION.md`](docs/PHASE3_SUPABASE_MIGRATION.md)
