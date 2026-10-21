-- iOS device tokens for APNs. The server sends with the service role.
-- A token belongs to one signed-in user; signing in on the same phone reassigns it.

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios')),
  environment text not null check (environment in ('sandbox', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

drop policy if exists "device_push_tokens_select_own" on public.device_push_tokens;
create policy "device_push_tokens_select_own"
on public.device_push_tokens
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "device_push_tokens_delete_own" on public.device_push_tokens;
create policy "device_push_tokens_delete_own"
on public.device_push_tokens
for delete
to authenticated
using (auth.uid() = user_id);

grant select, delete on table public.device_push_tokens to authenticated;
grant all on table public.device_push_tokens to service_role;
