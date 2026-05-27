# Data

Static mock content for the marketplace. **Replace with API/fetch layer later** without moving UI folders.

## Files

| File | Contents |
|------|----------|
| `trainers.ts` | Specialist listings + `getTrainerById` |
| `goals.ts` / `marketplace-specialties.ts` | Category chips |
| `city-rankings.ts` | Top 50 mock |
| `dashboard-mock.ts` | Dashboard placeholders |
| `admin/*` | Admin mock seeds (applications, billing, revenue, notifications) — barrel `@/data/admin` |

## Conventions

- Keep accessors (`getTrainerById`) in this folder or thin wrappers in `lib/`.
- Do not import React here.
- Types come from `@/types`; data objects should satisfy those interfaces.
