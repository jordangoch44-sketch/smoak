-- Specialist can revise a workout the client has not started.

create or replace function public.update_coach_workout(
  p_workout_id uuid,
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
  workout public.coach_workouts;
begin
  if not public.caller_is_premium_specialist() then
    raise exception 'pro_required' using errcode = '42501';
  end if;
  if p_date_key !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'bad_date' using errcode = '22023';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'exercises_required' using errcode = '22023';
  end if;

  select * into workout from public.coach_workouts where id = p_workout_id;
  if not found or not public.owns_marketplace_specialist(workout.specialist_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if workout.status <> 'sent' then
    raise exception 'already_started' using errcode = '42501';
  end if;

  update public.coach_workouts
     set date_key = p_date_key,
         title = left(coalesce(p_title, ''), 24),
         note = left(coalesce(p_note, ''), 500),
         exercises = p_exercises,
         updated_at = now()
   where id = workout.id
     and status = 'sent'
  returning * into workout;

  if not found then
    raise exception 'already_started' using errcode = '42501';
  end if;
  return workout;
end;
$$;

revoke all on function public.update_coach_workout(uuid, text, text, text, jsonb) from public;
grant execute on function public.update_coach_workout(uuid, text, text, text, jsonb) to authenticated;
