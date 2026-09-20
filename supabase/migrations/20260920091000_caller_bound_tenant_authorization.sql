-- Keep recursive tenant authorization behind a non-exposed schema and bind
-- every public authorization decision to the current authenticated subject.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.project_access_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null then null
    when exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    ) then 'owner'
    else (
      select pm.role
      from public.project_members pm
      where pm.project_id = p_project_id and pm.user_id = auth.uid()
      limit 1
    )
  end
$$;

revoke all on function private.project_access_role(uuid) from public, anon;
grant execute on function private.project_access_role(uuid) to authenticated, service_role;

create or replace function private.can_access_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.archived_at is null
      and (
        r.created_by = auth.uid()
        or exists (
          select 1
          from public.room_members rm
          where rm.room_id = r.id and rm.user_id = auth.uid()
        )
      )
  )
$$;

revoke all on function private.can_access_room(uuid) from public, anon;
grant execute on function private.can_access_room(uuid) to authenticated, service_role;

drop function if exists public.project_access_role(uuid, uuid);

create or replace function public.project_access_role(p_project_id uuid)
returns text
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select private.project_access_role(p_project_id)
$$;

revoke all on function public.project_access_role(uuid) from public, anon;
grant execute on function public.project_access_role(uuid) to authenticated, service_role;

create or replace function public.can_access_project(p_project_id uuid, p_minimum text default 'viewer')
returns boolean
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select coalesce(
    case private.project_access_role(p_project_id)
      when 'owner' then 4
      when 'admin' then 3
      when 'editor' then 2
      when 'viewer' then 1
      else 0
    end >=
    case p_minimum
      when 'owner' then 4
      when 'admin' then 3
      when 'editor' then 2
      when 'viewer' then 1
      else 99
    end,
    false
  )
$$;

revoke all on function public.can_access_project(uuid, text) from public, anon;
grant execute on function public.can_access_project(uuid, text) to authenticated, service_role;

create or replace function public.can_access_room(p_room_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, private, pg_temp
as $$
  select private.can_access_room(p_room_id)
$$;

revoke all on function public.can_access_room(uuid) from public, anon;
grant execute on function public.can_access_room(uuid) to authenticated, service_role;

