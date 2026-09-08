-- Inquiry threads: snapshot client avatar on the conversation for specialist inboxes.
-- Safe to re-run.

alter table public.inquiry_conversations
  add column if not exists client_avatar_url text not null default '';

comment on column public.inquiry_conversations.client_avatar_url is
  'Public https avatar snapshot for the client; empty shows initials in the inbox.';
