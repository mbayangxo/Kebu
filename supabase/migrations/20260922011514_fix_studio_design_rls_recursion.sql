-- Fix infinite-recursion in can_access_studio_design: wrap auth.uid() in a
-- sub-select so Postgres does not re-evaluate RLS on create_designs when the
-- function itself queries that table.
create or replace function public.can_access_studio_design(
  p_design_id uuid,
  p_required_role text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.create_designs d
      where d.id = p_design_id
        and d.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.studio_design_collaborators c
      where c.design_id = p_design_id
        and c.user_id = (select auth.uid())
        and c.status = 'active'
        and (
          p_required_role = 'viewer'
          or (p_required_role = 'editor' and c.role = 'editor')
        )
    );
$$;
