-- Break the mutual RLS recursion between create_designs and
-- studio_design_collaborators. These helpers run with a fixed empty
-- search_path and derive identity from auth.uid().
create or replace function public.is_studio_design_owner(p_design_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.create_designs d
    where d.id = p_design_id and d.owner_id = (select auth.uid())
  );
$$;

create or replace function public.can_access_studio_design(
  p_design_id uuid,
  p_required_role text default 'viewer'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.create_designs d
      where d.id = p_design_id and d.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.studio_design_collaborators c
      where c.design_id = p_design_id
        and c.user_id = (select auth.uid())
        and c.status = 'active'
        and (
          p_required_role = 'viewer'
          or (p_required_role = 'editor' and c.role = 'editor')
        )
    );
$$;

revoke all on function public.is_studio_design_owner(uuid) from public;
revoke all on function public.can_access_studio_design(uuid, text) from public;
grant execute on function public.is_studio_design_owner(uuid) to authenticated, service_role;
grant execute on function public.can_access_studio_design(uuid, text) to authenticated, service_role;

drop policy if exists "Owners and collaborators read create_designs" on public.create_designs;
create policy "Owners and collaborators read create_designs"
on public.create_designs for select to authenticated
using (public.can_access_studio_design(id, 'viewer'));

drop policy if exists "Owners and editors update create_designs" on public.create_designs;
create policy "Owners and editors update create_designs"
on public.create_designs for update to authenticated
using (public.can_access_studio_design(id, 'editor'))
with check (public.can_access_studio_design(id, 'editor'));

drop policy if exists "Design owners manage collaborators" on public.studio_design_collaborators;
create policy "Design owners manage collaborators"
on public.studio_design_collaborators for all to authenticated
using (public.is_studio_design_owner(design_id))
with check (public.is_studio_design_owner(design_id));

drop policy if exists "Collaborators read own membership" on public.studio_design_collaborators;
create policy "Collaborators read own membership"
on public.studio_design_collaborators for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_studio_design_owner(design_id)
);
