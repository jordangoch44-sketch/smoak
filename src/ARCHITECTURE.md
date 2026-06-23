# SMOAC — Source architecture

High-level map for humans and Cursor. **Behavior > file count** — extend existing systems before adding parallel ones.

## Folder layout

```
src/
├── app/
│   ├── layout.tsx              # Root: globals.css, fonts
│   ├── (site)/                 # Main product (header, footer, providers)
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Homepage
│   │   ├── explore/
│   │   ├── trainers/[id]/
│   │   ├── saved/, login/, rankings/, create-account/
│   │   ├── client-dashboard/, specialist-dashboard/
│   │   └── admin/              # Owner + Staff (not public marketplace)
│   └── (diagnostics)/
│       └── tap-test/           # DEV-only — no site chrome (see components/dev/README.md)
├── components/
│   ├── ui/                     # Primitives: Button, SaveButton, Logo, icons
│   ├── layout/                 # SiteHeader, Footer, overlays, page transition
│   ├── providers/              # AppProviders wrapper
│   ├── home/                   # Hero, SearchBar, Top50, sections
│   ├── explore/                # Explore page client + filters
│   ├── trainers/               # Cards + SaveTrainerButton
│   ├── profile/                # Trainer profile sections
│   ├── saved/                  # Saved list UI
│   ├── auth/                   # Login, create-account, onboarding
│   ├── dashboard/              # Client + specialist dashboards
│   ├── admin/                  # Owner/Staff admin UI only
│   ├── brand/                  # SmoacWelcomeIntro, wordmark
│   ├── rankings/
│   └── dev/                    # Dev-only utilities (SW cleanup)
├── contexts/                   # Auth, saved trainers, save toast
├── hooks/                      # Feature hooks (explore, header panels, hydration)
├── lib/                        # Pure TS: filters, stores, navigation (see lib/README.md)
│   └── supabase/               # Storage clients, paths, upload helpers (optional env)
├── data/                       # Static mock data (swap for API later)
├── types/                      # Shared interfaces
├── styles/                     # Global + feature CSS
└── constants/                  # Form options, dashboard mock constants
```

## Layer responsibilities

| Layer | Responsibility | Example |
|-------|------------------|---------|
| `app/` | Routes, metadata, thin composition | `explore/page.tsx` → `ExplorePageClient` |
| `components/ui/` | Design system, no domain rules | `SaveButton`, `TrainerThumbnail` |
| `components/{feature}/` | Feature UI | `ExploreFiltersDrawer` |
| `data/` | Static lists, simple getters | `trainers.ts`, `getTrainerById` |
| `lib/` | Domain logic + localStorage stores | `filterExploreTrainers`, `saved-trainers-store` |
| `hooks/` | React state, subscriptions | `useExploreTrainers`, `useHeaderPanels` |
| `contexts/` | App-wide client providers | `SavedTrainersProvider` |
| `types/` | Cross-cutting interfaces | `Trainer`, `AuthSession` |

## Core product flows

### Auth (Phase 2 — Supabase)

```
AuthSessionProvider (contexts/)
  → marketplace-auth.ts     signIn / signUp / signOut / reset
  → profile-service.ts      profiles + user_roles upsert
  → auth-session-store.ts   in-memory session snapshot
  → client-profile-location.ts   ZIP from profiles.client_zip_code
```

Dev fallback (no Supabase env): `dev-auth.ts` + `auth-session-storage.ts`.  
Full detail: [`docs/PHASE2_AUTH_ARCHITECTURE.md`](../docs/PHASE2_AUTH_ARCHITECTURE.md).  
Phase 3 localStorage migration: [`docs/PHASE3_SUPABASE_MIGRATION.md`](../docs/PHASE3_SUPABASE_MIGRATION.md).

### Save / heart

```
SaveTrainerButton (trainers/)
  → useSavedTrainers()     isSaved, toggleSaved, openLoginGate
  → useSaveToast()         centered glass toast (lib/saved-ui copy)
  → SavedTrainersProvider  LoginGateModal (single modal)
  → saved-trainers-store   per-client localStorage
```

Hearts sit in `TrainerCardSaveSlot` **outside** the card link. Nav badges use `formatSavedCountBadge` from `lib/saved-ui.ts`.

### Mobile chrome

```
(site)/layout.tsx
  ├── SiteHeader
  └── MobileBottomNavLazy   floating tabs ≤1023px (Search, Saved, Home, Discover, Profile)
```

`MobileUtilityDrawer` — hamburger menu (primary nav + legal). Saved count badge on bottom nav + desktop header heart.

### Site header (mobile + desktop)

```
SiteHeader
  ├── SiteHeaderMobile / SiteHeaderDesktop
  ├── useHeaderPanels()     utility drawer + desktop saved panel
  ├── MobileUtilityDrawer   portaled menu (mobile)
  └── SavedPanelDropdown    desktop saved panel (md+, when open)
```

### Homepage search

```
SearchBar (home/)
  └── HeroSearchSuggestionsLayer (portal to body when open)
```

One overlay system for hero; Explore uses `ExploreSearchToolbar` + `ExploreFiltersDrawer` (no hero portal).

### Welcome intro

```
SiteWelcomeIntroGateLazy → SiteWelcomeIntroGate → SmoacWelcomeIntro (brand/)
```

Site variant: overlay captures taps; do not disable `.app-main` with `pointer-events: none`.

## Mobile vs desktop patterns

| Area | Mobile | Desktop |
|------|--------|---------|
| Trainer cards | `TrainerCardCompact` | `TrainerCardGrid` |
| Nav | `SiteHeaderMobile` + `HeaderOverlayRoot` | `SiteHeaderDesktop` + inline saved dropdown |
| Explore filters | `ExploreFiltersDrawer` | Sidebar in `ExplorePageClient` |
| Page transition | No exit layer (`PageTransition`) | `AnimatePresence` + subtle motion |

## Z-index tokens (`site-chrome.css`)

Use these instead of magic numbers:

- `--z-mobile-bottom-nav` (8200)
- `--z-save-toast` (8600)
- `--z-hero-search-suggestions` (8500)
- `--z-header-overlay` (9000)
- `--z-site-header` (10000)
- `--z-modal` (1000000) — login gate
- `--z-welcome-intro` (1000001) — welcome splash

## Imports

Prefer path aliases and barrels:

- `@/types`, `@/hooks`, `@/contexts`, `@/data`
- `@/components/ui`, `@/components/trainers`, `@/components/layout`
- `@/components/explore`, `@/components/home`, `@/components/profile`, `@/components/auth`

Import from the **feature barrel** or the concrete file — avoid deep cross-feature imports when a hook/context already exists.

## Scaling checklist (new feature)

1. Types in `types/` → export from `types/index.ts`.
2. Logic in `lib/` or API client (no React in `lib/`).
3. UI in `components/{feature}/` with colocated CSS only if feature-specific.
4. Shared client state: one context or store — no duplicate modals/gates.
5. Thin `app/(site)/.../page.tsx`.
6. Document non-obvious behavior in feature `README` or this file.
7. `npm run typecheck` + `npm run build`.
