# Supabase Auth (Phase 2)

## Prerequisites

1. `.env.local` with URL, publishable key, and service role key
2. Run `npm run test:supabase` — all checks pass
3. Apply SQL migration in Supabase **SQL Editor**:

   `supabase/migrations/20260603000000_profiles_and_user_roles.sql`

## Auth redirect URLs

**Authentication → URL configuration:**

- Site URL: your public origin (`NEXT_PUBLIC_SITE_URL`)
  - Local Mac: `http://localhost:3000`
  - LAN iPhone: `http://192.168.x.x:3000` (same value as `NEXT_PUBLIC_SITE_URL`)
  - Production: `https://your-domain.com`
- Redirect URLs (add all you use):
  - `{NEXT_PUBLIC_SITE_URL}/auth/callback`
  - `{NEXT_PUBLIC_SITE_URL}/login/reset-password`
  - `{NEXT_PUBLIC_SITE_URL}/**` (optional wildcard)

Magic-link / confirm-email redirects use **only** `NEXT_PUBLIC_SITE_URL`
(never `window.location`, `0.0.0.0`, or localhost). Rebuild after changing it.
Supabase Site URL must match — if it is `http://0.0.0.0:3000`, emails will
break on iPhone even when the app sends the correct redirect.

## Email confirmation

For local dev, disable **Confirm email** under **Authentication → Providers → Email** so signup returns a session immediately.

## Admin users

1. Create a user in **Authentication → Users** (or sign up via SQL).
2. In SQL Editor, assign a role (replace `USER_UUID`):

```sql
insert into public.user_roles (user_id, role)
values ('USER_UUID', 'owner_admin')
on conflict (user_id) do update set role = excluded.role;
```

3. Sign in at `/internal/login` with that email and password.

## Signup

Client and specialist signup use **`supabase.auth.signUp`** in the browser, then insert `user_roles` and `profiles` as the **authenticated** user (RLS: `auth.uid() = user_id`).

Apply grants migration if you see `permission denied for table user_roles`:

`supabase/migrations/20260605000000_user_roles_profiles_grants_rls.sql`

Disable **Confirm email** in Supabase → Authentication → Providers → Email for dev signup (otherwise signup returns `confirm_email` before profile rows can be inserted).

After changing `.env.local`, always:

```bash
npm run build && npm run start:lan
```

Optional columns migration:

`supabase/migrations/20260604000000_profiles_zip_code_role.sql`

**Phase 3a — saved specialists:**

`supabase/migrations/20260606000000_saved_trainers.sql`

```bash
npm run test:supabase:saved
```

See [`PHASE3A_SAVED_TRAINERS.md`](./PHASE3A_SAVED_TRAINERS.md).

## Verify

```bash
npm run test:supabase
npm run typecheck
npm run build
```

Manual: client signup, specialist onboarding submit, login, logout, forgot/reset password, dashboard access by role.

**Architecture:** [`PHASE2_AUTH_ARCHITECTURE.md`](./PHASE2_AUTH_ARCHITECTURE.md) · **Phase 3 plan:** [`PHASE3_SUPABASE_MIGRATION.md`](./PHASE3_SUPABASE_MIGRATION.md)
