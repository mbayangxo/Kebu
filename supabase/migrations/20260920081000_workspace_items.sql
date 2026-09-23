create table if not exists public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('task','event','doc')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  body text not null default '' check (char_length(body) <= 20000),
  status text not null default 'open' check (status in ('open','done','draft')),
  due_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_items_owner_kind_idx
  on public.workspace_items (owner_id, kind, updated_at desc);

create index if not exists workspace_items_business_kind_idx
  on public.workspace_items (business_id, kind, updated_at desc)
  where business_id is not null;

alter table public.workspace_items enable row level security;

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items"
  on public.workspace_items for select
  using (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );

drop policy if exists "Workspace members create items" on public.workspace_items;
create policy "Workspace members create items"
  on public.workspace_items for insert
  with check (
    owner_id = auth.uid()
    and (
      business_id is null or exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items"
  on public.workspace_items for update
  using (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items"
  on public.workspace_items for delete
  using (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );
