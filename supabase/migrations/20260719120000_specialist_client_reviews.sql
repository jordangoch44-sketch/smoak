-- SMOAC client reviews for marketplace specialists (text specialist_id)
-- Enforces: one review per client per specialist; one new review per 7 days globally.

create table if not exists public.specialist_reviews (
  id uuid primary key default gen_random_uuid(),
  specialist_id text not null,
  client_user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null
    check (char_length(trim(review_text)) between 10 and 500),
  status text not null default 'published'
    check (status in ('published', 'hidden', 'flagged')),
  -- Snapshot for public display only (never email). Built at insert time.
  author_display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_user_id, specialist_id)
);

create index if not exists specialist_reviews_specialist_created_idx
  on public.specialist_reviews (specialist_id, created_at desc)
  where status = 'published';

create index if not exists specialist_reviews_client_created_idx
  on public.specialist_reviews (client_user_id, created_at desc);

create index if not exists specialist_reviews_specialist_id_idx
  on public.specialist_reviews (specialist_id);

create trigger specialist_reviews_updated_at
before update on public.specialist_reviews
for each row execute function public.touch_updated_at();

alter table public.specialist_reviews enable row level security;

-- Public may read published reviews only
drop policy if exists "specialist_reviews_select_published" on public.specialist_reviews;
create policy "specialist_reviews_select_published"
on public.specialist_reviews for select
to anon, authenticated
using (status = 'published');

-- Clients may read their own reviews (any status)
drop policy if exists "specialist_reviews_select_own" on public.specialist_reviews;
create policy "specialist_reviews_select_own"
on public.specialist_reviews for select
to authenticated
using (auth.uid() = client_user_id);

-- Admins may read all
drop policy if exists "specialist_reviews_select_admin" on public.specialist_reviews;
create policy "specialist_reviews_select_admin"
on public.specialist_reviews for select
to authenticated
using (public.is_admin());

-- Admins may update status for moderation
drop policy if exists "specialist_reviews_update_admin" on public.specialist_reviews;
create policy "specialist_reviews_update_admin"
on public.specialist_reviews for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No direct client inserts — use submit_specialist_review RPC
revoke insert, update, delete on public.specialist_reviews from anon, authenticated;
grant select on public.specialist_reviews to anon, authenticated;
grant all on public.specialist_reviews to service_role;

-- Aggregates for cards / profile summaries (published only)
create or replace view public.specialist_review_aggregates as
select
  specialist_id,
  count(*)::integer as review_count,
  round(avg(rating)::numeric, 1)::double precision as avg_rating
from public.specialist_reviews
where status = 'published'
group by specialist_id;

grant select on public.specialist_review_aggregates to anon, authenticated, service_role;

create or replace function public.is_marketplace_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'client'
  );
$$;

revoke all on function public.is_marketplace_client() from public;
grant execute on function public.is_marketplace_client() to authenticated;

create or replace function public.format_review_author_display(
  p_first_name text,
  p_last_name text
)
returns text
language plpgsql
immutable
as $$
declare
  first_part text := trim(coalesce(p_first_name, ''));
  last_part text := trim(coalesce(p_last_name, ''));
  initial text;
begin
  if first_part = '' then
    return 'Verified SMOAC Client';
  end if;
  if last_part = '' then
    return first_part;
  end if;
  initial := upper(left(last_part, 1));
  return first_part || ' ' || initial || '.';
end;
$$;

/**
 * Atomically submit a SMOAC client review.
 * Returns jsonb: { ok, error?, next_eligible_at?, review? }
 */
create or replace function public.submit_specialist_review(
  p_specialist_id text,
  p_rating integer,
  p_review_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_specialist_id text := trim(coalesce(p_specialist_id, ''));
  v_text text := trim(coalesce(p_review_text, ''));
  v_rating integer := p_rating;
  v_profile public.profiles%rowtype;
  v_author text;
  v_last_at timestamptz;
  v_next_at timestamptz;
  v_row public.specialist_reviews%rowtype;
  v_specialist_user uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_marketplace_client() then
    return jsonb_build_object('ok', false, 'error', 'not_client');
  end if;

  if v_specialist_id = '' then
    return jsonb_build_object('ok', false, 'error', 'specialist_not_found');
  end if;

  if v_rating is null or v_rating < 1 or v_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'invalid_rating');
  end if;

  if char_length(v_text) < 10 or char_length(v_text) > 500 then
    return jsonb_build_object('ok', false, 'error', 'invalid_text');
  end if;

  -- Serialize per-client to prevent double-submit races
  perform pg_advisory_xact_lock(hashtext('smoac_review:' || v_uid::text));

  -- Specialist must exist as an approved marketplace listing
  select sp.user_id into v_specialist_user
  from public.specialist_profiles sp
  where sp.id = v_specialist_id
    and sp.status = 'approved'
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'specialist_not_found');
  end if;

  if v_specialist_user is not null and v_specialist_user = v_uid then
    return jsonb_build_object('ok', false, 'error', 'self_review');
  end if;

  -- Also block via application ownership (same user controls specialist application)
  if exists (
    select 1
    from public.specialist_applications sa
    where sa.id = v_specialist_id
      and sa.user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'error', 'self_review');
  end if;

  if exists (
    select 1
    from public.specialist_reviews r
    where r.client_user_id = v_uid
      and r.specialist_id = v_specialist_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'already_reviewed');
  end if;

  select r.created_at into v_last_at
  from public.specialist_reviews r
  where r.client_user_id = v_uid
  order by r.created_at desc
  limit 1;

  if v_last_at is not null and v_last_at > (now() - interval '7 days') then
    v_next_at := v_last_at + interval '7 days';
    return jsonb_build_object(
      'ok', false,
      'error', 'cooldown',
      'next_eligible_at', to_char(v_next_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    );
  end if;

  select * into v_profile
  from public.profiles p
  where p.user_id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_client');
  end if;

  v_author := public.format_review_author_display(
    v_profile.first_name,
    v_profile.last_name
  );

  insert into public.specialist_reviews (
    specialist_id,
    client_user_id,
    rating,
    review_text,
    status,
    author_display_name
  ) values (
    v_specialist_id,
    v_uid,
    v_rating,
    v_text,
    'published',
    v_author
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'review', jsonb_build_object(
      'id', v_row.id,
      'specialist_id', v_row.specialist_id,
      'rating', v_row.rating,
      'review_text', v_row.review_text,
      'author_display_name', v_row.author_display_name,
      'created_at', to_char(v_row.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'status', v_row.status
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_reviewed');
end;
$$;

revoke all on function public.submit_specialist_review(text, integer, text) from public;
grant execute on function public.submit_specialist_review(text, integer, text) to authenticated;

comment on table public.specialist_reviews is
  'SMOAC client reviews for marketplace specialists. Identity is auth.uid(); email is never public.';
comment on function public.submit_specialist_review(text, integer, text) is
  'Secure review submit: client-only, one per specialist, one new review per 7 days.';
