-- Specialist can hide a thread from their Inquiries inbox without deleting
-- the client's copy of the conversation.

alter table public.inquiry_conversations
  add column if not exists specialist_hidden_at timestamptz;

comment on column public.inquiry_conversations.specialist_hidden_at is
  'When set, the specialist no longer sees this thread in Inquiries.';

create index if not exists inquiry_conversations_specialist_visible_idx
  on public.inquiry_conversations (specialist_id, last_message_at desc)
  where specialist_hidden_at is null;
