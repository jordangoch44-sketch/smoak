-- ============================================================================
-- PRODUCTION-SAFE: Inquiry tables for SMOAC
-- Project: already has specialist_profiles (20260716) applied
-- Purpose: create missing inquiry_conversations / inquiry_messages once
--
-- HOW TO APPLY
--   Supabase Dashboard → SQL Editor → paste this entire file → Run
--
-- WHAT THIS DOES
--   • Adds optional profile columns used by quick client signup
--   • Creates inquiry_conversations + inquiry_messages (if missing)
--   • Indexes, unique constraint, FK, RLS policies, grants
--   • Installs owns_marketplace_specialist() in the NEWEST form
--     (applications OR specialist_profiles) — never the older apps-only version
--
-- WHAT THIS DOES NOT DO
--   • Does not create/alter specialist_profiles
--   • Does not drop or rewrite specialist_profiles policies/grants
--   • Does not install the older owns_marketplace_specialist() body
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Profile columns for quick inquiry / client signup metadata
--    Source: 20260714000000_specialist_inquiries.sql
--    Safe: ADD COLUMN IF NOT EXISTS (no-op if already present)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists profile_completion_status text not null default 'incomplete',
  add column if not exists account_source text not null default '',
  add column if not exists password_setup_status text not null default 'complete';

comment on column public.profiles.profile_completion_status is
  'incomplete | complete — quick inquiry signup starts incomplete';
comment on column public.profiles.account_source is
  'Origin of account creation, e.g. specialist_inquiry, questionnaire';
comment on column public.profiles.password_setup_status is
  'pending | complete | skipped — quick OTP signup starts pending';

-- ---------------------------------------------------------------------------
-- 2) inquiry_conversations
--    Source: 20260714000000_specialist_inquiries.sql
--    Safe: CREATE TABLE IF NOT EXISTS
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3) inquiry_messages
--    Source: 20260714000000_specialist_inquiries.sql
--    Safe: CREATE TABLE IF NOT EXISTS + FK to conversations
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4) updated_at trigger (depends on existing public.touch_updated_at())
--    Modification vs original migration: DROP TRIGGER IF EXISTS so a partial
--    re-run does not fail with "trigger already exists".
-- ---------------------------------------------------------------------------
drop trigger if exists inquiry_conversations_updated_at
  on public.inquiry_conversations;

create trigger inquiry_conversations_updated_at
before update on public.inquiry_conversations
for each row execute function public.touch_updated_at();

alter table public.inquiry_conversations enable row level security;
alter table public.inquiry_messages enable row level security;

-- ---------------------------------------------------------------------------
-- 5) owns_marketplace_specialist — NEWEST definition only
--    Source: 20260716000000_specialist_profiles.sql (NOT the July 14 body)
--
--    Why this change:
--      The July 14 migration defined ownership via specialist_applications only.
--      July 16 replaced it so published specialists with a specialist_profiles
--      row are also owners (required for inquiry inbox RLS).
--      Your production DB already has specialist_profiles; installing the older
--      body would regress specialist inquiry visibility.
-- ---------------------------------------------------------------------------
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
  )
  or exists (
    select 1
    from public.specialist_profiles sp
    where sp.user_id = auth.uid()
      and sp.id = p_specialist_id
  );
$$;

revoke all on function public.owns_marketplace_specialist(text) from public;
grant execute on function public.owns_marketplace_specialist(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) RLS policies (idempotent drop + create)
--    Source: 20260714000000_specialist_inquiries.sql
-- ---------------------------------------------------------------------------
drop policy if exists "inquiry_conversations_select_participant"
  on public.inquiry_conversations;
create policy "inquiry_conversations_select_participant"
on public.inquiry_conversations for select
to authenticated
using (
  auth.uid() = client_user_id
  or auth.uid() = specialist_user_id
  or public.owns_marketplace_specialist(specialist_id)
  or public.is_admin()
);

drop policy if exists "inquiry_conversations_insert_client"
  on public.inquiry_conversations;
create policy "inquiry_conversations_insert_client"
on public.inquiry_conversations for insert
to authenticated
with check (auth.uid() = client_user_id);

drop policy if exists "inquiry_conversations_update_participant"
  on public.inquiry_conversations;
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

drop policy if exists "inquiry_messages_select_participant"
  on public.inquiry_messages;
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

drop policy if exists "inquiry_messages_insert_participant"
  on public.inquiry_messages;
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

drop policy if exists "inquiry_messages_update_read"
  on public.inquiry_messages;
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

-- ---------------------------------------------------------------------------
-- 7) Grants
--    Source: 20260714000000_specialist_inquiries.sql
-- ---------------------------------------------------------------------------
grant select, insert, update on table public.inquiry_conversations to authenticated;
grant select, insert, update on table public.inquiry_messages to authenticated;
grant all on table public.inquiry_conversations to service_role;
grant all on table public.inquiry_messages to service_role;

-- ---------------------------------------------------------------------------
-- Done. After Run succeeds, optionally notify PostgREST (usually automatic):
--   Dashboard → Project Settings → API → Reload schema  (if selects still 404)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 8) Client profile preferences + avatars bucket
--    Source: 20260717120000_client_profile_preferences.sql
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists client_state text not null default '',
  add column if not exists avatar_path text not null default '',
  add column if not exists preferred_radius_miles integer,
  add column if not exists preferred_price_min numeric,
  add column if not exists preferred_price_max numeric,
  add column if not exists preferred_professions text[] not null default '{}',
  add column if not exists preferred_specialties text[] not null default '{}',
  add column if not exists preferred_gender text not null default '',
  add column if not exists preferred_session_format text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] = auth.uid()::text
);
