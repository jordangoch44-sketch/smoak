-- Profile avatar URL for mobile bottom-nav + account chrome
-- Synced from specialist (and future client) photo uploads.

alter table public.profiles
  add column if not exists avatar_url text not null default '';
