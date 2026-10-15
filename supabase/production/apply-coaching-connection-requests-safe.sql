-- Purpose: a client can request a specialist from their profile.
-- Search matches the specialist's full name or business name.
-- The specialist accepts (Pro) or declines. Safe to re-run.

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'coaching_relationships'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%';
  if constraint_name is not null then
    execute format('alter table public.coaching_relationships drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.coaching_relationships
  add constraint coaching_relationships_status_check
  check (status in ('invited', 'requested', 'active', 'declined', 'ended'));

-- Keep an open client request if the specialist later taps invite on a thread.
create or replace function public.invite_client_to_roster(p_conversation_id uuid)
returns public.coaching_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  conv public.inquiry_conversations;
  rel public.coaching_relationships;
begin
  select * into conv from public.inquiry_conversations where id = p_conversation_id;
  if conv.id is null or not public.owns_marketplace_specialist(conv.specialist_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.caller_is_premium_specialist() then
    raise exception 'pro_required' using errcode = '42501';
  end if;

  insert into public.coaching_relationships as r (
    specialist_id, specialist_user_id, client_user_id, conversation_id,
    specialist_name, client_first_name
  )
  values (
    conv.specialist_id, auth.uid(), conv.client_user_id, conv.id,
    conv.specialist_name, conv.client_first_name
  )
  on conflict (specialist_id, client_user_id) do update
    set status = case
          when r.status = 'active' then 'active'
          when r.status = 'requested' then 'requested'
          else 'invited'
        end,
        invited_at = case
          when r.status in ('active', 'requested') then r.invited_at
          else now()
        end,
        responded_at = case when r.status = 'active' then r.responded_at else null end,
        ended_at = null,
        conversation_id = excluded.conversation_id,
        specialist_user_id = excluded.specialist_user_id,
        specialist_name = excluded.specialist_name,
        client_first_name = excluded.client_first_name,
        updated_at = now()
  returning * into rel;

  return rel;
end;
$$;

create or replace function public.end_coaching(p_relationship_id uuid)
returns public.coaching_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  rel public.coaching_relationships;
begin
  update public.coaching_relationships
     set status = 'ended', ended_at = now(), updated_at = now()
   where id = p_relationship_id
     and (client_user_id = auth.uid() or public.owns_marketplace_specialist(specialist_id))
     and status in ('invited', 'requested', 'active')
  returning * into rel;
  if rel.id is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return rel;
end;
$$;

-- Signed-in client search. Returns public card fields only.
create or replace function public.search_specialists_to_connect(p_query text)
returns table (
  id text,
  slug text,
  business_name text,
  full_name text,
  profession text,
  city text,
  neighborhood text,
  image_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := left(trim(coalesce(p_query, '')), 80);
  escaped text;
  pattern text;
  prefix text;
begin
  if auth.uid() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(q) < 2 then
    return;
  end if;

  escaped := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');
  pattern := '%' || escaped || '%';
  prefix := escaped || '%';

  return query
  select
    sp.id,
    nullif(trim(sp.profile_data->>'slug'), '') as slug,
    left(trim(coalesce(
      nullif(trim(sp.display_name), ''),
      nullif(trim(sp.profile_data->>'name'), ''),
      ''
    )), 80) as business_name,
    left(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), 80) as full_name,
    left(trim(coalesce(
      nullif(trim(sp.profession), ''),
      nullif(trim(sp.profile_data->>'profession'), ''),
      ''
    )), 80) as profession,
    left(trim(coalesce(
      nullif(trim(sp.city), ''),
      nullif(trim(sp.profile_data->>'city'), ''),
      ''
    )), 80) as city,
    left(trim(coalesce(
      nullif(trim(sp.neighborhood), ''),
      nullif(trim(sp.profile_data->>'neighborhood'), ''),
      ''
    )), 80) as neighborhood,
    left(trim(coalesce(
      nullif(trim(sp.profile_data->>'image'), ''),
      nullif(trim(sp.profile_data->>'heroImage'), ''),
      nullif(trim(sp.profile_data->'galleryImages'->>0), ''),
      ''
    )), 500) as image_url
  from public.specialist_profiles sp
  left join public.profiles p on p.user_id = sp.user_id
  where sp.status = 'approved'
    and sp.user_id is not null
    and sp.user_id <> auth.uid()
    and (
      coalesce(sp.display_name, '') ilike pattern escape '\'
      or coalesce(sp.profile_data->>'name', '') ilike pattern escape '\'
      or trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ilike pattern escape '\'
    )
  order by
    case
      when lower(trim(coalesce(sp.display_name, ''))) = lower(q) then 0
      when lower(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) = lower(q) then 0
      when coalesce(sp.display_name, '') ilike prefix escape '\' then 1
      when trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) ilike prefix escape '\' then 1
      else 2
    end,
    sp.display_name
  limit 8;
end;
$$;

-- Client asks to add an approved specialist. Does not attach them until the specialist accepts.
create or replace function public.request_specialist_connection(p_specialist_id text)
returns public.coaching_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  spec public.specialist_profiles;
  rel public.coaching_relationships;
  client_name text;
  business text;
begin
  if auth.uid() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into spec
  from public.specialist_profiles
  where id = trim(coalesce(p_specialist_id, ''))
    and status = 'approved';
  if spec.id is null or spec.user_id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if spec.user_id = auth.uid() then
    raise exception 'own_profile' using errcode = '42501';
  end if;

  select left(trim(coalesce(first_name, '')), 40)
    into client_name
  from public.profiles
  where user_id = auth.uid();

  business := left(trim(coalesce(
    nullif(trim(spec.display_name), ''),
    nullif(trim(spec.profile_data->>'name'), ''),
    ''
  )), 80);

  insert into public.coaching_relationships as r (
    specialist_id, specialist_user_id, client_user_id,
    specialist_name, client_first_name, status
  )
  values (
    spec.id,
    spec.user_id,
    auth.uid(),
    business,
    coalesce(client_name, ''),
    'requested'
  )
  on conflict (specialist_id, client_user_id) do update
    set status = case
          when r.status in ('active', 'invited') then r.status
          else 'requested'
        end,
        invited_at = case
          when r.status in ('active', 'invited', 'requested') then r.invited_at
          else now()
        end,
        responded_at = case
          when r.status in ('active', 'invited') then r.responded_at
          else null
        end,
        ended_at = case
          when r.status in ('active', 'invited') then r.ended_at
          else null
        end,
        specialist_user_id = excluded.specialist_user_id,
        specialist_name = case
          when excluded.specialist_name <> '' then excluded.specialist_name
          else r.specialist_name
        end,
        client_first_name = case
          when excluded.client_first_name <> '' then excluded.client_first_name
          else r.client_first_name
        end,
        updated_at = now()
  returning * into rel;

  return rel;
end;
$$;

-- Specialist accepts (Pro) or declines a client connection request.
create or replace function public.respond_coaching_request(p_relationship_id uuid, p_accept boolean)
returns public.coaching_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  rel public.coaching_relationships;
begin
  if p_accept and not public.caller_is_premium_specialist() then
    raise exception 'pro_required' using errcode = '42501';
  end if;

  update public.coaching_relationships
     set status = case when p_accept then 'active' else 'declined' end,
         responded_at = now(),
         updated_at = now()
   where id = p_relationship_id
     and status = 'requested'
     and public.owns_marketplace_specialist(specialist_id)
  returning * into rel;
  if rel.id is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return rel;
end;
$$;

revoke all on function public.search_specialists_to_connect(text) from public;
revoke all on function public.request_specialist_connection(text) from public;
revoke all on function public.respond_coaching_request(uuid, boolean) from public;
grant execute on function public.search_specialists_to_connect(text) to authenticated;
grant execute on function public.request_specialist_connection(text) to authenticated;
grant execute on function public.respond_coaching_request(uuid, boolean) to authenticated;
