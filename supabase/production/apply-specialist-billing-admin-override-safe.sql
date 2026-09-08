-- Purpose: let admins grant / revoke Free, Pro, or Pro Plus without Stripe.
-- Safe to re-run.

alter table public.specialist_billing
  add column if not exists admin_override_plan text;

alter table public.specialist_billing
  add column if not exists admin_override_ends_at timestamptz;

alter table public.specialist_billing
  add column if not exists admin_override_granted_at timestamptz;

alter table public.specialist_billing
  add column if not exists admin_override_granted_by uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'specialist_billing_admin_override_plan_check'
  ) then
    alter table public.specialist_billing
      add constraint specialist_billing_admin_override_plan_check
      check (
        admin_override_plan is null
        or admin_override_plan in ('free', 'premium', 'platinum')
      );
  end if;
end $$;

comment on column public.specialist_billing.admin_override_plan is
  'Complimentary membership applied by an admin. Null = no override.';
comment on column public.specialist_billing.admin_override_ends_at is
  'When the admin grant expires. Null with a plan means indefinitely.';

create index if not exists specialist_billing_admin_override_due_idx
  on public.specialist_billing (admin_override_ends_at)
  where admin_override_plan is not null
    and admin_override_ends_at is not null;
