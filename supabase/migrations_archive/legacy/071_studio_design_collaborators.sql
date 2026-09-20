-- Studio collab: share designs with editors / viewers (not live cursors)
-- Depends on: create_designs (022)

create table if not exists public.studio_design_collaborators (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.create_designs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(trim(email)) between 3 and 254),
  role text not null check (role in ('editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (design_id, user_id)
);

create index if not exists studio_design_collaborators_user_idx
  on public.studio_design_collaborators (user_id, status)
  where status = 'active';

create index if not exists studio_design_collaborators_design_idx
  on public.studio_design_collaborators (design_id, status);

alter table public.studio_design_collaborators enable row level security;

drop policy if exists "Design owners manage collaborators" on public.studio_design_collaborators;
create policy "Design owners manage collaborators"
  on public.studio_design_collaborators for all
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_collaborators.design_id
        and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_collaborators.design_id
        and d.owner_id = auth.uid()
    )
  );

drop policy if exists "Collaborators read own membership" on public.studio_design_collaborators;
create policy "Collaborators read own membership"
  on public.studio_design_collaborators for select
  using (user_id = auth.uid() and status = 'active');

-- Expand create_designs access for collaborators
drop policy if exists "Owners manage create_designs" on public.create_designs;
drop policy if exists "Owners and collaborators read create_designs" on public.create_designs;
drop policy if exists "Owners and editors update create_designs" on public.create_designs;
drop policy if exists "Owners insert create_designs" on public.create_designs;
drop policy if exists "Owners delete create_designs" on public.create_designs;

create policy "Owners insert create_designs"
  on public.create_designs for insert
  with check (owner_id = auth.uid());

create policy "Owners and collaborators read create_designs"
  on public.create_designs for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.studio_design_collaborators c
      where c.design_id = create_designs.id
        and c.user_id = auth.uid()
        and c.status = 'active'
    )
  );

create policy "Owners and editors update create_designs"
  on public.create_designs for update
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.studio_design_collaborators c
      where c.design_id = create_designs.id
        and c.user_id = auth.uid()
        and c.status = 'active'
        and c.role = 'editor'
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1 from public.studio_design_collaborators c
      where c.design_id = create_designs.id
        and c.user_id = auth.uid()
        and c.status = 'active'
        and c.role = 'editor'
    )
  );

create policy "Owners delete create_designs"
  on public.create_designs for delete
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_design_collaborators to authenticated;
grant all on public.studio_design_collaborators to service_role;

drop trigger if exists studio_design_collaborators_set_updated_at on public.studio_design_collaborators;
create trigger studio_design_collaborators_set_updated_at
  before update on public.studio_design_collaborators
  for each row execute function public.set_updated_at();
