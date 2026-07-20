# SMOAC Code Audit — June 23, 2026

**Scope:** Full codebase review for duplicate code, dead code, unused modules, obsolete auth/location paths, and overlapping Supabase clients.  
**Mode:** Read-only audit — **no files were modified** to produce this report.  
**Branch audited:** `supabase-storage-setup` (post Phase 2 auth + Phase 3a saved trainers commit)

---

## Executive summary

SMOAC is in a **healthy hybrid state**: Supabase owns identity (`auth.users`, `profiles`, `user_roles`) and client saved specialists (`saved_trainers`). Most marketplace catalog, applications, and admin workflows still use `localStorage` (Phase 3b+ backlog).

The audit found **few truly orphan files** (2 components, 1 lib module) but **many dead exports**, **unused barrel entry points**, and **overlapping patterns** that accumulated during Phase 2/3a. Nothing here blocks production; items below are maintainability and clarity improvements.

| Category | High | Medium | Low |
|----------|------|--------|-----|
| Dead / unused files | 2 | 1 | — |
| Dead exports / APIs | ~8 | ~15 | ~90+ type/constant exports |
| Duplicate logic | 2 | 12 | 8 |
| Obsolete localStorage (auth) | — | 2 | 3 legacy keys |
| Obsolete ZIP fallback | — | — | 2 mock-only paths |
| Duplicate Supabase clients | — | 1 | 1 (middleware pattern) |

**Top 5 cleanup targets (when editing is allowed):**

1. Remove `MobileBottomNavLazy.tsx` and fix docs that still reference it.
2. Remove dead logout helpers (`logoutWithToast`, `logoutUser`) — canonical path is `AuthSessionContext.signOut`.
3. Wire or remove `lib/supabase/admin.ts` (`createSupabaseAdminClient` has zero importers).
4. Consolidate location hooks (`usePersonalizationCity` duplicates `useUserLocation` ZIP resolution).
5. Stop importing auth helpers from `specialist-saves.ts`; use `auth-session-helpers-core.ts` directly.

---

## Methodology

- Static import tracing across `src/` (including `next/dynamic` lazy routes).
- Grep for symbol usage (`export` vs importers).
- Cross-reference `docs/PHASE2_AUTH_ARCHITECTURE.md`, `docs/PHASE3A_SAVED_TRAINERS.md`, `docs/CLEANUP_REPORT.md`.
- Subagent passes on components/hooks, auth/localStorage, and duplicate patterns.
- **Not in scope:** runtime profiling, bundle analysis, security pen-test, Supabase production data review.

**False-positive patterns to remember:**

- `next/dynamic(() => import(...))` — components look unused in static graph but are routed.
- Barrel re-exports ≠ consumer usage (project prefers direct `@/path` imports).
- Internal-only exports used by siblings in the same file.

---

## Architecture context (what is *not* dead)

### Supabase (active)

| Concern | Canonical module |
|---------|------------------|
| Browser auth client | `lib/supabase/client.ts` → `getMarketplaceAuthClient()` in `marketplace-auth.ts` |
| Server auth / callback | `lib/supabase/server.ts` |
| Session refresh | `lib/supabase/middleware.ts` + `src/proxy.ts` (Next 16 proxy convention) |
| Profiles + roles | `lib/profiles/profile-service.ts` |
| Saved trainers CRUD | `lib/saved-trainers-service.ts` |
| Object storage (specialist photos) | `lib/supabase/storage.ts` (separate from DB — not duplicate) |

### localStorage (still required)

| Area | Why it remains |
|------|----------------|
| Phase 3b+ data | Applications, approved profiles, overrides, admin meta, hidden list |
| Guest ZIP cache | `user-location-storage.ts` — synced from `profiles.client_zip_code` on client login |
| Pending save | `smoac_pending_save` — heart before login |
| Saved trainers bridge | Per-user `smoac_saved_specialists_*` — one-time import + error fallback after Phase 3a |
| Dev mock auth | `smoac_dev_auth` when Supabase env absent |
| UX ephemera | Recent searches, geocode cache, intro flags |

---

## 1. Dead code — files with zero importers

| File | Evidence | Severity |
|------|----------|----------|
| `src/components/layout/MobileBottomNavLazy.tsx` | Never imported. Site layout uses `MobileBottomNav` directly (`src/app/(site)/layout.tsx`). Only referenced from unused `layout/index.ts` barrel and stale `ARCHITECTURE.md` / `AGENTS.md`. | **High** |
| `src/lib/supabase/admin.ts` | `createSupabaseAdminClient` — definition only. No imports in `src/` or `scripts/`. Test scripts use raw `createClient` from `@supabase/supabase-js`. | **High** |
| `src/components/dashboard/shared/DashboardEditProfileLink.tsx` | Exported via `shared/index.ts` but never rendered in JSX. | **Medium** |

### Dead exports (symbols defined, never imported externally)

| Symbol | File | Notes |
|--------|------|-------|
| `logoutWithToast` | `lib/logout-with-toast.ts` | `afterLogoutNavigation` **is** used (5 call sites). |
| `logoutUser` | `lib/specialist-saves.ts` | Re-exported from dead `lib/index.ts` barrel only. |
| `isSpecialistSaved` | `lib/specialist-saves.ts` | No external consumers. |
| `getSavedSpecialists` | `lib/specialist-saves.ts` | Used only inside same file by `saveSpecialist`. |
| `InternalAuthSessionContext.signIn` | `contexts/InternalAuthSessionContext.tsx` | Exposed on context; only `signInWithPassword` used. |
| `useRequireAdmin` | `hooks/useRequireAdmin.ts` | Alias shim; only exported from unused `hooks/index.ts`. |
| `useAdminPermissionsFromAuth` | `hooks/useAdminPermissions.ts` | Only exported from unused `hooks/index.ts`. |
| `zipCodeToMarketplaceCity`, `assertMarketplaceCity` | `lib/zip-to-marketplace-city.ts` | `normalizeZipCode` / `isValidZipCode` widely used; these two are not. |
| `CompassIcon`, `ChevronDownIcon` | `components/ui/icons.tsx` | No importers. |
| `Navbar` alias | `components/layout/index.ts` | `export { SiteHeader as Navbar }` — zero consumers. |
| `createSupabaseAdminClient` | `lib/supabase/admin.ts` | Entire module unused. |

### Internal-only exports (safe to un-export, not delete)

- `parseSearchQuery`, `mergeParsedIntoFilters` — used by `applySearchQueryToExploreState` in `search-query-parser.ts`.
- `saveSpecialist` — used by `applyPendingSaveAfterLogin` in `specialist-saves.ts`.

### ~90 additional lib type/constant exports

Automated scan found many exported types and storage-key constants with no external symbol references (e.g. `ZipResolveResult`, `DEV_ACCOUNTS`, motion easing constants). Most are **API surface or future server use** — candidates for `export` removal, not file deletion.

---

## 2. Unused components

All **175** component files under `src/components/**` are reachable except:

| Component | Status |
|-----------|--------|
| `MobileBottomNavLazy` | **Unused file** |
| `DashboardEditProfileLink` | **Dead export** (never mounted) |

### Lazy-loaded (look unused in static analysis — are used)

| Component | Loaded by |
|-----------|-----------|
| `ExplorePageClient` | `app/(site)/explore/page.tsx` |
| `SavedPageClient` | `app/(site)/saved/page.tsx` |
| `SiteWelcomeIntroGate` | `SiteWelcomeIntroGateLazy.tsx` |
| `SmoacWelcomeIntro` | Welcome gate + create-account wizard |

### Intentional dev/diagnostic UI (not dead)

| Component | Route / usage |
|-----------|----------------|
| `tap-test` page | `/tap-test` — unlinked, documented dev probe |
| `DevTrainerDistance` | `TrainerCardGrid` / `TrainerCardCompact` — gated by env flag |

### Single login gate (good — no duplicate modals)

- `LoginGateModal` — only in `SavedTrainersProvider` (per `AGENTS.md` rules).

---

## 3. Unused hooks

**All 37 hook files in `src/hooks/**` have at least one external importer** when using direct paths (`@/hooks/useX`).

| Hook file | Issue |
|-----------|-------|
| `useRequireAdmin.ts` | Entire file is a **dead alias** — no direct importers outside unused barrel. |
| `hooks/index.ts` | Barrel unused — no `from "@/hooks"` imports in codebase. |

24 hooks are used via direct paths only (not re-exported from barrel): e.g. `usePersonalizationCity`, `useActiveUserCoordinates`, `useHydrated`, `useHeaderPanels`.

---

## 4. Unused / obsolete localStorage logic

### Auth session keys

| Key | File | Status |
|-----|------|--------|
| `smoac_dev_auth` | `auth-session-storage.ts` | **Still needed** for `npm run dev` without Supabase. When Supabase on, `persistAuthSession` only clears — does not write. |
| `smoac-auth-session` | legacy | **Migration-only** — copied to dev key then removed. |
| `smoac_internal_auth` | `internal-auth-session-storage.ts` | **Duplicate with Supabase cookies** when Supabase active — still written with no `isSupabaseConfigured()` guard. Medium cleanup candidate. |

### Saved trainers (Phase 3a)

| Key | Status |
|-----|--------|
| `smoac_saved_specialists_${userId}` | **Bridge** — import into Supabase, dev fallback, fetch-error cache. Cleared after successful import. |
| `smoac_saved_specialists`, `smoac:saved-trainer-ids` | **Deprecated** — migrated into per-user key. |
| `smoac_pending_save` | **Active** — pre-login heart workflow. |

### Location / ZIP (not obsolete)

| Key / module | Status |
|--------------|--------|
| `userZipCode`, geo keys | Guest cache + sync from profile on login; cleared on client logout. |
| `smoacGeocodedZipCache` | Performance cache for unknown ZIPs. |
| `smoacRecentZipCodes` | Location panel UX. |

### Phase 3 backlog (still active — do not remove yet)

`smoac_specialist_applications`, `smoac_client_applications`, `smoac_approved_specialist_profiles`, `smoac_specialist_profile_overrides`, `smoac_hidden_specialists`, `smoac_admin_specialist_meta`, `smoac_create_account_profile`, `smoac_specialist_onboarding_draft`, `smoac_admin_applications_seed_v1`, `smoac-recent-searches`.

### sessionStorage (related)

| Key | File | Status |
|-----|------|--------|
| `smoac_login_tip_seen` | `login-suggestion-storage.ts` | Active |
| `smoac_site_intro_seen` | `site-intro-storage.ts` | Active |

### Stale admin read path

`lib/admin-clients-service.ts` reads `loadSavedTrainerIdsForUser()` from **localStorage** for saved counts in admin mock UI — bypasses Supabase `saved-trainers-store`. **Low priority** until admin panel uses real client data.

---

## 5. Obsolete auth code

### Removed in recent cleanup (verify not reintroduced)

- `validateDevPublicLogin` — gone from source.
- Marketplace `AuthSessionContext.signIn` (email-only dev) — gone.
- `types/auth-signup.ts` — removed (orphan of deleted API route).
- `lib/auth/auth-mode.ts` — removed (unused).
- `lib/auth/client-location-hydration.ts` — merged into `client-profile-location.ts`.

### Still needed (dev mock path)

| Module | Role |
|--------|------|
| `lib/dev-auth.ts` | Credentials + `validateDevLogin` / `validateDevSignup` when `!isMarketplaceSupabaseActive()` |
| `lib/internal-auth.ts` | `validateDevInternalLogin` for `/internal/login` dev path |
| `lib/auth-session-storage.ts` | Persists dev session; legacy key migration |
| `lib/auth/marketplace-auth.ts` | Canonical Supabase sign-in/up/reset/admin |

### Dual “is Supabase on?” checks (minor duplication)

| Function | Location | Behavior |
|----------|----------|----------|
| `isSupabaseConfigured()` | `lib/supabase/config.ts` | Env vars at build/load time |
| `isMarketplaceSupabaseActive()` | `marketplace-auth.ts` + `SupabaseConfigContext` | Runtime flag from layout providers |

Usually aligned via `(site)/layout.tsx` and `internal/layout.tsx`, but **not the same function** — edge-case risk if they diverge.

### No REST auth API routes

- `src/app/api/**` — **empty**. Only auth HTTP handler is `src/app/auth/callback/route.ts` (email confirm / OAuth callback). **Not dead.**

### Parallel session store pattern

`auth-session-store` + `auth-session-storage` mirrors `internal-auth-session-store` + `internal-auth-session-storage`. Intentional split (marketplace vs internal); structurally duplicated.

---

## 6. Obsolete ZIP fallback logic

### Correct hierarchy (Phase 2 — implemented)

```
Signed-in client → profiles.client_zip_code (session) → client-profile-location.ts
Guest → user-location-storage.ts
Explore defaults → getEffectiveClientZip(session) — no hardcoded user ZIP
```

### Not obsolete (misleading name)

| Module | Actual use |
|--------|------------|
| `lib/marketplace-city-default-zip.ts` | **City picker only** (`LocationSelectorPanel`) + mock `application-to-trainer.ts` — **not** profile/explore fallback. |
| `lib/geo/zip-geocode-fallback.ts` | External geocode when ZIP absent from local centroid table. |
| `zip-centroids.ts`, `zip-place-names.ts` | Static lookup tables — required. |

### Mock-only hardcoded ZIPs (not user location path)

| Location | Usage |
|----------|--------|
| `lib/application-to-trainer.ts` | `|| "92101"` and San Diego centroid when application ZIP empty |
| `LocationSelectorPanel` placeholder `"92101"` | UI hint only |
| `SpecialistServiceAreaFields` placeholder `92129` | UI hint only |

### Redundant call (low)

`explore-location-filters.ts` → `getSavedZipExploreFilters`:

```ts
getEffectiveClientZip(session) ?? loadSavedZipCode()
```

`getEffectiveClientZip` already falls back to `loadSavedZipCode()` — second call is redundant.

### Duplicate hydration triggers (intentional, not dead)

| Call site | Trigger |
|-----------|---------|
| `AuthSessionContext` | Session restore / login |
| `CreateAccountWizardClient` | Post-signup |

Single implementation: `hydrateClientLocationFromSession` alias in `client-profile-location.ts`.

---

## 7. Duplicate code

### High severity

| Pair | Issue |
|------|-------|
| `usePersonalizationCity.ts` ↔ `useUserLocation.ts` | Both resolve `getEffectiveClientZip` + `getZipPlaceDisplayName` via `useSyncExternalStore`. |
| Logout paths | `AuthSessionContext.signOut` vs dead `logoutWithToast` / `logoutUser` — three implementations, one live. |

### Medium severity

| Pair | Issue |
|------|-------|
| `client-profile-location.ts` ↔ `user-location-storage.ts` / `useActiveUserCoordinates.ts` | Overlapping ZIP → coordinates resolution. |
| `explore-location-filters.ts` ↔ `trainer-location.ts` | Inline trainer coord logic duplicates `getTrainerCoordinates()`. |
| `client-account-validation.ts` ↔ `specialist-onboarding-validation.ts` | Parallel wizard missing-field patterns; client ZIP uses `/^\d{5}$/` instead of shared `isValidZipCode`. |
| `AuthSessionContext` ↔ `InternalAuthSessionContext` | Duplicate client-hydration `useSyncExternalStore` boilerplate. |
| `LoginPageClient` ↔ `InternalLoginPageClient` | Shared shake/delay/error patterns. |
| `marketplace-auth.signInAdminWithPassword` | Fetches role/profile then `buildAuthSessionFromSupabaseUser` fetches again. |
| `specialist-saves.ts` | Re-exports auth helpers; misnamed “DEV ONLY” facade over store. |
| `post-login-flow.ts` ↔ `applyPendingSaveAfterLogin` | Split orchestration across login navigation and `SavedTrainersContext`. |
| `useExploreTrainers.ts` | Local filter merge helpers overlap `explore-url.ts` / `explore.ts`. |

### Low severity

| Pair | Issue |
|------|-------|
| `SearchBar` ↔ `FeaturedTrainers` | Repeated explore href building from session ZIP. |
| `saved-trainers-store` / `service` / `storage` | Intentional 3-tier layering; repeated `uniqueIds` dedup. |
| `user-location-store` ↔ `user-location-storage` | Thin re-export wrapper (documented pattern). |
| Auth page atmosphere markup | Duplicated blob canvas in login/forgot/reset/wizard shells. |
| `Navbar*` component naming | Legacy names; `SiteHeader` is canonical. |

### Not duplicated (healthy)

- `lib/validation/email.ts` — single email validator.
- `profile-service.ts` — sole Supabase profiles module.
- `saved-trainers-service.ts` — sole Supabase saves module.
- Single `LoginGateModal` on `SavedTrainersProvider`.
- Geo chain: `resolve-zip-place` → `resolve-zip-location` → `completeZipEntryAsync` (layered, not copy-pasted).

---

## 8. Duplicate / overlapping Supabase services

| Client factory | File | Used? |
|----------------|------|-------|
| `createSupabaseBrowserClient()` | `supabase/client.ts` | **Yes** — singleton via `@supabase/ssr` |
| `getMarketplaceAuthClient()` | `marketplace-auth.ts` | **Yes** — all app auth + saves |
| `createSupabaseServerClient()` | `supabase/server.ts` | **Yes** — `auth/callback/route.ts` |
| `updateSession` / inline `createServerClient` | `supabase/middleware.ts` | **Yes** — cookie adapter; invoked from `src/proxy.ts` |
| `createSupabaseAdminClient()` | `supabase/admin.ts` | **No** |
| `createClient` (raw) | `scripts/test-*.mjs` | **Yes** — ops scripts only (appropriate) |

**Storage vs database:** `lib/supabase/storage.ts` (file uploads) is **not** a duplicate of DB services — different Supabase product surface.

**Service pattern (good):** `profile-service.ts` and `saved-trainers-service.ts` accept `SupabaseClient` from caller — no hidden second client inside services.

**Unused barrel:** `lib/supabase/index.ts` — no `from "@/lib/supabase"` imports; consumers use direct paths.

---

## 9. Unused barrel entry points

No file imports these barrels (project uses direct paths):

| Barrel |
|--------|
| `src/lib/index.ts` |
| `src/hooks/index.ts` |
| `src/components/ui/index.ts` |
| `src/components/profile/index.ts` |
| `src/components/explore/index.ts` |
| `src/components/layout/index.ts` |
| `src/components/brand/index.ts` |
| `src/lib/admin/index.ts` |
| `src/lib/supabase/index.ts` |
| `src/contexts/index.ts` |

Barrels re-export live symbols but are **unused public APIs**. Either delete barrels or adopt them consistently per `ARCHITECTURE.md` import guidance.

---

## 10. Documentation drift

| Doc | Issue |
|-----|-------|
| `AGENTS.md` / `src/ARCHITECTURE.md` | Reference `MobileBottomNavLazy`; code uses `MobileBottomNav`. |
| `contexts/README.md` | Updated for Supabase auth; `hooks/README.md` may still say “dev session” in places. |
| `lib/specialist-saves.ts` header | Says “DEV ONLY” but exports production auth helpers used by 8+ components. |
| `CURRENT_STATUS.md` | Phase 3a marked implemented — accurate post-migration. |

Prior audit: `docs/CLEANUP_REPORT.md` (May 2026 + June Phase 2 section) — still valid; this report supersedes for June 23 scope.

---

## 11. Routes inventory (all reachable)

| Route | Purpose |
|-------|---------|
| `/`, `/explore`, `/saved`, `/login`, `/create-account` | Core marketplace |
| `/login/forgot-password`, `/login/reset-password` | Supabase password reset |
| `/client-dashboard`, `/specialist-dashboard`, `/specialist-dashboard/edit-profile` | Dashboards |
| `/trainers/[id]`, `/rankings` | Catalog |
| `/discover` | Placeholder (linked from mobile nav) |
| `/admin` | Redirect |
| `/internal`, `/internal/login` | Admin portal |
| `/tap-test` | Dev diagnostics (unlinked) |
| `/auth/callback` | Supabase auth callback (route handler) |

No orphan `page.tsx` files found.

---

## 12. Prioritized recommendations

### P0 — Safe deletes (high confidence)

1. Delete `src/components/layout/MobileBottomNavLazy.tsx`; remove from `layout/index.ts`.
2. Delete `src/components/dashboard/shared/DashboardEditProfileLink.tsx` + barrel export.
3. Remove `logoutWithToast`, `logoutUser`, `isSpecialistSaved` exports; trim `lib/index.ts`.
4. Remove `InternalAuthSessionContext.signIn` from public API (or delete handler if unused).
5. Delete or relocate `lib/supabase/admin.ts` if no server route planned soon.

### P1 — Consolidation (medium effort, low risk)

1. `usePersonalizationCity` → derive from `useUserLocation().city`.
2. Import auth helpers from `auth-session-helpers-core.ts` instead of `specialist-saves.ts`.
3. Use `getTrainerCoordinates()` inside `trainerMatchesExploreLocation`.
4. Align client ZIP validation with `isValidZipCode` / `normalizeZipCode`.
5. Skip `smoac_internal_auth` writes when Supabase session is active.
6. Drop redundant `?? loadSavedZipCode()` in `getSavedZipExploreFilters`.

### P2 — Structural (larger refactors)

1. Generic session store factory for marketplace + internal auth.
2. Shared `useClientHydrationReady()` for auth contexts.
3. Unified post-login orchestrator (nav + toast + pending save).
4. Shared `AuthPageShell` / atmosphere component for login flows.
5. Adopt or remove unused barrels project-wide.

### P3 — Phase 3b+ (planned, not duplication cleanup)

Migrate remaining `localStorage` domains per `docs/PHASE3_SUPABASE_MIGRATION.md` — applications, catalog, admin meta. After each migration, remove corresponding storage module.

---

## 13. What to keep (explicitly not dead)

- `dev-auth.ts` — required for local dev without Supabase env.
- `saved-trainers-storage.ts` — Phase 3a import/fallback bridge.
- `pending-save-storage.ts` — login gate workflow.
- `marketplace-city-default-zip.ts` — city picker + mock trainers only.
- `LoginGateModal` + `SavedTrainersProvider` — single gate architecture.
- `saved-trainers` three-tier store/service/storage — intentional layering.
- `tap-test`, `DevTrainerDistance` — documented dev tooling.
- All Supabase migrations under `supabase/migrations/`.
- Test scripts: `test-supabase-*.mjs`, `test-saved-trainers.mjs`, `apply-sql-migration.mjs`.

---

## Appendix A — localStorage key registry

| Key | Module | Phase |
|-----|--------|-------|
| `smoac_dev_auth` | auth-session-storage | Dev mock / legacy |
| `smoac_internal_auth` | internal-auth-session-storage | Internal session |
| `smoac_saved_specialists_*` | saved-trainers-storage | 3a bridge |
| `smoac_pending_save` | pending-save-storage | Active |
| `userZipCode` + geo keys | user-location-storage | Active |
| `smoacGeocodedZipCache` | geocoded-zip-cache | Active |
| `smoacRecentZipCodes` | recent-zip-storage | Active |
| `smoac-recent-searches` | recent-searches-storage | Active |
| `smoac_create_account_profile` | create-account-profile-storage | 3b |
| `smoac_specialist_applications` | specialist-application-storage | 3b |
| `smoac_client_applications` | client-application-storage | 3b |
| `smoac_approved_specialist_profiles` | approved-specialist-profiles-store | 3c |
| `smoac_specialist_profile_overrides` | specialist-profile-overrides | 3c |
| `smoac_hidden_specialists` | hidden-trainers-storage | 3d |
| `smoac_admin_specialist_meta` | admin-specialist-meta-store | 3d |
| `smoac_admin_notification_dismissed` | admin-notification-issues-store | 3d |
| `smoac_specialist_onboarding_draft` | specialist-application-storage | 3b |
| `smoac_admin_applications_seed_v1` | admin-applications-seed | Dev seed |

---

## Appendix B — Related docs

- [`PHASE2_AUTH_ARCHITECTURE.md`](./PHASE2_AUTH_ARCHITECTURE.md)
- [`PHASE3A_SAVED_TRAINERS.md`](./PHASE3A_SAVED_TRAINERS.md)
- [`PHASE3_SUPABASE_MIGRATION.md`](./PHASE3_SUPABASE_MIGRATION.md)
- [`CLEANUP_REPORT.md`](./CLEANUP_REPORT.md)
- [`CURRENT_STATUS.md`](../CURRENT_STATUS.md)

---

*End of audit — no code changes made.*
