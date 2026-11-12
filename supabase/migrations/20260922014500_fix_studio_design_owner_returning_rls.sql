-- Keep the direct-owner path in RLS so INSERT ... RETURNING can
-- read the row created in the current statement. Collaborator access still
-- uses the non-recursive security-definer helper.
drop policy if exists "Owners and collaborators read create_designs" on public.create_designs;
create policy "Owners and collaborators read create_designs"
on public.create_designs for select to authenticated
using (
  owner_id = (select auth.uid())
  or public.can_access_studio_design(id, 'viewer')
);

drop policy if exists "Owners and editors update create_designs" on public.create_designs;
create policy "Owners and editors update create_designs"
on public.create_designs for update to authenticated
using (
  owner_id = (select auth.uid())
  or public.can_access_studio_design(id, 'editor')
)
with check (
  owner_id = (select auth.uid())
  or public.can_access_studio_design(id, 'editor')
);
