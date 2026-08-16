-- Homepage essence banner config (Admin → Settings).
-- Service role read/write only — public site uses Next API with service key.

create table if not exists public.site_homepage_essence (
  id text primary key default 'default'
    check (id = 'default'),
  interval_ms integer not null default 5200
    check (interval_ms >= 2500 and interval_ms <= 20000),
  slides jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_homepage_essence enable row level security;

revoke all on table public.site_homepage_essence from anon, authenticated;
grant all on table public.site_homepage_essence to service_role;

comment on table public.site_homepage_essence is
  'Single-row marketplace homepage essence carousel config.';

-- Allow JSON config objects in specialist-media if ever written to storage again
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'application/json',
  'text/plain'
]
where id = 'specialist-media';
