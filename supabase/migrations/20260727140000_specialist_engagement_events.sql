-- Anonymous specialist engagement events (search impressions, contact, booking clicks).
-- Inserts are open to anon/authenticated visitors (no PII); specialists read own counts;
-- admins read all. Service role used by specialist analytics API.

create table if not exists public.specialist_engagement_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  specialist_id text not null,
  event_type text not null
    check (event_type in ('search_appearance', 'contact_click', 'booking_click')),
  surface text,
  path text,
  visitor_key text not null,
  device text,
  inquiry_action text
);

create index if not exists specialist_engagement_events_specialist_occurred_idx
  on public.specialist_engagement_events (specialist_id, occurred_at desc);

create index if not exists specialist_engagement_events_type_idx
  on public.specialist_engagement_events (event_type);

alter table public.specialist_engagement_events enable row level security;

drop policy if exists "specialist_engagement_events_insert_any"
  on public.specialist_engagement_events;
create policy "specialist_engagement_events_insert_any"
on public.specialist_engagement_events for insert
to anon, authenticated
with check (
  char_length(specialist_id) between 1 and 120
  and event_type in ('search_appearance', 'contact_click', 'booking_click')
  and (surface is null or char_length(surface) <= 60)
  and (path is null or char_length(path) between 1 and 300)
  and char_length(visitor_key) between 8 and 100
  and (device is null or device in ('mobile', 'desktop'))
  and (inquiry_action is null or char_length(inquiry_action) <= 60)
);

drop policy if exists "specialist_engagement_events_select_own_or_admin"
  on public.specialist_engagement_events;
create policy "specialist_engagement_events_select_own_or_admin"
on public.specialist_engagement_events for select
to authenticated
using (
  public.is_admin()
  or public.owns_marketplace_specialist(specialist_id)
);

drop policy if exists "specialist_engagement_events_delete_admin"
  on public.specialist_engagement_events;
create policy "specialist_engagement_events_delete_admin"
on public.specialist_engagement_events for delete
to authenticated
using (public.is_admin());

grant insert on table public.specialist_engagement_events to anon, authenticated;
grant select, delete on table public.specialist_engagement_events to authenticated;
grant all on table public.specialist_engagement_events to service_role;
