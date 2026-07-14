-- Specialist inquiry messaging + lightweight profile metadata
-- Conversations are client↔marketplace specialist_id; messages carry inquiry payload.

alter table public.profiles
  add column if not exists profile_completion_status text not null default 'incomplete',
  add column if not exists account_source text not null default '';

comment on column public.profiles.profile_completion_status is
  'incomplete | complete — quick inquiry signup starts incomplete';
comment on column public.profiles.account_source is
  'Origin of account creation, e.g. specialist_inquiry, questionnaire';

create table if not exists public.inquiry_conversations (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users (id) on delete cascade,
  specialist_id text not null,
  specialist_user_id uuid references auth.users (id) on delete set null,
  specialist_name text not null default '',
  inquiry_action text not null default 'ask_question',
  inquiry_topics text[] not null default '{}'::text[],
  source text not null default 'specialist_profile',
  client_first_name text not null default '',
  client_email text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiry_conversations_client_idx
  on public.inquiry_conversations (client_user_id, last_message_at desc);

create index if not exists inquiry_conversations_specialist_idx
  on public.inquiry_conversations (specialist_id, last_message_at desc);

create unique index if not exists inquiry_conversations_client_specialist_uidx
  on public.inquiry_conversations (client_user_id, specialist_id);

create table if not exists public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.inquiry_conversations (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  sender_role text not null
    check (sender_role in ('client', 'specialist')),
  body text not null,
  inquiry_action text,
  inquiry_topics text[] not null default '{}'::text[],
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists inquiry_messages_conversation_idx
  on public.inquiry_messages (conversation_id, created_at asc);

create trigger inquiry_conversations_updated_at
before update on public.inquiry_conversations
for each row execute function public.touch_updated_at();

alter table public.inquiry_conversations enable row level security;
alter table public.inquiry_messages enable row level security;

-- Resolve whether the current user owns the specialist marketplace id
create or replace function public.owns_marketplace_specialist(p_specialist_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.specialist_applications sa
    where sa.user_id = auth.uid()
      and sa.id = p_specialist_id
  );
$$;

revoke all on function public.owns_marketplace_specialist(text) from public;
grant execute on function public.owns_marketplace_specialist(text) to authenticated;

drop policy if exists "inquiry_conversations_select_participant" on public.inquiry_conversations;
create policy "inquiry_conversations_select_participant"
on public.inquiry_conversations for select
to authenticated
using (
  auth.uid() = client_user_id
  or auth.uid() = specialist_user_id
  or public.owns_marketplace_specialist(specialist_id)
  or public.is_admin()
);

drop policy if exists "inquiry_conversations_insert_client" on public.inquiry_conversations;
create policy "inquiry_conversations_insert_client"
on public.inquiry_conversations for insert
to authenticated
with check (auth.uid() = client_user_id);

drop policy if exists "inquiry_conversations_update_participant" on public.inquiry_conversations;
create policy "inquiry_conversations_update_participant"
on public.inquiry_conversations for update
to authenticated
using (
  auth.uid() = client_user_id
  or auth.uid() = specialist_user_id
  or public.owns_marketplace_specialist(specialist_id)
)
with check (
  auth.uid() = client_user_id
  or auth.uid() = specialist_user_id
  or public.owns_marketplace_specialist(specialist_id)
);

drop policy if exists "inquiry_messages_select_participant" on public.inquiry_messages;
create policy "inquiry_messages_select_participant"
on public.inquiry_messages for select
to authenticated
using (
  exists (
    select 1
    from public.inquiry_conversations c
    where c.id = conversation_id
      and (
        c.client_user_id = auth.uid()
        or c.specialist_user_id = auth.uid()
        or public.owns_marketplace_specialist(c.specialist_id)
        or public.is_admin()
      )
  )
);

drop policy if exists "inquiry_messages_insert_participant" on public.inquiry_messages;
create policy "inquiry_messages_insert_participant"
on public.inquiry_messages for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1
    from public.inquiry_conversations c
    where c.id = conversation_id
      and (
        c.client_user_id = auth.uid()
        or c.specialist_user_id = auth.uid()
        or public.owns_marketplace_specialist(c.specialist_id)
      )
  )
);

drop policy if exists "inquiry_messages_update_read" on public.inquiry_messages;
create policy "inquiry_messages_update_read"
on public.inquiry_messages for update
to authenticated
using (
  exists (
    select 1
    from public.inquiry_conversations c
    where c.id = conversation_id
      and (
        c.specialist_user_id = auth.uid()
        or public.owns_marketplace_specialist(c.specialist_id)
        or c.client_user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.inquiry_conversations c
    where c.id = conversation_id
      and (
        c.specialist_user_id = auth.uid()
        or public.owns_marketplace_specialist(c.specialist_id)
        or c.client_user_id = auth.uid()
      )
  )
);

grant select, insert, update on table public.inquiry_conversations to authenticated;
grant select, insert, update on table public.inquiry_messages to authenticated;
grant all on table public.inquiry_conversations to service_role;
grant all on table public.inquiry_messages to service_role;
