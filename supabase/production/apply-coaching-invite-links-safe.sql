-- Purpose: invite links so a specialist can add someone with no SMOAC account yet.
-- The link opens /join/<token>; the person signs up or logs in, then accepts.
-- Safe to re-run.

create table if not exists public.coaching_invite_links (
  token text primary key,
  specialist_id text not null,
  specialist_user_id uuid not null references auth.users (id) on delete cascade,
  specialist_name text not null default '',
  client_first_name text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz
);

create index if not exists coaching_invite_links_specialist_idx
  on public.coaching_invite_links (specialist_id, created_at desc);

alter table public.coaching_invite_links enable row level security;

drop policy if exists "coaching_invite_links_select_owner" on public.coaching_invite_links;
create policy "coaching_invite_links_select_owner"
on public.coaching_invite_links
for select
to authenticated
using (public.owns_marketplace_specialist(specialist_id) or public.is_admin());

grant select on table public.coaching_invite_links to authenticated;
grant all on table public.coaching_invite_links to service_role;

-- Specialist (Pro) creates a single-use link. First name is optional, for their own reference.
create or replace function public.create_coaching_invite_link(
  p_specialist_id text,
  p_specialist_name text,
  p_client_first_name text
)
returns public.coaching_invite_links
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.coaching_invite_links;
begin
  if not public.owns_marketplace_specialist(p_specialist_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.caller_is_premium_specialist() then
    raise exception 'pro_required' using errcode = '42501';
  end if;

  insert into public.coaching_invite_links (
    token, specialist_id, specialist_user_id, specialist_name, client_first_name
  )
  values (
    replace(gen_random_uuid()::text, '-', ''),
    p_specialist_id,
    auth.uid(),
    left(trim(coalesce(p_specialist_name, '')), 80),
    left(trim(coalesce(p_client_first_name, '')), 40)
  )
  returning * into link;
  return link;
end;
$$;

-- Public preview for the join page (no sign-in needed). Never exposes who claimed it.
create or replace function public.get_coaching_invite_link(p_token text)
returns table (
  specialist_id text,
  specialist_name text,
  client_first_name text,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.specialist_id,
    l.specialist_name,
    l.client_first_name,
    case
      when l.revoked_at is not null then 'revoked'
      when l.claimed_by is not null and l.claimed_by <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) then 'claimed'
      when l.claimed_by is not null then 'accepted'
      when l.expires_at < now() then 'expired'
      else 'valid'
    end
  from public.coaching_invite_links l
  where l.token = p_token;
$$;

-- Signed-in person accepts: joins the roster as active and the link is used up.
create or replace function public.claim_coaching_invite_link(p_token text)
returns public.coaching_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.coaching_invite_links;
  rel public.coaching_relationships;
  first_name text;
begin
  if auth.uid() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into link from public.coaching_invite_links where token = p_token for update;
  if link.token is null or link.revoked_at is not null then
    raise exception 'invite_invalid' using errcode = '22023';
  end if;
  if link.claimed_by is not null and link.claimed_by <> auth.uid() then
    raise exception 'invite_claimed' using errcode = '22023';
  end if;
  if link.claimed_by is null and link.expires_at < now() then
    raise exception 'invite_expired' using errcode = '22023';
  end if;
  if link.specialist_user_id = auth.uid() then
    raise exception 'own_invite' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(p.first_name), ''), link.client_first_name)
    into first_name
    from public.profiles p
   where p.user_id = auth.uid();

  insert into public.coaching_relationships as r (
    specialist_id, specialist_user_id, client_user_id, conversation_id,
    specialist_name, client_first_name, status, responded_at
  )
  values (
    link.specialist_id, link.specialist_user_id, auth.uid(), null,
    link.specialist_name, coalesce(first_name, link.client_first_name), 'active', now()
  )
  on conflict (specialist_id, client_user_id) do update
    set status = 'active',
        responded_at = now(),
        ended_at = null,
        specialist_user_id = excluded.specialist_user_id,
        specialist_name = excluded.specialist_name,
        client_first_name = case
          when excluded.client_first_name <> '' then excluded.client_first_name
          else r.client_first_name
        end,
        updated_at = now()
  returning * into rel;

  update public.coaching_invite_links
     set claimed_by = auth.uid(), claimed_at = coalesce(claimed_at, now())
   where token = p_token;

  return rel;
end;
$$;

revoke all on function public.create_coaching_invite_link(text, text, text) from public;
revoke all on function public.claim_coaching_invite_link(text) from public;
grant execute on function public.create_coaching_invite_link(text, text, text) to authenticated;
grant execute on function public.get_coaching_invite_link(text) to anon, authenticated;
grant execute on function public.claim_coaching_invite_link(text) to authenticated;
