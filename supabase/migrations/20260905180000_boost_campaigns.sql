-- Timed Boost campaigns (duration × daily budget), separate from monthly add-ons.

alter table public.specialist_billing
  add column if not exists boost_campaign_product text,
  add column if not exists boost_campaign_ends_at timestamptz,
  add column if not exists boost_campaign_daily_cents integer,
  add column if not exists boost_campaign_days integer,
  add column if not exists boost_campaign_payment_intent_id text;

alter table public.specialist_profiles
  add column if not exists boost_campaign_product text,
  add column if not exists boost_campaign_ends_at timestamptz;

comment on column public.specialist_billing.boost_campaign_product is
  'Active timed Boost placement key (boosted_profile | category_spotlight | homepage_spotlight)';
comment on column public.specialist_billing.boost_campaign_ends_at is
  'When the timed Boost campaign stops appearing';
comment on column public.specialist_profiles.boost_campaign_product is
  'Timed Boost placement currently granted on the public listing';
comment on column public.specialist_profiles.boost_campaign_ends_at is
  'When the timed Boost on this listing expires';
