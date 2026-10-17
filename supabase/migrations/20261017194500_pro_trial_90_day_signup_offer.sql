-- Next 100 specialist signups get 90 days of complimentary Pro.
-- Founding 100 also get 90 days (was 60). Keep in step with
-- FOUNDING_PREMIUM_TRIAL_DAYS in src/lib/founding-50-invite.ts.
-- Melissa Allen, ZayFitness, and BodyByLabi are extended below from the
-- original trial start. Melissa does not consume one of the 100 slots.

create table if not exists public.pro_trial_signup_offers (
  id text primary key,
  trial_days integer not null check (trial_days > 0),
  slot_cap integer not null check (slot_cap > 0),
  slots_claimed integer not null default 0 check (slots_claimed >= 0),
  opened_at timestamptz not null default now()
);

insert into public.pro_trial_signup_offers (id, trial_days, slot_cap)
values ('next-100-90', 90, 100)
on conflict (id) do nothing;

create table if not exists public.pro_trial_signup_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  offer_id text not null references public.pro_trial_signup_offers (id),
  trial_days integer not null check (trial_days > 0),
  claimed_at timestamptz not null default now()
);

alter table public.pro_trial_signup_offers enable row level security;
alter table public.pro_trial_signup_claims enable row level security;

grant select, insert, update on table public.pro_trial_signup_offers to service_role;
grant select, insert on table public.pro_trial_signup_claims to service_role;

-- Claim one slot for a new specialist. Idempotent. Returns the granted day
-- count, or null when the offer is full or this person is not eligible.
-- Existing specialist rows are not backfilled.
create or replace function public.claim_pro_trial_signup_offer(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  offer public.pro_trial_signup_offers%rowtype;
  existing integer;
begin
  if p_user_id is null then
    return null;
  end if;

  select trial_days
  into existing
  from public.pro_trial_signup_claims
  where user_id = p_user_id;

  if found then
    return existing;
  end if;

  select *
  into offer
  from public.pro_trial_signup_offers
  where id = 'next-100-90'
  for update;

  if not found or offer.slots_claimed >= offer.slot_cap then
    return null;
  end if;

  update public.pro_trial_signup_offers
  set slots_claimed = slots_claimed + 1
  where id = offer.id;

  insert into public.pro_trial_signup_claims (user_id, offer_id, trial_days)
  values (p_user_id, offer.id, offer.trial_days);

  return offer.trial_days;
end;
$$;

revoke all on function public.claim_pro_trial_signup_offer(uuid) from public, anon, authenticated;
grant execute on function public.claim_pro_trial_signup_offer(uuid) to service_role;

create or replace function public.claim_next_pro_trial_signup_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.role is distinct from 'specialist' then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.role = 'specialist' then
    return NEW;
  end if;

  perform public.claim_pro_trial_signup_offer(NEW.user_id);
  return NEW;
exception
  when others then
    raise warning 'pro trial signup offer claim failed: %', sqlerrm;
    return NEW;
end;
$$;

revoke all on function public.claim_next_pro_trial_signup_offer() from public, anon, authenticated;

drop trigger if exists user_roles_claim_pro_trial_offer on public.user_roles;
create trigger user_roles_claim_pro_trial_offer
after insert or update of role on public.user_roles
for each row
execute function public.claim_next_pro_trial_signup_offer();

-- If go-live still writes a shorter active trial, stretch it to 90 days from
-- the original start for Founding 100 and for a claimed signup offer.
create or replace function public.lengthen_complimentary_pro_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  days integer := 30;
  promo_days integer;
  is_founding boolean := false;
  desired timestamptz;
begin
  if NEW.role is distinct from 'specialist' then
    return NEW;
  end if;
  if NEW.premium_trial_started_at is null or NEW.premium_trial_ends_at is null then
    return NEW;
  end if;
  if NEW.premium_trial_ends_at <= now() then
    return NEW;
  end if;

  select c.trial_days
  into promo_days
  from public.pro_trial_signup_claims c
  where c.user_id = NEW.user_id;

  if promo_days is not null and promo_days > days then
    days := promo_days;
  end if;

  select exists (
    select 1
    from public.specialist_applications a
    where a.user_id = NEW.user_id
      and (
        coalesce(a.application_data->>'foundingInvite', '') = 'true'
        or length(btrim(coalesce(a.application_data->>'foundingInviteCode', ''))) > 0
      )
  )
  into is_founding;

  if is_founding and 90 > days then
    days := 90;
  end if;

  desired := NEW.premium_trial_started_at + make_interval(days => days);
  if desired > NEW.premium_trial_ends_at + interval '1 minute' then
    NEW.premium_trial_ends_at := desired;
    NEW.is_premium := true;
  end if;

  return NEW;
exception
  when others then
    raise warning 'lengthen complimentary pro trial failed: %', sqlerrm;
    return NEW;
end;
$$;

revoke all on function public.lengthen_complimentary_pro_trial() from public, anon, authenticated;

drop trigger if exists user_roles_lengthen_pro_trial on public.user_roles;
create trigger user_roles_lengthen_pro_trial
before insert or update of premium_trial_started_at, premium_trial_ends_at
on public.user_roles
for each row
execute function public.lengthen_complimentary_pro_trial();

-- Stretch the three active trials that should already be 90 days.
update public.user_roles ur
set
  is_premium = true,
  premium_trial_ends_at = ur.premium_trial_started_at + interval '90 days',
  updated_at = now()
where ur.premium_trial_started_at is not null
  and ur.premium_trial_ends_at is not null
  and ur.premium_trial_ends_at > now()
  and ur.premium_trial_ends_at < ur.premium_trial_started_at + interval '89 days'
  and ur.user_id in (
    select user_id
    from public.specialist_applications
    where lower(email) in (
      'melissa@optimumcondition.com',
      'isaiahnoel1098@gmail.com',
      'bodybylabiofficial@gmail.com'
    )
      and user_id is not null
  );
