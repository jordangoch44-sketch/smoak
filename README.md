# SMOAC

A luxury wellness specialist marketplace — Next.js 16, TypeScript, Tailwind v4.

**For Cursor / contributors:** read [`AGENTS.md`](AGENTS.md) first, then [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md).

## Tech stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Framer Motion (desktop transitions, reduced on mobile)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### iPhone / LAN testing

Use **one dev server on port 3000**. From a phone, use your Mac’s LAN IP (not `localhost`):

```bash
npm run dev:lan
```

Verify hydration: `http://<mac-ip>:3000/tap-test` — inline script YES, React hydration YES, taps increment.

Details: [`AGENTS.md`](AGENTS.md) and [`src/app/(diagnostics)/tap-test/page.tsx`](src/app/(diagnostics)/tap-test/page.tsx).

## Supabase Storage (optional)

Specialist profile/cover/gallery uploads are prepared under `src/lib/supabase/`. Copy `.env.example` → `.env.local` and see [`docs/SUPABASE_STORAGE.md`](docs/SUPABASE_STORAGE.md). The app runs without Supabase in local mock mode.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 3000) |
| `npm run dev:lan` | Dev on `0.0.0.0` for device testing |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Routes

| Route | Feature folder |
|-------|----------------|
| `/` | `components/home/` |
| `/explore` | `components/explore/` |
| `/trainers/[id]` | `components/profile/` |
| `/saved` | `components/saved/` |
| `/login`, `/create-account` | `components/auth/` |
| `/rankings` | `components/rankings/` |
| `/client-dashboard`, `/specialist-dashboard` | `components/dashboard/` |
| `/tap-test` | Diagnostics only (no site chrome) |

## Project structure

```
src/
├── app/              # Routes — (site) product, (diagnostics) tap-test
├── components/       # Feature UI (+ ui/, layout/, providers/)
├── contexts/         # Auth, saved trainers, save toast
├── hooks/            # Client hooks
├── lib/              # Pure TS stores & domain logic
├── data/             # Mock data (replace with API later)
├── types/            # Shared TypeScript types
└── styles/           # Global + feature CSS
```

See [`src/components/README.md`](src/components/README.md), [`src/lib/README.md`](src/lib/README.md), [`src/contexts/README.md`](src/contexts/README.md).

## Dev login (mock)

- Client: `client@smoac.com` / `client123`
