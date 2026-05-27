# Hooks

Client-side React hooks. Re-exported from `hooks/index.ts` for `@/hooks` imports.

## Common hooks

| Hook | Use |
|------|-----|
| `useAuthSession` | Current dev session |
| `useSavedTrainers` | Saved specialist IDs + `openLoginGate` |
| `useExploreTrainers` | Explore filters + filtered list |
| `useHeaderPanels` | Mobile/desktop header menu state |
| `useHydrated` / `useStableClientState` | Avoid hydration mismatch for client-only UI |
| `useTrainerWithOverrides` | Profile overrides from specialist store |
| `useAdminDashboard` | Admin data + application/specialist actions |
| `useAdminPermissions` | Owner vs Staff section access |
| `useAdminSectionBadgeCounts` | Nav notification badges |

## Conventions

- Hooks may call `lib/*` stores and `contexts/*` — not the reverse.
- Prefer `useSyncExternalStore` for localStorage-backed data (see `lib/*-store.ts`).
- Feature-specific hooks can live next to the feature if only used once; promote here when shared.
