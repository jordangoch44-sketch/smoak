-- Remember the OTG sample-account walkthrough on the account.
-- Safari private browsing drops the browser copy, which replayed it every login.

alter table public.user_roles
  add column if not exists specialist_tour_completed_at timestamptz;

update public.user_roles ur
set specialist_tour_completed_at = coalesce(ur.specialist_tour_completed_at, now())
where ur.specialist_tour_completed_at is null
  and ur.user_id in (
    select id from auth.users where lower(email) = 'jordan@otgtrain.com'
    union
    select user_id from public.profiles where lower(email) = 'jordan@otgtrain.com'
  );
