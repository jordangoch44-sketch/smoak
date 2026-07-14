# Components

Feature-first folders. **UI primitives** live in `ui/`; **global chrome** in `layout/`.

## Folders

| Folder | Routes / usage |
|--------|----------------|
| `ui/` | Reusable controls — `Button`, `SaveButton`, `TapLink`, `Logo`, icons, toast |
| `layout/` | `SiteHeader`, `Footer`, `PageTransition`, mobile nav, saved panel, intro gate |
| `providers/` | `AppProviders` — wrap site layout only |
| `home/` | `/` — `Hero`, Sponsored, Top50, Categories, NewSpecialists |
| `explore/` | `/explore` — `ExplorePageClient`, toolbar, filters drawer, results |
| `trainers/` | Cards + `SaveTrainerButton` / `TrainerCardSaveSlot` (used on home + explore) |
| `profile/` | `/trainers/[id]` — streamlined hero, early contact CTA, Trainer Specs accordion, discovery rails, inquiry |
| `inquiry/` | Specialist profile inquiry bottom sheet + quick signup + auto-send after magic link |
| `saved/` | `/saved` + header saved panel content |
| `auth/` | `/login`, `/create-account` — forms; `SaveQuickSignupModal` mounted from `SavedTrainersProvider` |
| `dashboard/` | `/client-dashboard`, `/specialist-dashboard` |
| `brand/` | `SmoacWelcomeIntro`, wordmark |
| `rankings/` | `/rankings` |
| `dev/` | Development-only — not used in production UX paths |

## Conventions

- **Client components**: `"use client"` only when hooks, events, or browser APIs are required.
- **Page clients**: named `*PageClient.tsx` in the feature folder; `app/` pages stay server components when possible.
- **Barrels**: `index.ts` re-exports public API for the folder (`explore/index.ts`, `trainers/index.ts`).
- **Save hearts**: always `TrainerCardSaveSlot` + `SaveTrainerButton` — never put save UI inside a card `Link`.
- **Taps**: prefer `TapLink` / native `button` with `smoac-control` class for header and primary actions.

## Do not

- Add a second login-gate or save-modal system — use `SavedTrainersProvider`.
- Import site layout into `(diagnostics)/tap-test`.
- Add full-screen invisible divs for “click outside” when a portaled backdrop button works.
