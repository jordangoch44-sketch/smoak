# Dev-only utilities

| Path | Purpose |
|------|---------|
| `DevServiceWorkerCleanup.tsx` | Unregisters stale service workers in development (mounted only when `NODE_ENV === "development"`). |
| `/tap-test` | iPhone Safari hydration and tap probe — see `src/app/(diagnostics)/tap-test/`. Not linked from production UI. |
