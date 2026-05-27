# Admin & billing — future backend map

Frozen feature set (May 2026). Mock/local today; wire to Supabase + Stripe without moving UI folders.

## Supabase (later)

| Domain | Current module | Suggested table(s) |
|--------|----------------|-------------------|
| Applications | `admin-applications-service.ts`, `specialist-application-storage.ts` | `specialist_applications`, `application_status` |
| Specialist admin meta | `admin-specialist-meta-store.ts` | `specialist_admin_meta` |
| Clients | `admin-clients-service.ts` | `profiles`, `client_accounts` |
| Notification dismissals | `admin-notification-issues-store.ts` | `admin_notification_dismissals` |
| Owner alerts | `data/admin-notification-issues-seed.ts` | `admin_alerts` |
| Permissions | `admin-permissions.ts`, `types/admin-permissions.ts` | `admin_users.role` |

## Stripe (later)

| Domain | Current module | Suggested Stripe objects |
|--------|----------------|-------------------------|
| Tiers (Free/Premium/Platinum) | `data/admin-specialist-billing-catalog.ts`, `admin-specialist-billing-service.ts` | Products + Prices per tier |
| Add-ons | `SPECIALIST_AD_ADDON_CATALOG` | Additional Products (boost, spotlight, ranking) |
| MRR / revenue | `admin-specialist-billing-service.ts`, `admin-owner-financials-service.ts` | Subscriptions + invoice webhooks |
| Legacy overview revenue | `admin-revenue-service.ts`, `data/admin-revenue-seed.ts` | Reporting sync or retire when owner P&L is live |

## Single entry points (keep)

- **Approve / reject / save application:** `admin-applications-service.ts` only
- **Owner vs Staff permissions:** `admin-permissions.ts` only
- **Nav badge counts:** `admin-notification-counts.ts` only
