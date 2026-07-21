-- Site traffic capture (admin analytics) — anonymous page views with source attribution.
-- Inserts are open to anon visitors (no PII stored); reads are admin-only.

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  path text not null,
  -- External referrer host only (e.g. "www.google.com") — never full URLs.
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  -- Anonymous per-device key (random uuid in localStorage; no account linkage).
  visitor_key text not null,
  is_new_visitor boolean not null default false,
  device text
);

create index if not exists site_visits_occurred_at_idx
  on public.site_visits (occurred_at desc);
create index if not exists site_visits_visitor_key_idx
  on public.site_visits (visitor_key);

alter table public.site_visits enable row level security;

-- Anyone may record a visit, with basic size limits to deter abuse.
drop policy if exists "site_visits_insert_any" on public.site_visits;
create policy "site_visits_insert_any"
on public.site_visits for insert
to anon, authenticated
with check (
  char_length(path) between 1 and 300
  and (referrer_host is null or char_length(referrer_host) <= 200)
  and (utm_source is null or char_length(utm_source) <= 100)
  and (utm_medium is null or char_length(utm_medium) <= 100)
  and (utm_campaign is null or char_length(utm_campaign) <= 150)
  and char_length(visitor_key) between 8 and 100
  and (device is null or device in ('mobile', 'desktop'))
);

-- Only platform admins can read traffic data.
drop policy if exists "site_visits_select_admin" on public.site_visits;
create policy "site_visits_select_admin"
on public.site_visits for select
to authenticated
using (public.is_admin());

drop policy if exists "site_visits_delete_admin" on public.site_visits;
create policy "site_visits_delete_admin"
on public.site_visits for delete
to authenticated
using (public.is_admin());

grant insert on table public.site_visits to anon, authenticated;
grant select, delete on table public.site_visits to authenticated;
grant all on table public.site_visits to service_role;
