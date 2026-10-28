-- One-time codes that sign a specialist into Safari for Pro, PRO+, or Boost checkout.
-- The app WebView and Safari do not share a session. The code expires quickly and works once.
-- Safe to re-run.

create table if not exists public.billing_app_handoffs (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (char_length(code_hash) = 64),
  user_id uuid not null references auth.users (id) on delete cascade,
  intent text not null check (intent in ('upgrade', 'boost', 'billing')),
  product text check (product is null or product in ('premium', 'platinum')),
  days int check (days is null or (days >= 1 and days <= 30)),
  daily_cents int check (daily_cents is null or (daily_cents >= 500 and daily_cents <= 5000)),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.billing_app_handoffs enable row level security;

revoke all on table public.billing_app_handoffs from public, anon, authenticated;
grant all on table public.billing_app_handoffs to service_role;

create index if not exists billing_app_handoffs_user_created_idx
  on public.billing_app_handoffs (user_id, created_at desc);

-- Marks a code used and returns its payload. A second call returns nothing.
create or replace function public.consume_billing_app_handoff(p_code_hash text)
returns table (
  user_id uuid,
  intent text,
  product text,
  days int,
  daily_cents int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_code_hash is null or char_length(p_code_hash) <> 64 then
    return;
  end if;

  return query
  update public.billing_app_handoffs as handoff
  set used_at = now()
  where handoff.code_hash = p_code_hash
    and handoff.used_at is null
    and handoff.expires_at > now()
  returning
    handoff.user_id,
    handoff.intent,
    handoff.product,
    handoff.days,
    handoff.daily_cents;
end;
$$;

revoke all on function public.consume_billing_app_handoff(text) from public, anon, authenticated;
grant execute on function public.consume_billing_app_handoff(text) to service_role;
