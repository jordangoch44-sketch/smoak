# Types

Shared TypeScript interfaces. Import from `@/types` (barrel: `types/index.ts`).

## Files

| File | Domain |
|------|--------|
| `trainer.ts` | `Trainer`, reviews, media |
| `filters.ts` | Explore filter state |
| `auth.ts` | `AuthSession`, roles |
| `marketing.ts` | Categories, testimonials |
| `specialist-dashboard.ts` | Dashboard types |
| `trainer-market-value.ts` | Market value card |
| `admin.ts` | Admin specialist visibility, clients, overview stats |
| `admin-permissions.ts` | Owner vs Staff permission flags |
| `admin-notifications.ts` | Nav badge + alert issue types |
| `admin-specialist-billing.ts` | Tier + add-on billing records |
| `admin-revenue.ts` | Legacy overview revenue dashboard seed shape |
| `admin-owner-financials.ts` | Owner P&L snapshot |
| `specialist-application.ts` | Join-flow application payload |

Add new cross-cutting types here; feature-only types may live next to the feature until reused.
