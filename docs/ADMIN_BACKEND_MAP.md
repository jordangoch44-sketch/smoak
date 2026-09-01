# Admin & billing — backend map

Live Control reads use a Supabase **admin cookie session**, then a **service-role** client for `site_visits` / `specialist_billing` so RLS cannot hide platform totals. Stripe MRR uses `STRIPE_SECRET_KEY`.

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

Control does not inject demo applications or seed trainers. Sign in with a real admin account so pulse and revenue APIs can run.

## Single entry points (keep)

- **Approve / reject / save application:** `admin-applications-service.ts` only
- **Owner vs Staff permissions:** `admin-permissions.ts` only
- **Nav badge counts:** `admin-notification-counts.ts` only
