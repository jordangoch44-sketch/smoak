-- Stripe billing state for specialists (webhook-synced).
-- Admin flags (is_premium) remain the feature gate; this table is the Stripe mirror.

create table if not exists public.specialist_billing (
  user_id uuid primary key references auth.users (id) on delete cascade,
  specialist_profile_id text references public.specialist_profiles (id) on delete set null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'none'
    check (
      status in (
        'none',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused'
      )
    ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists specialist_billing_customer_idx
  on public.specialist_billing (stripe_customer_id);

create index if not exists specialist_billing_subscription_idx
  on public.specialist_billing (stripe_subscription_id);

create index if not exists specialist_billing_status_idx
  on public.specialist_billing (status);

alter table public.specialist_billing enable row level security;

drop trigger if exists specialist_billing_updated_at on public.specialist_billing;
create trigger specialist_billing_updated_at
before update on public.specialist_billing
for each row execute function public.touch_updated_at();

-- Specialists read own billing row; admins read all
drop policy if exists "specialist_billing_select_own" on public.specialist_billing;
create policy "specialist_billing_select_own"
on public.specialist_billing for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

-- Writes only via service role (webhooks / server)
revoke insert, update, delete on public.specialist_billing from authenticated;
grant select on public.specialist_billing to authenticated;
grant all on public.specialist_billing to service_role;
