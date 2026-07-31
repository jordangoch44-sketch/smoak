# Admin & billing — backend map

Live paths prefer Stripe settlement + Supabase. Catalog estimates remain for specialist tier entitlement projection only.

## Live today

| Domain | Module / API |
|--------|----------------|
| Owner Revenue (MRR) | `/api/admin/revenue`, `AdminOwnerRevenuePanel`, `sync-subscription.ts` |
| Specialist billing projection | `admin-specialist-billing-catalog.ts`, `getAdminOwnerRevenueDashboard` (flags × list price) |
| Boost / Pro checkout | `/api/stripe/subscription-intent` (Elements), `/api/stripe/checkout` (Pro redirect) |
| Ad spend (specialist) | `/api/stripe/billing-summary` |
| Platform pulse | `admin-platform-pulse-service.ts` |

## Still local / seed (optional later)

| Domain | Current module |
|--------|----------------|
| Applications seed merge | `admin-applications-seed.ts` |
| Owner alert issues seed | `admin-notification-issues-seed.ts` |
| Permissions | `admin-permissions.ts` |

## Single entry points (keep)

- **Approve / reject / save application:** `admin-applications-service.ts` only
- **Owner vs Staff permissions:** `admin-permissions.ts` only
- **Nav badge counts:** `admin-notification-counts.ts` only
