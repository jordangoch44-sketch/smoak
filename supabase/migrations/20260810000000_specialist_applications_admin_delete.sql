-- Allow admins to hard-delete specialist applications (reject / purge / sibling cleanup).
-- Previously only select/insert/update were granted — soft-archive left ghosts on Specialists.

grant delete on table public.specialist_applications to authenticated;

drop policy if exists "specialist_applications_delete_admin" on public.specialist_applications;
create policy "specialist_applications_delete_admin"
on public.specialist_applications for delete to authenticated
using (public.is_admin());
