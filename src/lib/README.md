# `src/lib` — service layout

Logical grouping for navigation (files stay at current paths until a dedicated migration).

## Application submission (Join Now)

- `applications/client-applications-db.ts`, `applications/specialist-applications-db.ts` — Supabase CRUD (Phase 3b)
- `client-application-storage.ts` / `specialist-application-storage.ts` — hydrate + dual-write
- `client-application-submit.ts`, `specialist-application-submit.ts`
- `specialist-application-fields.ts`, `specialist-onboarding-validation.ts`
- `application-to-trainer.ts` — application → Trainer + profile override mapping

## Admin approval

- `admin-applications-service.ts`, `admin-applications-seed.ts`
- `approved-specialist-profiles-store.ts` — approved public profiles (Phase 3c dual-write → `specialist_profiles`)
- `profiles/specialist-profiles-db.ts` — Supabase CRUD for public specialist listings
- `admin-specialists-service.ts`, `admin-specialist-meta-store.ts`

## Specialist dashboard

- `managed-specialist-profile.ts` — session id resolve, save orchestration, demo vs real
- `specialist-dashboard-mode.ts` — pending / free / premium dashboard modes
- `specialist-dashboard-analytics.ts`, `specialist-dashboard-stats.ts`, `specialist-dashboard-subscription.ts`
- `specialist-premium.ts`

## Specialist profile edit

- `specialist-profile-store.ts` — override persistence + listeners (`smoac_specialist_profile_overrides`)
- `specialist-profile-overrides.ts` — form ↔ overrides, apply to Trainer

## Public marketplace / catalog

- `marketplace-public-catalog.ts` — approved-only public list; pending hidden via `smoac_hidden_specialists`
- `explore.ts`, `explore-url.ts`, `explore-active-filters.ts`, `explore-location-filters.ts`
- `recent-searches-store.ts`, `recent-searches-storage.ts` — Explore query history (writes on search; read UI TBD)
- `search-query-parser.ts`, `trainers.ts` (filter helpers)
- `trainer-reviews.ts` — seed/demo hero ★ + card counts (catalog; not live SMOAC)
- `footer-nav.ts` — `FOOTER_NAV_GROUPS` for `Footer.tsx`
- `legal-content.ts` — copy for `LegalDocumentPage` routes
- `navigation.ts` — `SITE_ROUTES` canonical paths

## SMOAC client reviews (live Supabase)

- `reviews/specialist-reviews-client.ts` — fetch + `submit_specialist_review` RPC
- `reviews/specialist-review-types.ts` — shared types

Do **not** merge with `trainer-reviews.ts` (demo/Google) or `specialist-reputation.ts` (dashboard mock).

## Image upload / crop

- `media/crop-image.ts` — crop + `readFileAsDataUrl` (persistable data URLs)

## Auth (Phase 2)

- `auth/marketplace-auth.ts` — Supabase sign-in/up/reset/admin
- `profiles/profile-service.ts` — `profiles` + `user_roles` upserts
- `client-profile-location.ts` — profile ZIP → header/explore
- `auth-session-store.ts`, `auth-session-storage.ts` — session snapshot (dev fallback)
- `dev-auth.ts` — mock credentials when Supabase env absent (`npm run dev` only)

See `docs/PHASE2_AUTH_ARCHITECTURE.md`.

## Storage helpers

- `dev-storage-keys.ts` — Phase 3 localStorage key registry
- `user-location-storage.ts`, `user-location-store.ts`
- `geo/*`, `zip-to-marketplace-city.ts`

## Clients

- `admin-clients-service.ts`, `create-account-profile-storage.ts`
- `saved-trainers-service.ts`, `saved-trainers-store.ts`, `saved-trainers-storage.ts` (Phase 3a — Supabase + legacy import)
- `specialist-saves.ts` — pending save after login

## Admin platform

- permissions, notifications, specialist billing catalog projection
- live revenue via `/api/admin/revenue` + Stripe sync
- `internal-auth*.ts`, `internal-routes.ts`

## Cross-cutting

- `email/confirmation-email-service.ts`
- `validation/email.ts`
- `toast-store.ts`, `dev-auth.ts`

## Demo / seed data (not runtime logic)

- `@/constants/specialist-dashboard-mock.ts` — demo analytics, leads, ids
- `@/data/demo/dev-dashboard-trainer.ts` — isolated dev-login dashboard seed
- `@/data/dashboard-mock.ts`, `@/data/trainers.ts`
