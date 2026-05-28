# Lib

**Pure TypeScript** — no React, no JSX. Domain logic, localStorage stores, and URL helpers.

## Module map

| Module | Role |
|--------|------|
| `auth-session-store.ts` / `auth-session-storage.ts` | Dev auth session read/write |
| `auth-session-helpers-core.ts` | `isLoggedIn`, `getUserRole`, `canSaveSpecialists` |
| `saved-trainers-store.ts` / `saved-trainers-storage.ts` / `saved-trainers-user.ts` | Per-client saved specialist IDs |
| `saved-ui.ts` | Saved copy, toast presets, badge/title formatters |
| `specialist-saves.ts` | Save helpers + pending save + post-login apply |
| `pending-save-storage.ts` | Queue save before login |
| `post-login-flow.ts` | After login redirects + pending save toast |
| `explore.ts` / `explore-url.ts` / `explore-active-filters.ts` | Filter state + URL sync |
| `hero-search-suggestions.ts` | Homepage search suggestion list |
| `home-marketplace-stats.ts` | Hero trust stat copy |
| `navigation.ts` | Site routes + primary nav links |
| `utility-drawer-menu.ts` | Mobile utility drawer rows |
| `mobile-bottom-nav.ts` | Bottom tab items + active state |
| `mobile-bottom-nav-transition.ts` | Search → cinematic loader; other tabs → stacked panel slides |
| `mobile-chrome.ts` | Bottom nav body classes, scroll cache, route search helper |
| `chrome-body-classes.ts` | Scroll-lock / overlay body class list |
| `user-location-storage.ts` / `user-location-store.ts` | Geo + ZIP personalization |
| `personalized-trainers.ts` / `marketplace-city-centers.ts` | Location-aware lists |
| `viewport.ts` | Mobile breakpoint subscription for `useSyncExternalStore` |
| `motion.ts` | Framer Motion transition presets |
| `site-intro-storage.ts` | Welcome intro seen flag |
| `join-flow.ts` / `auth-routes.ts` | Auth route paths |
| `specialist-profile-store.ts` | Specialist profile overrides (dev) |
| `hidden-trainers-store.ts` | Hidden trainers (dev/explore) |
| `dev-auth.ts` / `dev-storage-keys.ts` | Dev-only credentials helpers |

### Admin (`lib/admin/*` + `lib/admin-*.ts`)

Platform admin is **separate** from marketplace `lib/` flows. Barrel: `@/lib/admin`.

| Module | Role |
|--------|------|
| `admin-permissions.ts` | Owner vs Staff capabilities (single source) |
| `admin-applications-service.ts` | Approve/reject/save applications |
| `admin-specialists-service.ts` | Specialist rows + visibility |
| `admin-specialist-billing-service.ts` | Tier + add-on mock billing |
| `admin-notification-counts.ts` | Nav badge counts |
| `admin-specialist-meta-store.ts` | Per-specialist admin flags (localStorage) |
| `specialist-application-storage.ts` | Join-flow applications (localStorage) |

Mock seeds: `@/data/admin`. See `components/admin/README.md`.

## Saved specialists (extend here)

```
SaveTrainerButton → useSavedTrainers() + useSaveToast()
                  → saved-trainers-store (IDs)
                  → saved-ui.ts (copy + toasts)
                  → pending-save-storage (logged-out queue)
```

Do not duplicate save copy in components — add strings to `saved-ui.ts`.

## Store pattern

Stores used by React follow:

1. `get*Snapshot()` / `get*ServerSnapshot()` for `useSyncExternalStore`
2. `subscribe*()` for listeners
3. `set*` mutators that persist then `emitChange()`

**Do not** read `localStorage` directly from components — go through context or hooks that wrap these stores.

## Adding logic

- New filter or URL rule → `explore*.ts` or new `feature-name.ts` here.
- New persisted user preference → store + storage pair (see `saved-trainers-*` or `user-location-*`).
- Re-export from `lib/index.ts` only if widely used across features; otherwise import the specific file.
