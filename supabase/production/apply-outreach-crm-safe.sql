-- Outreach CRM: prospects, campaigns, per-recipient messages, and history.
-- Service-role read/write from Next admin APIs after cookie auth.
-- Specialist signup matching runs as security definer so applicants
-- cannot read or write these tables.

alter table public.admin_outreach_templates
  add column if not exists archived_at timestamptz;

create index if not exists admin_outreach_templates_archived_idx
  on public.admin_outreach_templates (archived_at);

create table if not exists public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text,
  instagram text not null default '',
  business text not null default '',
  category text not null default '',
  website text not null default '',
  notes text not null default '',
  status text not null default 'not_contacted'
    check (
      status in (
        'not_contacted',
        'email_sent',
        'follow_up',
        'replied',
        'interested',
        'signed_up',
        'not_interested',
        'bounced',
        'unsubscribed',
        'instagram_only'
      )
    ),
  source text not null default 'manual',
  last_contacted_at timestamptz,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_prospects_email_lower check (email is null or email = lower(email))
);

create unique index if not exists outreach_prospects_email_active_idx
  on public.outreach_prospects (email)
  where email is not null and archived_at is null;

create index if not exists outreach_prospects_status_idx
  on public.outreach_prospects (status)
  where archived_at is null;

create index if not exists outreach_prospects_instagram_idx
  on public.outreach_prospects (lower(instagram))
  where instagram <> '' and archived_at is null;

create index if not exists outreach_prospects_updated_idx
  on public.outreach_prospects (updated_at desc);

create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  template_id uuid references public.admin_outreach_templates (id) on delete set null,
  template_name text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  delivery_mode text not null default 'dry_run'
    check (delivery_mode in ('live', 'dry_run')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_campaigns_status_idx
  on public.outreach_campaigns (status, scheduled_at);

create index if not exists outreach_campaigns_created_idx
  on public.outreach_campaigns (created_at desc);

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_campaigns (id) on delete cascade,
  prospect_id uuid not null references public.outreach_prospects (id) on delete cascade,
  to_email text not null,
  subject text not null default '',
  status text not null default 'queued'
    check (
      status in (
        'queued',
        'sending',
        'sent',
        'delivered',
        'failed',
        'bounced',
        'dry_run',
        'skipped'
      )
    ),
  provider_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, prospect_id)
);

create index if not exists outreach_messages_campaign_status_idx
  on public.outreach_messages (campaign_id, status);

create index if not exists outreach_messages_email_idx
  on public.outreach_messages (to_email);

create unique index if not exists outreach_messages_campaign_email_idx
  on public.outreach_messages (campaign_id, to_email);

create index if not exists outreach_messages_provider_idx
  on public.outreach_messages (provider_id)
  where provider_id is not null;

create table if not exists public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.outreach_prospects (id) on delete cascade,
  campaign_id uuid references public.outreach_campaigns (id) on delete set null,
  message_id uuid references public.outreach_messages (id) on delete set null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outreach_events_prospect_idx
  on public.outreach_events (prospect_id, created_at desc);

create index if not exists outreach_events_campaign_idx
  on public.outreach_events (campaign_id, created_at desc);

alter table public.outreach_prospects enable row level security;
alter table public.outreach_campaigns enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_events enable row level security;

revoke all on table public.outreach_prospects from anon, authenticated;
revoke all on table public.outreach_campaigns from anon, authenticated;
revoke all on table public.outreach_messages from anon, authenticated;
revoke all on table public.outreach_events from anon, authenticated;

grant all on table public.outreach_prospects to service_role;
grant all on table public.outreach_campaigns to service_role;
grant all on table public.outreach_messages to service_role;
grant all on table public.outreach_events to service_role;

drop trigger if exists outreach_prospects_updated_at on public.outreach_prospects;
create trigger outreach_prospects_updated_at
before update on public.outreach_prospects
for each row execute function public.touch_updated_at();

drop trigger if exists outreach_campaigns_updated_at on public.outreach_campaigns;
create trigger outreach_campaigns_updated_at
before update on public.outreach_campaigns
for each row execute function public.touch_updated_at();

create or replace function public.outreach_mark_specialist_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or length(trim(new.email)) = 0 then
    return new;
  end if;
  if new.profile_status = 'DRAFT' then
    return new;
  end if;

  begin
    with marked as (
      update public.outreach_prospects as prospect
      set status = 'signed_up'
      where prospect.email = lower(trim(new.email))
        and prospect.archived_at is null
        and prospect.status not in (
          'unsubscribed',
          'not_interested',
          'bounced',
          'signed_up'
        )
      returning prospect.id
    )
    insert into public.outreach_events (prospect_id, event_type, detail)
    select marked.id, 'signup', jsonb_build_object('application_id', new.id)
    from marked;
  exception
    when others then
      return new;
  end;

  return new;
end;
$$;

revoke all on function public.outreach_mark_specialist_signup() from public, anon, authenticated;

drop trigger if exists specialist_applications_outreach_signup on public.specialist_applications;
create trigger specialist_applications_outreach_signup
after insert or update of email, profile_status on public.specialist_applications
for each row execute function public.outreach_mark_specialist_signup();

comment on table public.outreach_prospects is
  'Cold-outreach contacts imported or added by Smoac admins.';
comment on table public.outreach_campaigns is
  'Bulk outreach sends. Live delivery requires OUTREACH_LIVE_SENDS on the server.';
comment on table public.outreach_messages is
  'One row per prospect per campaign. Unique so a campaign cannot email the same person twice.';
comment on table public.outreach_events is
  'History for a prospect: imports, sends, bounces, unsubscribes, and signups.';
