-- Purpose: a client texts a workout plan to someone else.
-- The link stores the title, exercises, sets, and reps. Logged weights stay off it.
-- Anyone with the link can add their own copy. Safe to re-run.

create table if not exists public.shared_workouts (
  token text primary key,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  sender_name text not null default '',
  title text not null default '',
  exercises jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.shared_workouts enable row level security;

revoke all on table public.shared_workouts from public, anon, authenticated;
grant all on table public.shared_workouts to service_role;

create or replace function public.create_shared_workout(
  p_title text,
  p_exercises jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  cleaned jsonb := '[]'::jsonb;
  exercise_name text;
  sets_digits text;
  sets_count int;
  reps text;
  superset text;
  sender text;
  new_token text;
begin
  if auth.uid() is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_exercises is null or jsonb_typeof(p_exercises) <> 'array' then
    raise exception 'invalid_workout' using errcode = '22023';
  end if;
  if jsonb_array_length(p_exercises) < 1 or jsonb_array_length(p_exercises) > 40 then
    raise exception 'invalid_workout' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(p_exercises)
  loop
    exercise_name := left(regexp_replace(trim(coalesce(item->>'name', '')), '\s+', ' ', 'g'), 80);
    if exercise_name = '' then
      continue;
    end if;
    sets_digits := left(regexp_replace(coalesce(item->>'sets', ''), '[^0-9]', '', 'g'), 2);
    sets_count := least(10, greatest(1, coalesce(nullif(sets_digits, '')::int, 1)));
    reps := left(
      regexp_replace(
        regexp_replace(trim(coalesce(item->>'reps', '')), '\s+', ' ', 'g'),
        '[^[:alnum:] ./_-]',
        '',
        'g'
      ),
      16
    );
    superset := coalesce(item->>'supersetId', '');
    if superset !~ '^[A-Za-z0-9_-]{1,40}$' then
      superset := '';
    end if;
    cleaned := cleaned || jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'name', exercise_name,
          'sets', sets_count::text,
          'reps', reps,
          'supersetId', nullif(superset, '')
        )
      )
    );
  end loop;

  if jsonb_array_length(cleaned) < 1 then
    raise exception 'invalid_workout' using errcode = '22023';
  end if;

  select case
    when trim(coalesce(p.first_name, '')) = '' then 'Someone'
    else left(trim(p.first_name), 40)
  end
    into sender
    from public.profiles p
   where p.user_id = auth.uid();
  sender := coalesce(sender, 'Someone');

  new_token := replace(gen_random_uuid()::text, '-', '');
  insert into public.shared_workouts (token, sender_user_id, sender_name, title, exercises)
  values (
    new_token,
    auth.uid(),
    sender,
    left(regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g'), 24),
    cleaned
  );
  return new_token;
end;
$$;

-- Public preview for the text link. Weights are not in this row.
create or replace function public.get_shared_workout(p_token text)
returns table (
  sender_name text,
  title text,
  exercises jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select w.sender_name, w.title, w.exercises
  from public.shared_workouts w
  where w.token = lower(trim(coalesce(p_token, '')));
$$;

revoke all on function public.create_shared_workout(text, jsonb) from public;
revoke all on function public.get_shared_workout(text) from public;
grant execute on function public.create_shared_workout(text, jsonb) to authenticated;
grant execute on function public.get_shared_workout(text) to anon, authenticated;
