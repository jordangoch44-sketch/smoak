-- Admin ops fields on specialist_profiles (durable, not browser memory).
alter table public.specialist_profiles
  add column if not exists is_protected boolean not null default false;

alter table public.specialist_profiles
  add column if not exists account_kind text not null default 'real'
    check (account_kind in ('real', 'test'));

create index if not exists specialist_profiles_account_kind_idx
  on public.specialist_profiles (account_kind)
  where account_kind = 'test';

-- Admins can select every profile (all statuses) for the roster.
drop policy if exists "specialist_profiles_select_admin" on public.specialist_profiles;
create policy "specialist_profiles_select_admin"
on public.specialist_profiles for select
to authenticated
using (public.is_admin());
