-- Incomplete-profile reminder ledger. One row per application per kind.
-- Service role only. Stops a second cron run from sending the same note.

create table if not exists public.specialist_profile_reminder_sends (
  application_id text not null references public.specialist_applications (id) on delete cascade,
  kind text not null check (kind in ('incomplete_48h', 'incomplete_week')),
  sent_at timestamptz not null default now(),
  primary key (application_id, kind)
);

alter table public.specialist_profile_reminder_sends enable row level security;

grant all on table public.specialist_profile_reminder_sends to service_role;
