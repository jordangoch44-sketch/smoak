<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SMOAC — Agent guide (read first)

Luxury wellness marketplace (Next.js 16 App Router, React 19, Tailwind v4). **Preserve working behavior before adding features.** Prefer deleting dead code over stacking patches.

## Start here

| Doc | Purpose |
|-----|---------|
| [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md) | Folder layout, layers, routes, core flows |
| [`README.md`](README.md) | Dev setup, iPhone/LAN testing, scripts |
| [`src/components/README.md`](src/components/README.md) | Feature folders + UI rules |
| [`src/lib/README.md`](src/lib/README.md) | Domain modules (no React) |
| [`src/contexts/README.md`](src/contexts/README.md) | Global client state + provider order |

## Route map (`src/app`)

| Route group | URL examples | Layout / notes |
|-------------|--------------|----------------|
| `(site)` | `/`, `/explore`, `/trainers/[id]`, `/saved`, `/login` | `SiteHeader`, `AppProviders`, `site-shell.css` |
| `(diagnostics)` | `/tap-test` | **No** site chrome — hydration/tap probe only |
| Root `layout.tsx` | All routes | Fonts, `globals.css`, metadata |

Pages stay **thin**: metadata + import a `*PageClient` or section components from `components/{feature}/`.

## Provider stack (site routes only)

```
AuthSessionProvider
  └── SavedTrainersProvider  ← login gate modal + saved IDs store
        └── SaveToastProvider
              └── children
```

- **Save heart**: `SaveTrainerButton` → `useSavedTrainers()` + `useSaveToast()`. Gate is **only** `LoginGateModal` in `SavedTrainersProvider`.
- **Auth**: `useAuthSession()` — dev sessions in `localStorage` via `lib/auth-session-store.ts`.

## Interaction rules (do not regress)

1. **No new full-screen `pointer-events: none` on `.app-main`** — use a portaled overlay with `pointer-events: auto` instead (`login-gate`, welcome intro pattern).
2. **Hero search suggestions**: portaled `HeroSearchSuggestionsLayer` — root layer stays `pointer-events: none` in `home.css`; only backdrop/panel get taps. Do **not** add `.hero-search-suggestions-layer` to the blanket `pointer-events: auto !important` list in `site-chrome.css`.
3. **iOS Safari scroll lock**: use body classes + `.app-main { overflow: hidden }` under `@supports (-webkit-touch-callout: none)` in `globals.css` — never `touch-action: none` on `body`, avoid inline `body.style.overflow` in modals.
4. **Mobile page transitions**: `PageTransition` skips `AnimatePresence` on mobile — do not reintroduce exit layers that steal taps.
5. **Save control**: real `<button>`, heart **outside** card `<Link>`, `data-save-control` on slot — use `onClick` + `stopPropagation`, not pointer-up/click dedupe hacks.
6. **Header overlays**: mount only when open (`HeaderOverlayRoot`, desktop `SavedPanelDropdown` in `SiteHeader`).

## CSS organization

| File | Scope |
|------|--------|
| `globals.css` | Tokens, Tailwind, scroll-lock, imports `site-chrome`, `login-gate`, `mobile-safari` |
| `site-shell.css` | Homepage + header panels (`home`, `saved-panel`, `create-account-intro`) |
| `site-chrome.css` | Header, z-index tokens, tap allowlist for controls |
| Feature CSS | `explore.css`, `profile.css`, `dashboard.css`, etc. |

## Adding a feature (checklist)

1. Types → `src/types/` (+ `types/index.ts`).
2. Data/API helpers → `src/data/` or `src/lib/` (pure TS, no hooks).
3. UI → `src/components/{feature}/` (+ `index.ts` barrel if multiple exports).
4. Client state → `src/contexts/` or `src/hooks/` (one source of truth).
5. Route → `src/app/(site)/{route}/page.tsx` only.
6. Run `npm run typecheck` and `npm run build`.

## Dev accounts (mock)

- Client: `client@smoac.com` / `client123`
- Specialist: use login page specialist flow / dev helpers in `lib/dev-auth.ts`

## iPhone testing

Use `npm run dev:lan` and the Mac LAN IP — not `localhost` on device. See `README.md` and `/tap-test`.

## Deprecated (do not reintroduce)

- `SaveGateContext` / `SaveGateProvider` — use `useSavedTrainers().openLoginGate`
- `Navbar` import — use `SiteHeader`
- Per-card login modals — gate is global on `SavedTrainersProvider`
