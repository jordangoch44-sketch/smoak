-- Fix "permission denied for table user_roles" during signup.
--
-- Postgres requires table-level GRANTs in addition to RLS policies.
-- service_role bypasses RLS but still needs GRANT on tables.
-- authenticated users need GRANT + RLS policies for signup inserts.

-- Schema access
grant usage on schema public to anon, authenticated, service_role;

-- service_role: full access (server scripts, admin client, table probes)
grant all on table public.user_roles to service_role;
grant all on table public.profiles to service_role;

-- authenticated: own-row read/write (signup + profile updates)
grant select, insert, update on table public.user_roles to authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- enum used in INSERT payloads
grant usage on type public.app_role to authenticated, service_role;

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;

-- user_roles policies (auth.uid() = user_id)
drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_roles_insert_own" on public.user_roles;
create policy "user_roles_insert_own"
on public.user_roles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_roles_update_own" on public.user_roles;
create policy "user_roles_update_own"
on public.user_roles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_roles_select_admin" on public.user_roles;
create policy "user_roles_select_admin"
on public.user_roles
for select
to authenticated
using (public.is_admin());

-- profiles policies (auth.uid() = user_id)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- profiles columns used by signup (dashboard greeting, admin queries)
alter table public.profiles
  add column if not exists zip_code text not null default '';

alter table public.profiles
  add column if not exists role public.app_role;

update public.profiles
set zip_code = client_zip_code
where zip_code = '' and client_zip_code <> '';

update public.profiles p
set role = ur.role
from public.user_roles ur
where p.user_id = ur.user_id and p.role is null;
