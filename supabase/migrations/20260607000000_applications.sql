-- Phase 3b: client + specialist applications (admin review queue)
-- Durable marketplace intake — replaces browser localStorage for multi-device.

create table public.client_applications (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'REJECTED', 'ARCHIVED')),
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  preferred_city text not null default '',
  preferred_neighborhood text not null default '',
  preferred_zip_code text not null default '',
  fitness_goals jsonb not null default '[]'::jsonb,
  preferred_specialist_categories jsonb not null default '[]'::jsonb,
  budget text not null default '',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_applications_user_id_idx
  on public.client_applications (user_id);
create index client_applications_email_idx
  on public.client_applications (lower(email));
create index client_applications_status_idx
  on public.client_applications (status);

create table public.specialist_applications (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  profile_status text not null default 'PENDING_APPROVAL'
    check (
      profile_status in (
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'ARCHIVED'
      )
    ),
  email text not null,
  -- Full SpecialistApplication payload (password stripped before write)
  application_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create index specialist_applications_user_id_idx
  on public.specialist_applications (user_id);
create index specialist_applications_email_idx
  on public.specialist_applications (lower(email));
create index specialist_applications_status_idx
  on public.specialist_applications (profile_status);

alter table public.client_applications enable row level security;
alter table public.specialist_applications enable row level security;

create trigger client_applications_updated_at
before update on public.client_applications
for each row execute function public.touch_updated_at();

create trigger specialist_applications_updated_at
before update on public.specialist_applications
for each row execute function public.touch_updated_at();

-- Clients: own rows
drop policy if exists "client_applications_select_own" on public.client_applications;
create policy "client_applications_select_own"
on public.client_applications for select to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "client_applications_insert_own" on public.client_applications;
create policy "client_applications_insert_own"
on public.client_applications for insert to authenticated
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "client_applications_update_own" on public.client_applications;
create policy "client_applications_update_own"
on public.client_applications for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- Specialists: own rows; admins full access
drop policy if exists "specialist_applications_select_own" on public.specialist_applications;
create policy "specialist_applications_select_own"
on public.specialist_applications for select to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "specialist_applications_insert_own" on public.specialist_applications;
create policy "specialist_applications_insert_own"
on public.specialist_applications for insert to authenticated
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "specialist_applications_update_own" on public.specialist_applications;
create policy "specialist_applications_update_own"
on public.specialist_applications for update to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

grant select, insert, update on table public.client_applications to authenticated;
grant select, insert, update on table public.specialist_applications to authenticated;
grant all on table public.client_applications to service_role;
grant all on table public.specialist_applications to service_role;
