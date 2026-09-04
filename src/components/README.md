# Components

Feature-first folders. **UI primitives** live in `ui/`; **global chrome** in `layout/`.

## Folders

| Folder | Routes / usage |
|--------|----------------|
| `ui/` | Reusable controls — `Button`, `SaveButton`, `TapLink`, `Logo`, icons, toast |
| `layout/` | `SiteHeader`, `Footer`, `PageTransition`, mobile nav, saved panel, intro gate |
| `legal/` | Footer-linked pages — `LegalDocumentPage` + `lib/legal-content.ts` |
| `providers/` | `AppProviders` — wrap site layout only |
| `home/` | `/` — `Hero`, Sponsored, Featured, Categories, NewSpecialists |
| `explore/` | `/explore` — `ExplorePageClient`, toolbar, filters drawer, results |
| `trainers/` | Cards + `SaveTrainerButton` / `TrainerCardSaveSlot` (used on home + explore) |
| `profile/` | `/trainers/[id]` — hero, SMOAC + Google reviews (separate), inquiry, gallery, specs accordion |
| `inquiry/` | Specialist profile inquiry bottom sheet + quick signup + auto-send after magic link |
| `saved/` | `/saved` + header saved panel content |
| `auth/` | `/login`, `/create-account` — forms; `QuickClientAccountAuthUI` shared by save modal + inquiry sheet |
| `dashboard/` | `/client-dashboard`, `/specialist-dashboard` |
| `brand/` | `SmoacWelcomeIntro`, wordmark |
| `rankings/` | `/rankings` — `RankingsHero` + board |
| `dev/` | Development-only — not used in production UX paths |

## Conventions

- **Client components**: `"use client"` only when hooks, events, or browser APIs are required.
- **Page clients**: named `*PageClient.tsx` in the feature folder; `app/` pages stay server components when possible.
- **Imports (barrel policy)**:
  - **Default:** direct paths — `@/hooks/useAuthSession`, `@/components/trainers/SaveTrainerButton`.
  - **Optional barrels:** only import symbols that `index.ts` actually exports (trimmed to route clients + a few cross-feature exports). See `ARCHITECTURE.md` → Imports.
  - **`@/types`** is the exception — shared types import from `@/types`.
- **Save hearts**: always `TrainerCardSaveSlot` + `SaveTrainerButton` — never put save UI inside a card `Link`.
- **Taps**: prefer `TapLink` / native `button` with `smoac-control` class for header and primary actions.

## Do not

- Add a second login-gate or save-modal system — use `SavedTrainersProvider`.
- Import site layout into `(diagnostics)/tap-test`.
- Add full-screen invisible divs for “click outside” when a portaled backdrop button works.
