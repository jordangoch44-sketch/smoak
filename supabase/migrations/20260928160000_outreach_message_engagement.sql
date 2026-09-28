-- Outreach campaign analytics: per-message delivery, open, and click stamps
-- written by the Resend webhook.

alter table public.outreach_messages
  add column if not exists delivered_at timestamptz,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists open_count integer not null default 0,
  add column if not exists click_count integer not null default 0;

comment on column public.outreach_messages.opened_at is
  'First open reported by Resend. Apple Mail privacy can report opens nobody made.';
comment on column public.outreach_messages.clicked_at is
  'First link click reported by Resend.';
