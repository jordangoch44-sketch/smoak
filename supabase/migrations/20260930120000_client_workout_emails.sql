-- Workout streak emails: client opt-out plus a ledger so the hourly cron sends each email once.

create table if not exists public.client_email_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workout_emails boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.client_email_preferences enable row level security;

drop policy if exists "client_email_preferences_select_own" on public.client_email_preferences;
create policy "client_email_preferences_select_own"
on public.client_email_preferences
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "client_email_preferences_insert_own" on public.client_email_preferences;
create policy "client_email_preferences_insert_own"
on public.client_email_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "client_email_preferences_update_own" on public.client_email_preferences;
create policy "client_email_preferences_update_own"
on public.client_email_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on table public.client_email_preferences to authenticated;
grant all on table public.client_email_preferences to service_role;

-- Server-only. period_key is the local week start (YYYY-MM-DD) the email is about.
create table if not exists public.client_workout_email_sends (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('streak_at_risk', 'streak_milestone', 'weekly_recap')),
  period_key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, period_key)
);

alter table public.client_workout_email_sends enable row level security;

grant all on table public.client_workout_email_sends to service_role;
