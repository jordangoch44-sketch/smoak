-- Stripe billing: store aggregated plan + add-ons from webhook sync.
-- Placement flags on specialist_profiles remain the runtime entitlement source;
-- this table mirrors Stripe settlement for admin / portal.

alter table public.specialist_billing
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium', 'platinum'));

alter table public.specialist_billing
  add column if not exists active_addons text[] not null default '{}';

alter table public.specialist_profiles
  add column if not exists category_spotlight boolean not null default false;

comment on column public.specialist_billing.plan is
  'Highest active Stripe membership: free | premium | platinum';
comment on column public.specialist_billing.active_addons is
  'Active paid placement product keys from Stripe subscriptions';
comment on column public.specialist_profiles.category_spotlight is
  'Paid category spotlight entitlement (Stripe add-on)';
