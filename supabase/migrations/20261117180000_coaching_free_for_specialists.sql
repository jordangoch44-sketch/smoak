-- Rosters and sent workouts are part of the free specialist profile.
-- Paid products later are visibility (plans and boosts), not coaching access.
-- Ownership checks on each RPC stay in place.

create or replace function public.caller_is_premium_specialist()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'specialist'
  );
$$;
