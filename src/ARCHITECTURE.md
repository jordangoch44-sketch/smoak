# SMOAC — Source Architecture

## Folder layout

```
src/
├── app/                 # Next.js routes only (thin pages, metadata, loading)
├── components/
│   ├── ui/              # Reusable primitives (Button, Logo, icons)
│   ├── brand/           # SMOAC wordmark image (mark stays in public/smoac-mark.png)
│   ├── layout/          # Global chrome (Navbar, Footer, MobileNavMenu)
│   ├── trainers/        # Trainer listing cards (grid + compact variants)
│   ├── auth/            # Login, create-account, specialist onboarding
│   ├── dashboard/       # Client + specialist dashboards
│   ├── explore/         # /explore feature UI
│   ├── home/            # / landing sections
│   ├── profile/         # /trainers/[id] sections + floating toolbar
│   ├── providers/       # App-level React providers wrapper
│   ├── rankings/        # /rankings
│   ├── saved/           # /saved specialists
│   └── trainers/        # Trainer listing cards (grid + compact)
├── contexts/            # Auth session, saved trainers, save toast
├── data/                # Static mock data + accessors (swap for API later)
├── hooks/               # Client state hooks (e.g. useExploreTrainers, useCarousel)
├── lib/                 # Pure functions (filters, formatting, navigation config)
├── styles/              # Global CSS + design tokens
└── types/               # Shared TypeScript types
public/                  # Static assets (logo, favicons)
```

## Conventions

| Layer | Responsibility | Example |
|-------|----------------|---------|
| `app/` | Routing, SEO, page composition | `explore/page.tsx` imports `ExplorePageClient` |
| `components/ui/` | Design-system pieces, no business rules | `Button`, `TrainerThumbnail` |
| `components/{feature}/` | Feature-specific UI | `ExploreFiltersDrawer` |
| `data/` | Raw data + simple getters | `getTrainerById` |
| `lib/` | Domain logic without React | `filterExploreTrainers` |
| `hooks/` | React state + effects | `useExploreTrainers` |
| `types/` | Interfaces shared across layers | `Trainer`, `TrainerFilters` |

## Mobile vs desktop

- **Trainer cards**: `TrainerCard` renders `TrainerCardCompact` (`md:hidden`) + `TrainerCardGrid` (`hidden md:flex`). Same responsive behavior on Explore and home.
- **Navigation**: `MobileNavMenu` is mobile-only; desktop links live in `Navbar`.
- **Explore filters**: `ExploreFiltersDrawer` (mobile sheet) vs sidebar in `ExplorePageClient` (lg+).

## Imports

Prefer barrel exports where provided:

- `@/types` — all shared types
- `@/components/ui`, `@/components/trainers`, `@/components/layout`
- `@/components/auth`, `@/components/explore`, `@/components/home`, `@/components/profile`
- `@/contexts` — client providers (`SavedTrainersProvider`, `SaveToastProvider`)
- `@/data` — mock data accessors
- `@/hooks` — client hooks

## Adding features

1. Add types in `types/`, re-export from `types/index.ts`.
2. Add data or API helpers in `data/` or `lib/`.
3. Build UI in `components/{feature}/`.
4. Keep `app/{route}/page.tsx` as a thin wrapper.
