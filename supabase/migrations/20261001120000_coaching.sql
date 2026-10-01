-- Specialist rosters + workouts sent to clients.
-- A client joins only by accepting an invite sent from an inquiry thread.
-- Specialists see only workouts they sent (status + sets logged for them), never the client's full log.
-- All writes go through security-definer RPCs; tables are read-only to clients of the API.

create table if not exists public.coaching_relationships (
  id uuid primary key default gen_random_uuid(),
  specialist_id text not null,
  specialist_user_id uuid not null references auth.users (id) on delete cascade,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.inquiry_conversations (id) on delete set null,
  specialist_name text not null default '',
  client_first_name text not null default '',
  status text not null default 'invited'
    check (status in ('invited', 'active', 'declined', 'ended')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (specialist_id, client_user_id)
);

create index if not exists coaching_relationships_client_idx
  on public.coaching_relationships (client_user_id, status);

create table if not exists public.coach_workouts (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.coaching_relationships (id) on delete cascade,
  specialist_id text not null,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  date_key text not null check (date_key ~ '^\d{4}-\d{2}-\d{2}$'),
  title text not null default '',
  note text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  status text not null default 'sent'
    check (status in ('sent', 'started', 'completed')),
  client_log jsonb,
  sent_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists coach_workouts_client_idx
  on public.coach_workouts (client_user_id, date_key);
create index if not exists coach_workouts_relationship_idx
  on public.coach_workouts (relationship_id, date_key);

alter table public.coaching_relationships enable row level security;
alter table public.coach_workouts enable row level security;

drop policy if exists "coaching_relationships_select_party" on public.coaching_relationships;
create policy "coaching_relationships_select_party"
on public.coaching_relationships
for select
to authenticated
using (
  auth.uid() = client_user_id
  or public.owns_marketplace_specialist(specialist_id)
  or public.is_admin()
);

drop policy if exists "coach_workouts_select_party" on public.coach_workouts;
create policy "coach_workouts_select_party"
on public.coach_workouts
for select
to authenticated
using (
  auth.uid() = client_user_id
  or public.owns_marketplace_specialist(specialist_id)
  or public.is_admin()
);

grant select on table public.coaching_relationships to authenticated;
grant select on table public.coach_workouts to authenticated;
grant all on table public.coaching_relationships to service_role;
grant all on table public.coach_workouts to service_role;

create or replace function public.caller_is_premium_specialist()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'specialist'
      and ur.is_premium
  );
$$;

-- Specialist invites the client from an inquiry thread they own. Re-inviting after decline/end is allowed.
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
    set status = case when r.status = 'active' then 'active' else 'invited' end,
        invited_at = case when r.status = 'active' then r.invited_at else now() end,
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

create or replace function public.respond_roster_invite(p_relationship_id uuid, p_accept boolean)
returns public.coaching_relationships
language plpgsql
security definer
set search_path = public
as $$
declare
  rel public.coaching_relationships;
begin
  update public.coaching_relationships
     set status = case when p_accept then 'active' else 'declined' end,
         responded_at = now(),
         updated_at = now()
   where id = p_relationship_id
     and client_user_id = auth.uid()
     and status = 'invited'
  returning * into rel;
  if rel.id is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return rel;
end;
$$;

-- Either side can end coaching. Sent workouts stay for history.
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
     and status in ('invited', 'active')
  returning * into rel;
  if rel.id is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return rel;
end;
$$;

create or replace function public.send_coach_workout(
  p_relationship_id uuid,
  p_date_key text,
  p_title text,
  p_note text,
  p_exercises jsonb
)
returns public.coach_workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  rel public.coaching_relationships;
  workout public.coach_workouts;
begin
  select * into rel from public.coaching_relationships where id = p_relationship_id;
  if rel.id is null
     or rel.status <> 'active'
     or not public.owns_marketplace_specialist(rel.specialist_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not public.caller_is_premium_specialist() then
    raise exception 'pro_required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'exercises_required' using errcode = '22023';
  end if;

  insert into public.coach_workouts (
    relationship_id, specialist_id, client_user_id, date_key, title, note, exercises
  )
  values (
    rel.id, rel.specialist_id, rel.client_user_id, p_date_key,
    left(coalesce(p_title, ''), 24), left(coalesce(p_note, ''), 500), p_exercises
  )
  returning * into workout;
  return workout;
end;
$$;

-- Specialist can pull back a workout the client has not started.
create or replace function public.delete_coach_workout(p_workout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.coach_workouts
   where id = p_workout_id
     and status = 'sent'
     and public.owns_marketplace_specialist(specialist_id);
  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end;
$$;

-- Client reports progress. Only status + the sets logged for this workout are shared.
create or replace function public.update_coach_workout_progress(
  p_workout_id uuid,
  p_status text,
  p_client_log jsonb
)
returns public.coach_workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  workout public.coach_workouts;
begin
  if p_status not in ('started', 'completed') then
    raise exception 'bad_status' using errcode = '22023';
  end if;
  update public.coach_workouts
     set status = p_status,
         client_log = p_client_log,
         started_at = coalesce(started_at, now()),
         completed_at = case when p_status = 'completed' then coalesce(completed_at, now()) else null end,
         updated_at = now()
   where id = p_workout_id
     and client_user_id = auth.uid()
  returning * into workout;
  if workout.id is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return workout;
end;
$$;

revoke all on function public.caller_is_premium_specialist() from public;
grant execute on function public.caller_is_premium_specialist() to authenticated;
grant execute on function public.invite_client_to_roster(uuid) to authenticated;
grant execute on function public.respond_roster_invite(uuid, boolean) to authenticated;
grant execute on function public.end_coaching(uuid) to authenticated;
grant execute on function public.send_coach_workout(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.delete_coach_workout(uuid) to authenticated;
grant execute on function public.update_coach_workout_progress(uuid, text, jsonb) to authenticated;
