-- Client workout logs follow the account, not the browser.
-- One row per client. The log is the same shape the dashboard already saves locally.

create table if not exists public.client_workout_logs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  log jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.client_workout_logs enable row level security;

drop policy if exists "client_workout_logs_select_own" on public.client_workout_logs;
create policy "client_workout_logs_select_own"
on public.client_workout_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "client_workout_logs_insert_own" on public.client_workout_logs;
create policy "client_workout_logs_insert_own"
on public.client_workout_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "client_workout_logs_update_own" on public.client_workout_logs;
create policy "client_workout_logs_update_own"
on public.client_workout_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on table public.client_workout_logs to authenticated;
grant all on table public.client_workout_logs to service_role;
