-- Claim looked up profiles.id, but profiles are keyed by user_id.
-- That made every share-link accept fail before a roster row was written.

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

revoke all on function public.claim_coaching_invite_link(text) from public;
grant execute on function public.claim_coaching_invite_link(text) to authenticated;
