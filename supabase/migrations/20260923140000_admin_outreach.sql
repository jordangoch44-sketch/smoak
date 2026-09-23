-- Named cold-outreach templates and one-address send log.
-- Service-role read/write from Next admin APIs after cookie auth.

create table if not exists public.admin_outreach_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  subject text not null default '',
  body text not null default '',
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_outreach_templates_created_idx
  on public.admin_outreach_templates (created_at);

create table if not exists public.admin_outreach_sends (
  id uuid primary key default gen_random_uuid(),
  template_id uuid,
  template_name text not null default '',
  to_email text not null,
  subject text not null default '',
  status text not null
    check (status in ('sent', 'failed')),
  error text,
  provider_id text,
  sent_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists admin_outreach_sends_email_idx
  on public.admin_outreach_sends (to_email);

create index if not exists admin_outreach_sends_template_idx
  on public.admin_outreach_sends (template_id, to_email);

create index if not exists admin_outreach_sends_created_idx
  on public.admin_outreach_sends (created_at desc);

alter table public.admin_outreach_templates enable row level security;
alter table public.admin_outreach_sends enable row level security;

revoke all on table public.admin_outreach_templates from anon, authenticated;
revoke all on table public.admin_outreach_sends from anon, authenticated;
grant all on table public.admin_outreach_templates to service_role;
grant all on table public.admin_outreach_sends to service_role;

comment on table public.admin_outreach_templates is
  'Named staple emails admins send to one address at a time.';
comment on table public.admin_outreach_sends is
  'Log of one-off cold outreach sends from the admin Email tab.';
