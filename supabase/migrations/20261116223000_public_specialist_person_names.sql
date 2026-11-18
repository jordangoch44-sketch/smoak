-- Personal names for public marketplace search.
-- Approved specialist_profiles are readable by anon; profiles are not.
-- Returns the account name only. No email, user id, or hidden listings.

create or replace function public.list_public_specialist_person_names()
returns table (
  id text,
  person_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id,
    left(
      trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
      80
    ) as person_name
  from public.specialist_profiles sp
  inner join public.profiles p on p.user_id = sp.user_id
  where sp.status = 'approved'
    and char_length(
      trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
    ) > 0;
$$;

revoke all on function public.list_public_specialist_person_names() from public;
grant execute on function public.list_public_specialist_person_names() to anon, authenticated;

notify pgrst, 'reload schema';
