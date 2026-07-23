-- Phase 3d: durable admin placement + entitlement flags on specialist_profiles.
-- Hide remains status (approved | hidden | archived). Featured/sponsored already exist.

alter table public.specialist_profiles
  add column if not exists top_ranked boolean not null default false;

alter table public.specialist_profiles
  add column if not exists is_premium boolean not null default false;

create index if not exists specialist_profiles_top_ranked_idx
  on public.specialist_profiles (top_ranked)
  where status = 'approved' and top_ranked;

create index if not exists specialist_profiles_is_premium_idx
  on public.specialist_profiles (is_premium)
  where status = 'approved' and is_premium;

-- Admins can update any user_roles row (e.g. is_premium entitlement).
drop policy if exists "user_roles_update_admin" on public.user_roles;
create policy "user_roles_update_admin"
on public.user_roles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
