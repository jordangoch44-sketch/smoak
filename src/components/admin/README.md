# Admin components

Owner + Staff platform dashboards. **Not** used on public marketplace routes.

## Layout

| Path | Role |
|------|------|
| `AdminDashboardPageClient.tsx` | Section router + handlers |
| `AdminSectionNav.tsx` | Tab nav + notification badges |
| `panels/` | One panel per admin section |
| `applications/` | Application review sheet |
| `specialists/` | Tier subcategory nav |
| `owner/` | Owner-only billing / P&L blocks |
| `charts/` | Overview donuts/bars |

## Related code

| Layer | Location |
|-------|----------|
| Services | `@/lib/admin` (barrel) |
| Mock data | `@/data/admin` |
| Types | `@/types/admin`, `@/types/admin-*` |
| Hooks | `useAdminDashboard`, `useAdminPermissions`, `useAdminSectionBadgeCounts` |
| Permissions | `@/lib/admin-permissions` (single source for Owner vs Staff) |

## Route

`/admin` — `app/(site)/admin/`
