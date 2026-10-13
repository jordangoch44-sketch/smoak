-- Exercise favorites for the signed-in account.
-- A specialist's list is stored on their auth user id, keyed by exercise id.

create table if not exists public.exercise_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id),
  constraint exercise_favorites_exercise_id_check
    check (char_length(exercise_id) between 1 and 80)
);

create index if not exists exercise_favorites_user_id_idx
  on public.exercise_favorites (user_id);

alter table public.exercise_favorites enable row level security;

drop policy if exists "exercise_favorites_select_own" on public.exercise_favorites;
create policy "exercise_favorites_select_own"
on public.exercise_favorites
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "exercise_favorites_insert_own" on public.exercise_favorites;
create policy "exercise_favorites_insert_own"
on public.exercise_favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "exercise_favorites_delete_own" on public.exercise_favorites;
create policy "exercise_favorites_delete_own"
on public.exercise_favorites
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on table public.exercise_favorites to authenticated;
grant all on table public.exercise_favorites to service_role;
