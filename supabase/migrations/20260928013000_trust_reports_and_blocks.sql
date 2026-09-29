-- Reports and blocks follow the account.
-- A block closes the inquiry both ways. Reports are visible to admins via the service role.

create table if not exists public.trust_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  surface text not null check (surface in ('profile', 'thread')),
  reason text not null,
  details text not null default '',
  specialist_id text,
  conversation_id uuid,
  target_user_id uuid,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists trust_reports_status_idx
  on public.trust_reports (status, created_at desc);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid,
  specialist_id text,
  conversation_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists user_blocks_blocker_user_uidx
  on public.user_blocks (blocker_user_id, blocked_user_id)
  where blocked_user_id is not null;

create unique index if not exists user_blocks_blocker_specialist_uidx
  on public.user_blocks (blocker_user_id, specialist_id)
  where specialist_id is not null;

create index if not exists user_blocks_specialist_idx
  on public.user_blocks (specialist_id)
  where specialist_id is not null;

alter table public.trust_reports enable row level security;
alter table public.user_blocks enable row level security;

drop policy if exists "trust_reports_insert_own" on public.trust_reports;
create policy "trust_reports_insert_own"
on public.trust_reports for insert
to authenticated
with check (reporter_user_id = auth.uid());

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
on public.user_blocks for insert
to authenticated
with check (blocker_user_id = auth.uid());

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
on public.user_blocks for select
to authenticated
using (blocker_user_id = auth.uid());

grant insert on table public.trust_reports to authenticated;
grant select, insert on table public.user_blocks to authenticated;
grant all on table public.trust_reports to service_role;
grant all on table public.user_blocks to service_role;

create or replace function public.inquiry_pair_is_blocked(
  p_party_a uuid,
  p_party_b uuid,
  p_specialist_id text
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks b
    where (
      b.blocker_user_id = p_party_a
      and (
        (p_party_b is not null and b.blocked_user_id = p_party_b)
        or (
          coalesce(p_specialist_id, '') <> ''
          and b.specialist_id = p_specialist_id
        )
      )
    )
    or (
      p_party_b is not null
      and b.blocker_user_id = p_party_b
      and (
        b.blocked_user_id = p_party_a
        or (
          coalesce(p_specialist_id, '') <> ''
          and b.specialist_id = p_specialist_id
        )
      )
    )
  );
$$;

revoke all on function public.inquiry_pair_is_blocked(uuid, uuid, text) from public;
grant execute on function public.inquiry_pair_is_blocked(uuid, uuid, text) to authenticated;
