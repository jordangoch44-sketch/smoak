-- Finish workout notifies the specialist once (email) and leaves a portal notice
-- until they dismiss it. A late "started" sync cannot undo a finish.

alter table public.coach_workouts
  add column if not exists completion_notified_at timestamptz,
  add column if not exists completion_seen_at timestamptz;

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
     set client_log = p_client_log,
         started_at = coalesce(started_at, now()),
         status = case when status = 'completed' then status else p_status end,
         completed_at = case
           when status = 'completed' then completed_at
           when p_status = 'completed' then coalesce(completed_at, now())
           else null
         end,
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

create or replace function public.mark_coach_workout_completion_seen(p_workout_id uuid)
returns public.coach_workouts
language plpgsql
security definer
set search_path = public
as $$
declare
  workout public.coach_workouts;
begin
  update public.coach_workouts
     set completion_seen_at = coalesce(completion_seen_at, now()),
         updated_at = now()
   where id = p_workout_id
     and status = 'completed'
     and public.owns_marketplace_specialist(specialist_id)
  returning * into workout;
  if workout.id is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return workout;
end;
$$;

grant execute on function public.mark_coach_workout_completion_seen(uuid) to authenticated;
