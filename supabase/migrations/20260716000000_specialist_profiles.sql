-- Phase 3c: public specialist profiles (marketplace catalog)
-- Replaces browser-only smoac_approved_specialist_profiles (+ dual-writes overrides).

create table if not exists public.specialist_profiles (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  application_id text references public.specialist_applications (id) on delete set null,
  status text not null default 'approved'
    check (status in ('approved', 'hidden', 'archived')),
  display_name text not null default '',
  profession text not null default '',
  city text not null default '',
  state text not null default '',
  neighborhood text not null default '',
  zip_code text not null default '',
  latitude double precision,
  longitude double precision,
  specialty jsonb not null default '[]'::jsonb,
  price_per_session integer not null default 0,
  service_type text,
  featured boolean not null default false,
  sponsored boolean not null default false,
  verified boolean not null default false,
  rating numeric not null default 0,
  review_count integer not null default 0,
  -- Full Trainer-shaped payload (applicationToTrainer + overrides merged)
  profile_data jsonb not null default '{}'::jsonb,
  -- SpecialistProfileOverrides patch for edit round-trip
  overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists specialist_profiles_user_id_idx
  on public.specialist_profiles (user_id);
create index if not exists specialist_profiles_status_idx
  on public.specialist_profiles (status);
create index if not exists specialist_profiles_city_idx
  on public.specialist_profiles (lower(city));
create index if not exists specialist_profiles_zip_idx
  on public.specialist_profiles (zip_code);

alter table public.specialist_profiles enable row level security;

drop trigger if exists specialist_profiles_updated_at on public.specialist_profiles;
create trigger specialist_profiles_updated_at
before update on public.specialist_profiles
for each row execute function public.touch_updated_at();

-- Public marketplace: anyone can read approved listings (guest Explore)
drop policy if exists "specialist_profiles_select_approved" on public.specialist_profiles;
create policy "specialist_profiles_select_approved"
on public.specialist_profiles for select
to anon, authenticated
using (status = 'approved');

-- Owners + admins can read all statuses (dashboard / moderation)
drop policy if exists "specialist_profiles_select_own" on public.specialist_profiles;
create policy "specialist_profiles_select_own"
on public.specialist_profiles for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "specialist_profiles_insert_own" on public.specialist_profiles;
create policy "specialist_profiles_insert_own"
on public.specialist_profiles for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "specialist_profiles_update_own" on public.specialist_profiles;
create policy "specialist_profiles_update_own"
on public.specialist_profiles for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "specialist_profiles_delete_admin" on public.specialist_profiles;
create policy "specialist_profiles_delete_admin"
on public.specialist_profiles for delete
to authenticated
using (public.is_admin());

grant select on table public.specialist_profiles to anon;
grant select, insert, update, delete on table public.specialist_profiles to authenticated;
grant all on table public.specialist_profiles to service_role;

-- Inquiry ownership: also match specialist_profiles.user_id (not only applications)
create or replace function public.owns_marketplace_specialist(p_specialist_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.specialist_applications sa
    where sa.user_id = auth.uid()
      and sa.id = p_specialist_id
  )
  or exists (
    select 1
    from public.specialist_profiles sp
    where sp.user_id = auth.uid()
      and sp.id = p_specialist_id
  );
$$;

revoke all on function public.owns_marketplace_specialist(text) from public;
grant execute on function public.owns_marketplace_specialist(text) to authenticated;
