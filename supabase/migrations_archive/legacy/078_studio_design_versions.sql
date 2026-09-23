-- S18: Studio design version history (restore prior canvas)
-- Depends on: create_designs (022), studio_design_collaborators (071) optional

create table if not exists public.studio_design_versions (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.create_designs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  canvas jsonb not null,
  label text check (label is null or char_length(trim(label)) between 1 and 120),
  source text not null default 'auto'
    check (source in ('auto', 'manual', 'pre_restore')),
  created_at timestamptz not null default now()
);

create index if not exists studio_design_versions_design_idx
  on public.studio_design_versions (design_id, created_at desc);

alter table public.studio_design_versions enable row level security;

drop policy if exists "Design members read versions" on public.studio_design_versions;
create policy "Design members read versions"
  on public.studio_design_versions for select
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_versions.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id
              and c.user_id = auth.uid()
              and c.status = 'active'
          )
        )
    )
  );

drop policy if exists "Editors insert versions" on public.studio_design_versions;
create policy "Editors insert versions"
  on public.studio_design_versions for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.create_designs d
      where d.id = studio_design_versions.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id
              and c.user_id = auth.uid()
              and c.status = 'active'
              and c.role = 'editor'
          )
        )
    )
  );

drop policy if exists "Editors prune versions" on public.studio_design_versions;
create policy "Editors prune versions"
  on public.studio_design_versions for delete
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_versions.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id
              and c.user_id = auth.uid()
              and c.status = 'active'
              and c.role = 'editor'
          )
        )
    )
  );

-- No client updates — prune + cascade delete only.
grant select, insert, delete on public.studio_design_versions to authenticated;
grant all on public.studio_design_versions to service_role;

notify pgrst, 'reload schema';
