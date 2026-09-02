-- Public listing entitlement: Free | Pro (`premium`) | Pro Plus (`platinum`).
-- Stripe/DB key for Pro Plus stays `platinum`. Display name is Pro Plus.

alter table public.specialist_profiles
  add column if not exists membership_plan text not null default 'free'
    check (membership_plan in ('free', 'premium', 'platinum'));

create index if not exists specialist_profiles_membership_plan_idx
  on public.specialist_profiles (membership_plan)
  where status = 'approved' and membership_plan <> 'free';

comment on column public.specialist_profiles.membership_plan is
  'Highest active membership: free | premium (Pro) | platinum (Pro Plus)';

update public.specialist_profiles p
set membership_plan = b.plan
from public.specialist_billing b
where b.specialist_profile_id = p.id
  and b.plan in ('premium', 'platinum');

update public.specialist_profiles p
set membership_plan = 'premium'
where p.is_premium = true
  and p.membership_plan = 'free';
