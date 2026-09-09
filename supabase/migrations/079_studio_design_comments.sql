-- S20: Async comments on Studio designs (not live cursors)
-- Depends on: create_designs (022), studio_design_collaborators (071)

create table if not exists public.studio_design_comments (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.create_designs(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  /** Optional pin on canvas (normalized 0–1) */
  anchor_x numeric(6,4) check (anchor_x is null or (anchor_x >= 0 and anchor_x <= 1)),
  anchor_y numeric(6,4) check (anchor_y is null or (anchor_y >= 0 and anchor_y <= 1)),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_design_comments_design_idx
  on public.studio_design_comments (design_id, created_at desc);

alter table public.studio_design_comments enable row level security;

drop policy if exists "Design members read comments" on public.studio_design_comments;
create policy "Design members read comments"
  on public.studio_design_comments for select
  using (
    exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id and c.user_id = auth.uid() and c.status = 'active'
          )
        )
    )
  );

drop policy if exists "Design members insert comments" on public.studio_design_comments;
create policy "Design members insert comments"
  on public.studio_design_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.studio_design_collaborators c
            where c.design_id = d.id and c.user_id = auth.uid() and c.status = 'active'
          )
        )
    )
  );

drop policy if exists "Authors and owners update comments" on public.studio_design_comments;
create policy "Authors and owners update comments"
  on public.studio_design_comments for update
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id and d.owner_id = auth.uid()
    )
  )
  with check (
    author_id = auth.uid()
    or exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id and d.owner_id = auth.uid()
    )
  );

drop policy if exists "Authors and owners delete comments" on public.studio_design_comments;
create policy "Authors and owners delete comments"
  on public.studio_design_comments for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.create_designs d
      where d.id = studio_design_comments.design_id and d.owner_id = auth.uid()
    )
  );

drop trigger if exists studio_design_comments_set_updated_at on public.studio_design_comments;
create trigger studio_design_comments_set_updated_at
  before update on public.studio_design_comments
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.studio_design_comments to authenticated;
grant all on public.studio_design_comments to service_role;

notify pgrst, 'reload schema';
