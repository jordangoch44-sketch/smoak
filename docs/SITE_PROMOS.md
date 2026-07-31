# SMOAC house promos

Fixed **slots** in the UI; swappable **campaigns** in `src/data/site-promos.ts`.

## Slots

| Slot ID | Surface |
|---------|---------|
| `specialist_dashboard_hero` | Specialist Plan tab (top) |
| `specialist_dashboard_boost` | Plan tab + Pro analytics |
| `explore_results_rail` | Explore results (specialists) |
| `home_mid_promo` | Homepage between Top Rated and Categories |
| `rankings_footer_promo` | City Rankings footer |

## Rotate a deal

1. Edit or add a campaign in `src/data/site-promos.ts`
2. Set `slotIds`, `audience`, `priority`, `startsAt` / `endsAt`, `active`
3. Deploy — no layout changes required

Paid specialist placements (Sponsored / Featured / etc.) never use these slots.
