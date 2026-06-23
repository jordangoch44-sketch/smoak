-- Marketplace profiles + roles (Phase 2 auth)
-- Run in Supabase SQL Editor or via CLI after linking project.

create type public.app_role as enum (
  'client',
  'specialist',
  'owner_admin',
  'staff_admin'
);

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  is_premium boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  client_goals jsonb not null default '[]'::jsonb,
  client_city text not null default '',
  client_neighborhood text not null default '',
  client_zip_code text not null default '',
  client_budget text not null default '',
  client_training_style text not null default '',
  specialist_type text not null default '',
  specialist_city text not null default '',
  specialist_neighborhood text not null default '',
  specialist_format text not null default '',
  specialist_starting_price text not null default '',
  onboarding_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('owner_admin', 'staff_admin')
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_roles_updated_at
before update on public.user_roles
for each row execute function public.touch_updated_at();

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- user_roles policies
create policy "user_roles_select_own"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

create policy "user_roles_insert_own"
on public.user_roles for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_roles_update_own"
on public.user_roles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_roles_select_admin"
on public.user_roles for select
to authenticated
using (public.is_admin());

-- profiles policies
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_admin());

grant usage on schema public to authenticated, service_role;
grant select, insert, update on public.user_roles to authenticated, service_role;
grant select, insert, update on public.profiles to authenticated, service_role;
grant usage on type public.app_role to authenticated, service_role;
