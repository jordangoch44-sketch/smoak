# Contexts

App-wide **client** state. Mounted in `components/providers/AppProviders.tsx` inside `(site)/layout.tsx`.

## Provider order (required)

```
AuthSessionProvider
  └── SavedTrainersProvider   // LoginGateModal portal lives here
        └── SaveToastProvider
              └── MobileBottomNavTransitionProvider  // panel slides + scroll cache (`lib/mobile-chrome.ts`)
```

Changing order can break hooks (`SaveTrainerButton` needs both saved + toast contexts).

## Contexts

| Context | Hook | Responsibility |
|---------|------|----------------|
| `AuthSessionContext` | `useAuthSession()` | Dev session, signIn/signOut |
| `SavedTrainersContext` | `useSavedTrainers()` | Saved IDs, toggle, **openLoginGate** |
| `SaveToastContext` | `useSaveToast()` | Centered save/remove confirmation toast |

## Rules

- **One login gate** — `LoginGateModal` only in `SavedTrainersProvider`.
- **One saved list source** — `saved-trainers-store`; components use `useSavedTrainers()`, not raw `localStorage`.
- **One save copy source** — toast text and nav formatters live in `lib/saved-ui.ts`.
- New global UI state: add a provider here only if multiple unrelated features need it; otherwise use a feature hook.

## Barrel

`contexts/index.ts` re-exports providers and types for `@/contexts` imports.
