-- Phase 3a: client saved specialists (shortlist hearts)
-- user_id references auth.users (same uuid as public.profiles.user_id for clients).

create table public.saved_trainers (
  user_id uuid not null references auth.users (id) on delete cascade,
  specialist_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, specialist_id)
);

create index saved_trainers_user_id_idx on public.saved_trainers (user_id);
create index saved_trainers_specialist_id_idx on public.saved_trainers (specialist_id);

alter table public.saved_trainers enable row level security;

-- Clients read only their own shortlist
drop policy if exists "saved_trainers_select_own" on public.saved_trainers;
create policy "saved_trainers_select_own"
on public.saved_trainers
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_trainers_insert_own" on public.saved_trainers;
create policy "saved_trainers_insert_own"
on public.saved_trainers
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_trainers_delete_own" on public.saved_trainers;
create policy "saved_trainers_delete_own"
on public.saved_trainers
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on table public.saved_trainers to authenticated;
grant all on table public.saved_trainers to service_role;
