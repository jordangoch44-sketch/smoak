-- Denormalized zip + role on profiles for dashboards and admin queries
alter table public.profiles
  add column if not exists zip_code text not null default '';

alter table public.profiles
  add column if not exists role public.app_role;

update public.profiles
set zip_code = client_zip_code
where zip_code = '' and client_zip_code <> '';

update public.profiles p
set role = ur.role
from public.user_roles ur
where p.user_id = ur.user_id and p.role is null;
