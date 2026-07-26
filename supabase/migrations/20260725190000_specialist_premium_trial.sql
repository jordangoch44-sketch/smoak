-- Specialist signup Pro trial: 30 days free, then drop to free unless Stripe paid.

alter table public.user_roles
  add column if not exists premium_trial_started_at timestamptz;

alter table public.user_roles
  add column if not exists premium_trial_ends_at timestamptz;

alter table public.user_roles
  add column if not exists premium_trial_ended_notified_at timestamptz;

create index if not exists user_roles_premium_trial_ends_idx
  on public.user_roles (premium_trial_ends_at)
  where premium_trial_ends_at is not null and role = 'specialist';
