-- Grants for PostgREST service_role (table probe + server scripts)
grant all on table public.user_roles to service_role;
grant all on table public.profiles to service_role;
grant usage on type public.app_role to service_role;
