-- Admin complimentary membership grants (override Stripe / trial).
-- admin_override_ends_at NULL means the grant does not expire.

alter table public.specialist_billing
  add column if not exists admin_override_plan text
    check (
      admin_override_plan is null
      or admin_override_plan in ('free', 'premium', 'platinum')
    );

alter table public.specialist_billing
  add column if not exists admin_override_ends_at timestamptz;

alter table public.specialist_billing
  add column if not exists admin_override_granted_at timestamptz;

alter table public.specialist_billing
  add column if not exists admin_override_granted_by uuid
    references auth.users (id) on delete set null;

comment on column public.specialist_billing.admin_override_plan is
  'Complimentary membership applied by an admin. Null = no override.';
comment on column public.specialist_billing.admin_override_ends_at is
  'When the admin grant expires. Null with a plan means indefinitely.';

create index if not exists specialist_billing_admin_override_due_idx
  on public.specialist_billing (admin_override_ends_at)
  where admin_override_plan is not null
    and admin_override_ends_at is not null;
