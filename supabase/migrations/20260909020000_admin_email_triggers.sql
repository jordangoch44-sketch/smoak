-- Widen admin email trigger kinds for approval + 30-day inactive.

alter table public.admin_emails drop constraint if exists admin_emails_trigger_kind_check;

alter table public.admin_emails
  add constraint admin_emails_trigger_kind_check
  check (trigger_kind in (
    'after_signup',
    'after_approval',
    'profile_incomplete',
    'weekly',
    'inactive',
    'one_time',
    'custom'
  ));
