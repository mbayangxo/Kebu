-- Track B: shared project tenancy and authorization foundation.
-- Keeps owner_id as the canonical owner while adding explicit collaborators.

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor','viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_project_idx
  on public.project_members(user_id, project_id);

alter table public.project_members enable row level security;

create or replace function public.project_access_role(p_project_id uuid, p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_user_id is null then null
    when exists (
      select 1 from public.projects p
      where p.id = p_project_id and p.owner_id = p_user_id
    ) then 'owner'
    else (
      select pm.role from public.project_members pm
      where pm.project_id = p_project_id and pm.user_id = p_user_id
      limit 1
    )
  end
$$;

revoke all on function public.project_access_role(uuid, uuid) from public, anon;
grant execute on function public.project_access_role(uuid, uuid) to authenticated, service_role;

create or replace function public.can_access_project(p_project_id uuid, p_minimum text default 'viewer')
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    case public.project_access_role(p_project_id, auth.uid())
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

drop policy if exists "Members read memberships" on public.project_members;
create policy "Members read memberships"
  on public.project_members for select
  using (user_id = auth.uid() or public.can_access_project(project_id, 'admin'));

drop policy if exists "Admins add memberships" on public.project_members;
create policy "Admins add memberships"
  on public.project_members for insert
  with check (public.can_access_project(project_id, 'admin') and user_id <> auth.uid());

drop policy if exists "Admins update memberships" on public.project_members;
create policy "Admins update memberships"
  on public.project_members for update
  using (public.can_access_project(project_id, 'admin'))
  with check (public.can_access_project(project_id, 'admin'));

drop policy if exists "Admins remove memberships" on public.project_members;
create policy "Admins remove memberships"
  on public.project_members for delete
  using (public.can_access_project(project_id, 'admin'));

-- Projects: collaborators can read; editors/admins can update. Ownership transfer remains owner-only/server-mediated.
drop policy if exists "Members select accessible projects" on public.projects;
create policy "Members select accessible projects"
  on public.projects for select
  using (public.can_access_project(id, 'viewer'));

drop policy if exists "Members update accessible projects" on public.projects;
create policy "Members update accessible projects"
  on public.projects for update
  using (public.can_access_project(id, 'editor'))
  with check (public.can_access_project(id, 'editor'));

-- Core Builder children inherit the project boundary.
drop policy if exists "Members select accessible project pages" on public.project_pages;
create policy "Members select accessible project pages"
  on public.project_pages for select
  using (public.can_access_project(project_id, 'viewer'));

drop policy if exists "Members insert accessible project pages" on public.project_pages;
create policy "Members insert accessible project pages"
  on public.project_pages for insert
  with check (public.can_access_project(project_id, 'editor'));

drop policy if exists "Members update accessible project pages" on public.project_pages;
create policy "Members update accessible project pages"
  on public.project_pages for update
  using (public.can_access_project(project_id, 'editor'))
  with check (public.can_access_project(project_id, 'editor'));

drop policy if exists "Members delete accessible project pages" on public.project_pages;
create policy "Members delete accessible project pages"
  on public.project_pages for delete
  using (public.can_access_project(project_id, 'editor'));

drop policy if exists "Members select accessible project sections" on public.project_sections;
create policy "Members select accessible project sections"
  on public.project_sections for select
  using (
    exists (
      select 1 from public.project_pages pg
      where pg.id = project_sections.page_id
        and public.can_access_project(pg.project_id, 'viewer')
    )
  );

drop policy if exists "Members insert accessible project sections" on public.project_sections;
create policy "Members insert accessible project sections"
  on public.project_sections for insert
  with check (
    exists (
      select 1 from public.project_pages pg
      where pg.id = project_sections.page_id
        and public.can_access_project(pg.project_id, 'editor')
    )
  );

drop policy if exists "Members update accessible project sections" on public.project_sections;
create policy "Members update accessible project sections"
  on public.project_sections for update
  using (
    exists (
      select 1 from public.project_pages pg
      where pg.id = project_sections.page_id
        and public.can_access_project(pg.project_id, 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.project_pages pg
      where pg.id = project_sections.page_id
        and public.can_access_project(pg.project_id, 'editor')
    )
  );

drop policy if exists "Members delete accessible project sections" on public.project_sections;
create policy "Members delete accessible project sections"
  on public.project_sections for delete
  using (
    exists (
      select 1 from public.project_pages pg
      where pg.id = project_sections.page_id
        and public.can_access_project(pg.project_id, 'editor')
    )
  );

drop trigger if exists project_members_set_updated_at on public.project_members;
create trigger project_members_set_updated_at
  before update on public.project_members
  for each row execute function public.set_updated_at();
