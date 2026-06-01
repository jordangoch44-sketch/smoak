# SMOAC Cleanup & Stability Pass — Report

**Date:** 2026-05-20  
**Scope:** Maintainability and dead-code removal only. No UI, styling, business logic, approval workflows, or search behavior changes.

---

## Files removed (verified zero imports)

| File | Reason |
|------|--------|
| `src/lib/location-display.ts` | Duplicated `useUserLocation` pill logic; never imported |
| `src/lib/active-location.ts` | Deprecated shim to `mergeExploreFiltersWithSavedLocation`; never imported |
| `src/lib/specialist-matching-prep.ts` | Dead re-export barrel |
| `src/lib/admin-routes.ts` | Deprecated re-export of `internal-routes`; never imported |
| `src/components/home/Testimonials.tsx` | Component never mounted on homepage |
| `src/components/layout/Navbar.tsx` | Duplicate of `SiteHeader` export (alias remains in `layout/index.ts`) |

---

## Files added

| File | Purpose |
|------|---------|
| `src/lib/validation/email.ts` | Shared `isValidEmail` for onboarding wizards |
| `src/lib/geo/zippopotam-client.ts` | Single Zippopotam US ZIP fetch (deduplicated) |
| `docs/CLEANUP_REPORT.md` | This report |
| `src/lib/README.md` | Service grouping map (documentation only) |

---

## Duplicate logic consolidated

| Area | Change |
|------|--------|
| Email validation | `CreateAccountWizardClient` + `specialist-onboarding-validation` → `@/lib/validation/email` |
| Zippopotam API | `resolve-zip-place.ts` + `zip-geocode-fallback.ts` → `zippopotam-client.ts` |
| localStorage location keys | Removed duplicate constants from `dev-storage-keys.ts` (canonical: `user-location-storage.ts`) |
| Unused match helper | Removed `buildSpecialistMatchContext` / `SpecialistMatchContext` from `specialist-service-area.ts` (no callers) |

---

## Dead code removed (symbols)

- `buildSpecialistMatchContext`, `SpecialistMatchContext` — unused proximity prep API
- Duplicate `USER_*_KEY` exports in `dev-storage-keys.ts`
- `buildDevAdminLoginHref` re-export from `lib/admin/index.ts` (function kept in `internal-routes.ts`)

---

## Intentionally not changed

| Item | Reason |
|------|--------|
| Dual toast systems (`toast-store` vs `SaveToastContext`) | Different UX contracts; merging would change behavior |
| `Trainer` type / `/trainers/[id]` routes | Public API; rename is a migration project |
| `lib/trainers.ts` vs `data/trainers.ts` | Different roles (filters vs seed catalog) |
| Explore module split (`explore.ts`, `explore-url.ts`, etc.) | Clear separation of concerns |
| Responsive `TrainerCard` + `TrainerCardCompact` | Layout-specific; shared extraction risks CSS regressions |
| Unused barrel `index.ts` files | Zero runtime cost; removing may break future barrel imports |
| File moves into `lib/admin/`, `lib/applications/` folders | High churn; documented grouping in `src/lib/README.md` instead |
| Admin approve → activate on one click | Existing product behavior preserved |
| `/tap-test` route | Intentional dev diagnostics (unlinked) |
| `/discover` placeholder | Linked from bottom nav |

---

## Routes reviewed

All `src/app/**/page.tsx` routes are reachable via nav, redirects, or direct URL. No orphan routes removed.

| Route | Status |
|-------|--------|
| `/tap-test` | Dev-only, unlinked — kept |
| `/admin` | Redirects to internal portal |
| `/discover` | Placeholder, linked from mobile nav |

---

## State & performance

- **Explore:** Existing `useMemo` / `useCallback` on filter pipeline retained; public catalog subscriptions unchanged.
- **No new lazy routes** added (explore, dashboards, saved already dynamic where appropriate).
- **No effect/listener removals** in hot paths without proof of redundancy.

---

## localStorage

- Canonical keys: `dev-storage-keys.ts` (auth, applications, admin meta) + `user-location-storage.ts` (geo/ZIP).
- Legacy migration keys (`LEGACY_*`) retained for dev session migration.

---

## Mobile (verified existing fixes, no new CSS)

- Admin panel: `padding-bottom` with safe-area + bottom nav clearance (`admin-dashboard.css`).
- Review sheets: sticky footer padding includes safe-area + nav offset.
- Client dashboard: prior overflow/chip fixes retained.

---

## Manual review warnings

1. **`useAdminPermissionsFromAuth`** — only referenced from unused `hooks/index.ts`; kept on hook for API stability.
2. **`useRequireAdmin`** — deprecated alias; still exported from `hooks/index.ts`.
3. **`buildDevAdminLoginHref`** — defined in `internal-routes.ts`, no call sites; kept for dev tooling.
4. **Barrel files** (`src/lib/index.ts`, `src/data/index.ts`, etc.) — unused as import paths; safe to delete in a follow-up if desired.
5. **Trainer vs specialist naming** — document in `AGENTS.md`; route/type rename is out of scope.
6. **Zippopotam dedupe** — behavior should be identical; smoke-test ZIP lookup in location selector and specialist onboarding step 3.

---

## Verification

```bash
npm run typecheck
```

Recommended manual smoke tests: Explore filters, Join Now (client + specialist), Admin Applications approve/reject, location ZIP pill, saved specialists.

---

# End-of-session cleanup — Join Now / dashboard / profile pass

**Date:** 2026-05-20 (session)  
**Scope:** Organization and dead-code removal only. No UI, styling, approval logic, or public visibility changes.

## Files removed

| File | Reason |
|------|--------|
| `src/lib/admin-application-profile.ts` | Merged into `application-to-trainer.ts` (`applicationToProfileOverrides`) |
| `src/data/specialist-analytics.ts` | Dead re-export barrel; import `@/lib/specialist-dashboard-analytics` directly |
| `src/components/dashboard/specialist/useSpecialistDashboard.ts` | Moved to `src/hooks/useSpecialistDashboard.ts` |
| `src/components/dashboard/specialist/SpecialistFutureSlots.ts` | Unused future-slot placeholder; zero imports |

## Files added / moved

| File | Purpose |
|------|---------|
| `src/hooks/useSpecialistDashboard.ts` | Specialist dashboard hook (session → mode, analytics, completion) |
| `src/data/demo/dev-dashboard-trainer.ts` | Isolated dev-login seed (`dev-specialist-dashboard` id) |

## Duplicate logic removed

| Area | Change |
|------|--------|
| Application → profile overrides | Single export in `application-to-trainer.ts`; admin barrel re-exports from there |
| Application preview trainer | `SpecialistApplicationPreview` imports from `application-to-trainer` (not submit module) |
| Admin specialist merge | `admin-specialists-service.mergeTrainerBase` uses `applySpecialistProfileOverrides` |
| Submit module barrel | Removed `applicationToPreviewTrainer` re-export from `specialist-application-submit.ts` |
| Dashboard mock checklist | Removed unused `PROFILE_COMPLETION_CHECKLIST` constant |
| Analytics stat tiles | Removed unused `buildAnalyticsStatTiles` |
| Managed profile helpers | Removed unused `getManagedTrainerWithOverrides`, `getManagedSpecialistApplication` |
| Public catalog | Removed unused `getPublicMarketplaceTrainerById` (base + store path used instead) |

## Demo / dev decoupling

| Change | Effect |
|--------|--------|
| `DEV_SPECIALIST_DASHBOARD_ID = "dev-specialist-dashboard"` | Dev login (`specialist@smoac.com`) no longer resolves to public seed `anthony-brooks` |
| `getDevDashboardTrainerSeed()` | Clones Anthony demo data under isolated id; overrides stored separately |
| `isDemoSpecialistDashboard()` | Returns true for dev id or null trainer id when no real application exists |
| `DEMO_SPECIALIST_ID` | Retained only for demo analytics/leads UI in `@/constants/specialist-dashboard-mock` |

## Source-of-truth map (unchanged behavior)

| Store | Key | Used by |
|-------|-----|---------|
| Applications | `smoac_specialist_applications` | Join Now submit, pending dashboard, admin review |
| Profile overrides | `smoac_specialist_profile_overrides` | Edit Profile saves, dashboard display |
| Approved profiles | `smoac_approved_specialist_profiles` | Public catalog after approval |
| Hidden | `smoac_hidden_specialists` | Pending specialists excluded from Explore |

Orchestration: `managed-specialist-profile.ts` → `saveManagedSpecialistProfileEdits` (application merge → approved sync if APPROVED → overrides).

## Documentation

- Updated `src/lib/README.md` with logical groupings: submission, admin approval, dashboard, profile edit, marketplace, media, storage, demo seeds.

## Manual review warnings

1. **`SpecialistEditProfilePageClient`** — duplicates some dashboard-mode resolution that `useSpecialistDashboard` already computes; safe follow-up to share hook fields only (no behavior change needed now).
2. **Profile photo cropper** — wired on onboarding wizard; edit-profile path uses direct upload + data URL (intentional; crop on edit is a future UX pass).
3. **`SPECIALIST_DASHBOARD_SLOTS` type** — future dashboard modules enum remains; placeholder UI file removed.
4. **Dev dashboard ranking/leads** — demo analytics still reference `anthony-brooks` ranking data while profile id is `dev-specialist-dashboard` (display-only demo metrics).
5. **Large uncommitted feature set** — this commit captures the full tonight’s work plus cleanup; smoke-test acceptance checklist below before deploy.

## Verification

```bash
npm run typecheck   # pass
npm run build       # pass
```

**Acceptance smoke tests (manual):**

- Specialist Join Now submits → pending dashboard
- Edit Profile opens, section save persists after refresh
- Admin approve → specialist appears on Explore
- Pending specialist stays hidden publicly
- Dev login (`specialist@smoac.com`) dashboard uses isolated id (edits do not mutate public Anthony seed)

---

# Stability pass — Join tab, loading screen, nav performance (2026-05-20)

**Commits:** `53f7701` (WIP checkpoint) + cleanup commit after this pass.

## Files removed (dead after panel-only transitions)

| File | Reason |
|------|--------|
| `src/components/brand/SmoacDirectoryLoader.tsx` | 2.5s Search→Explore cinematic loader removed from nav flow |
| `src/styles/route-directory-loader.css` | Body chrome for directory transition — no callers |
| `src/styles/smoac-cinematic-loader.css` | Styles only used by directory loader |

## Symbols / CSS trimmed

- `setBottomNavDirectoryBodyActive`, `BOTTOM_NAV_DIRECTORY_BODY_ATTR` — removed from `mobile-chrome.ts`
- `bottom-nav-directory-active` — removed from `chrome-body-classes.ts`
- `--z-route-directory-loader` — removed from `site-chrome.css`
- `bottomNavPanelTransition` deprecated export — removed from `motion.ts`
- `useMobileBottomNavTransition` — removed (unused; use `useBottomNavTransitionActions` + `useBottomNavPanelTransition`)
- `isMobileBottomNavItemActive` — removed; use `isActiveNavItem`
- `.login-page--intro-boot` — unused CSS after welcome intro fix

## Consolidated behavior (unchanged UX)

| Area | Single source |
|------|----------------|
| Bottom-nav active tab | `isActiveNavItem()` + `getActiveMobileBottomNavItemId()` in `mobile-bottom-nav.ts` |
| Tab transitions | `MobileBottomNavTransitionContext` — ~220ms panel slide for all tabs |
| Welcome / Join intro chrome | `site-intro-open` / `join-intro-open` on `html`+`body` |
| Join tab | `SITE_ROUTES.join` → `/create-account?intro=1`; `/discover` redirects |

## Preserved features

- Join Now wizard, specialist applications, dashboards, admin approval, saved specialists, explore search focus, welcome intro, dev dashboard isolation, How It Works section.

## Manual smoke tests (iPhone Safari)

1. First visit: welcome intro full-screen, centered, no header/footer/nav
2. Join tab → create-account intro; Join tab active; Profile not active on `/create-account`
3. `/login` and dashboards: Profile tab active (smoked-glass ring)
4. Tab switches: no 2.5s loader; quick panel fade/slide
5. `/discover` → join flow redirect

## Verification

```bash
npm run typecheck
npm run build
```
