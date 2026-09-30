-- Purpose: specialist_profiles.membership_plan for Free | Pro | Pro Plus.
-- Safe to re-run. PostgREST error this fixes:
--   Could not find the 'membership_plan' column of 'specialist_profiles' in the schema cache

alter table public.specialist_profiles
  add column if not exists membership_plan text not null default 'free';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'specialist_profiles_membership_plan_check'
  ) then
    alter table public.specialist_profiles
      add constraint specialist_profiles_membership_plan_check
      check (membership_plan in ('free', 'premium', 'platinum'));
  end if;
end $$;

create index if not exists specialist_profiles_membership_plan_idx
  on public.specialist_profiles (membership_plan)
  where status = 'approved' and membership_plan <> 'free';

comment on column public.specialist_profiles.membership_plan is
  'Highest active membership: free | premium (Pro) | platinum (Pro Plus)';

update public.specialist_profiles p
set membership_plan = b.plan
from public.specialist_billing b
where b.specialist_profile_id = p.id
  and b.plan in ('premium', 'platinum')
  and p.membership_plan = 'free';

update public.specialist_profiles p
set membership_plan = 'premium'
where p.is_premium = true
  and p.membership_plan = 'free';

notify pgrst, 'reload schema';
