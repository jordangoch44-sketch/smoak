# Admin & billing — backend map

Live paths prefer Stripe settlement + Supabase. Control never invents demo traffic or catalog-flag revenue.

## Live today

| Domain | Module / API |
|--------|----------------|
| Owner Revenue (MRR + collected week) | `/api/admin/revenue`, `AdminOwnerRevenuePanel`, `fetchStripeMrrCents`, `fetchStripeCollectedWeek` |
| Overview pulse | `/api/admin/platform-pulse` — roster counts, `site_visits` (7/14/30d), Stripe MRR + invoice series |
| Specialists roster $ | `/api/admin/revenue` billing rows (`plan` + `active_addons`) — not profile flags |
| Pro trial vs paid Pro | `/api/admin/specialist-entitlements` |
| Boost / Pro checkout | `/api/stripe/subscription-intent` (Elements), `/api/stripe/checkout` (Pro redirect) |
| Ad spend (specialist) | `/api/stripe/billing-summary` |

## Local-only when marketplace Supabase is off

| Domain | Current module |
|--------|----------------|
| Applications seed merge | `admin-applications-seed.ts` — skipped when `isMarketplaceSupabaseActive()` |
| Permissions | `admin-permissions.ts` |

## Single entry points (keep)

- **Approve / reject / save application:** `admin-applications-service.ts` only
- **Owner vs Staff permissions:** `admin-permissions.ts` only
- **Nav badge counts:** `admin-notification-counts.ts` only
