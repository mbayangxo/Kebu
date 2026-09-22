-- Use (select auth.uid()) anti-recursion pattern in the owner-check policies
-- so that evaluating the SELECT/UPDATE policy does not re-trigger itself.
drop policy if exists "Owners and collaborators read create_designs" on public.create_designs;
drop policy if exists "Owners and editors update create_designs" on public.create_designs;

create policy "Owners and collaborators read create_designs"
  on public.create_designs
  for select
  using (
    (owner_id = (select auth.uid()))
    or can_access_studio_design(id, 'viewer'::text)
  );

create policy "Owners and editors update create_designs"
  on public.create_designs
  for update
  using (
    (owner_id = (select auth.uid()))
    or can_access_studio_design(id, 'editor'::text)
  )
  with check (
    (owner_id = (select auth.uid()))
    or can_access_studio_design(id, 'editor'::text)
  );
