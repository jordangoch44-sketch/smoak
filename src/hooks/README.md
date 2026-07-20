# Hooks

Client-side React hooks. **Prefer direct imports:** `@/hooks/useAuthSession`.

`hooks/index.ts` is an optional catalog barrel (not used by app code today). See `ARCHITECTURE.md` → Imports.

## Common hooks

| Hook | Use |
|------|-----|
| `useAuthSession` | Current dev session |
| `useSavedTrainers` | Saved specialist IDs + `openSaveQuickSignup` |
| `useExploreTrainers` | Explore filters + filtered list (also records recent searches) |
| `useSpecialistReviews` | Live SMOAC reviews on specialist profiles (Supabase) |
| `useHeaderPanels` | Mobile/desktop header menu state |
| `useHydrated` / `useStableClientState` | Avoid hydration mismatch for client-only UI |
| `useTrainerWithOverrides` | Profile overrides from specialist store |
| `useAdminDashboard` | Admin data + application/specialist actions |
| `useAdminPermissions` | Owner vs Staff section access |
| `useAdminSectionBadgeCounts` | Nav notification badges |

## Recent searches (write-only)

Explore saves the last six search queries via `recordRecentSearch` in `useExploreTrainers`.
There is no read hook or UI yet — storage lives in `lib/recent-searches-store.ts`.
When adding chips to Explore, subscribe with `useSyncExternalStore` (see module comment in that file).

## Conventions

- Hooks may call `lib/*` stores and `contexts/*` — not the reverse.
- Prefer `useSyncExternalStore` for localStorage-backed data (see `lib/*-store.ts`).
- Feature-specific hooks can live next to the feature if only used once; promote here when shared.
