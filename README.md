# SMOAC

A modern luxury personal trainer marketplace. Apple/Tesla-inspired minimal design with a premium black, white, and graphite aesthetic.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, search, featured trainers, categories, testimonials |
| `/explore` | Trainer grid with location, specialty, gender, and price filters |
| `/trainers/[id]` | Trainer profile — bio, certifications, reviews, social links, book consultation |

## Project Structure

```
src/
├── app/              # Next.js pages & layouts
├── components/       # UI components (home, explore, profile, layout)
├── data/             # Placeholder trainer, category, testimonial data
├── lib/              # Utilities (filtering, formatting)
└── types/            # TypeScript interfaces
```

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
