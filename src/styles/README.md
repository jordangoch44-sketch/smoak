# Styles

CSS is split by **scope**, not one giant file.

## Load order

1. **`globals.css`** (root layout) — Tailwind, tokens, scroll-lock, imports:
   - `interaction.css`, `brand.css`, `atmosphere.css`, `aurora.css`, `aurora-atmosphere.css`
   - `save-button.css`, `save-toast.css`, `toast.css`
   - `site-chrome.css`, `login-gate.css`, `mobile-safari.css`
2. **`site-shell.css`** (`(site)/layout`) — `home.css`, `page-transition.css`, header panels
3. **Feature CSS** — imported from route layouts or components as needed (`explore.css`, `explore-search-overlay.css`, `profile.css`, `login.css`, `dashboard.css`, …)

## Interaction-critical files

| File | Notes |
|------|--------|
| `site-chrome.css` | Z-index tokens, decorative `pointer-events: none`, control allowlist |
| `globals.css` | iOS scroll-lock exceptions for overlays |
| `home.css` | Hero search portal — layer root `pointer-events: none` |
| `page-transition.css` | Desktop exit layers `pointer-events: none` |

Before adding `pointer-events` or new fixed overlays, read [`AGENTS.md`](../../AGENTS.md) interaction section.
