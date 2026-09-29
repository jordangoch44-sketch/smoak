-- Purpose: inbox hide + mark-unread follow the account, and live inbox updates.
-- Safe to re-run.
-- Apply after apply-inquiry-specialist-hidden-safe.sql.

alter table public.inquiry_conversations
  add column if not exists client_hidden_at timestamptz,
  add column if not exists client_marked_unread_at timestamptz,
  add column if not exists specialist_marked_unread_at timestamptz;

comment on column public.inquiry_conversations.client_hidden_at is
  'When set, the client no longer sees this thread in Inquiries.';
comment on column public.inquiry_conversations.client_marked_unread_at is
  'Client marked the thread unread. Cleared when they open it or mark it read.';
comment on column public.inquiry_conversations.specialist_marked_unread_at is
  'Specialist marked the thread unread. Cleared when they open it or mark it read.';

create index if not exists inquiry_conversations_client_visible_idx
  on public.inquiry_conversations (client_user_id, last_message_at desc)
  where client_hidden_at is null;

create or replace function public.guard_inquiry_conversation_party_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if auth.uid() = old.client_user_id
     and auth.uid() is distinct from old.specialist_user_id
     and not public.owns_marketplace_specialist(old.specialist_id) then
    new.specialist_hidden_at := old.specialist_hidden_at;
    new.specialist_marked_unread_at := old.specialist_marked_unread_at;
  end if;

  if (
    auth.uid() = old.specialist_user_id
    or public.owns_marketplace_specialist(old.specialist_id)
  )
     and auth.uid() is distinct from old.client_user_id then
    new.client_hidden_at := old.client_hidden_at;
    new.client_marked_unread_at := old.client_marked_unread_at;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_inquiry_conversation_party_fields() from public;

drop trigger if exists inquiry_conversations_guard_party_fields
  on public.inquiry_conversations;

create trigger inquiry_conversations_guard_party_fields
before update on public.inquiry_conversations
for each row execute function public.guard_inquiry_conversation_party_fields();

alter table public.inquiry_conversations replica identity full;
alter table public.inquiry_messages replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'inquiry_conversations'
    ) then
      alter publication supabase_realtime add table public.inquiry_conversations;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'inquiry_messages'
    ) then
      alter publication supabase_realtime add table public.inquiry_messages;
    end if;
  end if;
end $$;
