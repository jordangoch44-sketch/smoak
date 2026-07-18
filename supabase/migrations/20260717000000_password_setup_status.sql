-- Track whether a passwordless quick-signup user still needs first-time setup.
alter table public.profiles
  add column if not exists password_setup_status text not null default 'complete';

comment on column public.profiles.password_setup_status is
  'pending = first quick-signup OTP (send to /complete-account); complete = password set; skipped = chose ongoing passwordless login';

-- Existing rows keep default complete so returning users are not forced through setup.
update public.profiles
set password_setup_status = 'complete'
where password_setup_status is null or password_setup_status = '';
