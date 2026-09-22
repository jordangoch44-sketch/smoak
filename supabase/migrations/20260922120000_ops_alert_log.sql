-- One row per phone alert so Stripe retries and double submits do not
-- email support@smoac.com twice. Service role only.

create table if not exists public.ops_alert_log (
  dedupe_key text primary key,
  kind text not null,
  created_at timestamptz not null default now()
);

alter table public.ops_alert_log enable row level security;

revoke all on table public.ops_alert_log from anon, authenticated;
grant all on table public.ops_alert_log to service_role;

comment on table public.ops_alert_log is
  'Dedupe keys for internal support@smoac.com signup and payment alerts.';
