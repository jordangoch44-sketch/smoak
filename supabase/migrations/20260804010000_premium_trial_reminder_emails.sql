-- Mid-trial + last-day Pro trial reminder email stamps (idempotent cron sends).

alter table public.user_roles
  add column if not exists premium_trial_day10_emailed_at timestamptz;

alter table public.user_roles
  add column if not exists premium_trial_day20_emailed_at timestamptz;

alter table public.user_roles
  add column if not exists premium_trial_last_day_emailed_at timestamptz;
