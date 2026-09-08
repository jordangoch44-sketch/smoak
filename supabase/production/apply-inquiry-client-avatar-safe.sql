-- Purpose: add client_avatar_url on inquiry_conversations (thread avatars).
-- Safe to re-run.

alter table public.inquiry_conversations
  add column if not exists client_avatar_url text not null default '';
