-- Admin email catalog, send batches, recipients, and unsubscribes.
-- Service-role read/write from Next admin APIs after cookie auth.

create table if not exists public.admin_emails (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  subject text not null default '',
  kind text not null default 'automated'
    check (kind in ('automated', 'one_time')),
  trigger_kind text not null default 'custom'
    check (trigger_kind in ('after_signup', 'after_approval', 'profile_incomplete', 'weekly', 'inactive', 'one_time', 'custom')),
  trigger_label text not null default '',
  audience_ids text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'scheduled', 'sent')),
  preheader text not null default '',
  eyebrow text not null default '',
  title text not null default '',
  body text not null default '',
  image_url text not null default '',
  cta_label text not null default '',
  cta_href text not null default '',
  include_unsubscribe boolean not null default true,
  scheduled_at timestamptz,
  last_sent_at timestamptz,
  queued_for_send boolean not null default false,
  sent_count integer not null default 0,
  open_count integer not null default 0,
  click_count integer not null default 0,
  unsubscribe_count integer not null default 0,
  bounce_count integer not null default 0,
  complaint_count integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_emails_status_idx on public.admin_emails (status);
create index if not exists admin_emails_trigger_idx on public.admin_emails (trigger_kind, status);

create table if not exists public.admin_email_sends (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.admin_emails (id) on delete cascade,
  kind text not null default 'send_now',
  attempted integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  skipped integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists admin_email_sends_email_idx
  on public.admin_email_sends (email_id, created_at desc);

create table if not exists public.admin_email_recipients (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.admin_emails (id) on delete cascade,
  send_id uuid references public.admin_email_sends (id) on delete set null,
  to_email text not null,
  to_name text not null default '',
  user_id uuid,
  provider_id text,
  status text not null default 'queued'
    check (status in (
      'queued',
      'sent',
      'failed',
      'opened',
      'clicked',
      'bounced',
      'complained',
      'unsubscribed'
    )),
  error text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_email_recipients_email_idx
  on public.admin_email_recipients (email_id, created_at desc);
create index if not exists admin_email_recipients_queue_idx
  on public.admin_email_recipients (status, created_at)
  where status = 'queued';
create index if not exists admin_email_recipients_provider_idx
  on public.admin_email_recipients (provider_id)
  where provider_id is not null;
create index if not exists admin_email_recipients_to_email_idx
  on public.admin_email_recipients (lower(to_email));

create table if not exists public.admin_email_unsubscribes (
  email text primary key,
  source_email_id uuid references public.admin_emails (id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists admin_emails_updated_at on public.admin_emails;
create trigger admin_emails_updated_at
before update on public.admin_emails
for each row execute function public.touch_updated_at();

alter table public.admin_emails enable row level security;
alter table public.admin_email_sends enable row level security;
alter table public.admin_email_recipients enable row level security;
alter table public.admin_email_unsubscribes enable row level security;

revoke all on table public.admin_emails from anon, authenticated;
revoke all on table public.admin_email_sends from anon, authenticated;
revoke all on table public.admin_email_recipients from anon, authenticated;
revoke all on table public.admin_email_unsubscribes from anon, authenticated;

grant all on table public.admin_emails to service_role;
grant all on table public.admin_email_sends to service_role;
grant all on table public.admin_email_recipients to service_role;
grant all on table public.admin_email_unsubscribes to service_role;

comment on table public.admin_emails is
  'Admin-managed automated and one-time email catalog.';
