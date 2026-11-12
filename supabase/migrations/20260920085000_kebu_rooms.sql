create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  room_type text not null default 'project' check (room_type in ('project','team','community','client')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_links (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 160),
  url text not null check (char_length(url) between 8 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.room_decisions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  detail text not null default '' check (char_length(detail) <= 8000),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.workspace_items add column if not exists room_id uuid references public.rooms(id) on delete cascade;
create index if not exists workspace_items_room_idx on public.workspace_items(room_id, kind, updated_at desc) where room_id is not null;

alter table public.space_channels add column if not exists room_id uuid references public.rooms(id) on delete cascade;
create unique index if not exists space_channels_room_unique on public.space_channels(room_id) where room_id is not null;

create index if not exists rooms_business_idx on public.rooms(business_id, updated_at desc) where business_id is not null;
create index if not exists rooms_creator_idx on public.rooms(created_by, updated_at desc);
create index if not exists room_posts_room_idx on public.room_posts(room_id, created_at desc);
create index if not exists room_links_room_idx on public.room_links(room_id, created_at desc);
create index if not exists room_decisions_room_idx on public.room_decisions(room_id, decided_at desc);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_posts enable row level security;
alter table public.room_links enable row level security;
alter table public.room_decisions enable row level security;

create or replace function public.can_access_room(p_room_id uuid)
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
          select 1 from public.room_members rm
          where rm.room_id = r.id and rm.user_id = auth.uid()
        )
        or (
          r.business_id is not null
          and exists (
            select 1 from public.business_members bm
            where bm.business_id = r.business_id and bm.user_id = auth.uid() and bm.status = 'active'
          )
        )
      )
  );
$$;

revoke all on function public.can_access_room(uuid) from public, anon;
grant execute on function public.can_access_room(uuid) to authenticated, service_role;

drop policy if exists "Members read rooms" on public.rooms;
create policy "Members read rooms" on public.rooms for select using (public.can_access_room(id));

drop policy if exists "Users create rooms" on public.rooms;
create policy "Users create rooms" on public.rooms for insert with check (
  created_by = auth.uid()
  and (
    business_id is null
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = rooms.business_id and bm.user_id = auth.uid() and bm.status = 'active'
    )
  )
);

drop policy if exists "Room owners update rooms" on public.rooms;
create policy "Room owners update rooms" on public.rooms for update using (
  created_by = auth.uid()
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = rooms.id and rm.user_id = auth.uid() and rm.role in ('owner','admin')
  )
);

drop policy if exists "Members read room membership" on public.room_members;
create policy "Members read room membership" on public.room_members for select using (public.can_access_room(room_id));

drop policy if exists "Room admins manage membership" on public.room_members;
create policy "Room admins manage membership" on public.room_members for all using (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.room_members self
          where self.room_id = r.id and self.user_id = auth.uid() and self.role in ('owner','admin')
        )
      )
  )
) with check (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.room_members self
          where self.room_id = r.id and self.user_id = auth.uid() and self.role in ('owner','admin')
        )
      )
  )
);

drop policy if exists "Members read room posts" on public.room_posts;
create policy "Members read room posts" on public.room_posts for select using (public.can_access_room(room_id));
drop policy if exists "Members create room posts" on public.room_posts;
create policy "Members create room posts" on public.room_posts for insert with check (author_id = auth.uid() and public.can_access_room(room_id));
drop policy if exists "Authors manage room posts" on public.room_posts;
create policy "Authors manage room posts" on public.room_posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "Authors delete room posts" on public.room_posts;
create policy "Authors delete room posts" on public.room_posts for delete using (author_id = auth.uid());

drop policy if exists "Members read room links" on public.room_links;
create policy "Members read room links" on public.room_links for select using (public.can_access_room(room_id));
drop policy if exists "Members create room links" on public.room_links;
create policy "Members create room links" on public.room_links for insert with check (created_by = auth.uid() and public.can_access_room(room_id));
drop policy if exists "Creators delete room links" on public.room_links;
create policy "Creators delete room links" on public.room_links for delete using (created_by = auth.uid());

drop policy if exists "Members read room decisions" on public.room_decisions;
create policy "Members read room decisions" on public.room_decisions for select using (public.can_access_room(room_id));
drop policy if exists "Members create room decisions" on public.room_decisions;
create policy "Members create room decisions" on public.room_decisions for insert with check (created_by = auth.uid() and public.can_access_room(room_id));
drop policy if exists "Creators manage room decisions" on public.room_decisions;
create policy "Creators manage room decisions" on public.room_decisions for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "Room members read scoped work items" on public.workspace_items;
create policy "Room members read scoped work items" on public.workspace_items for select using (
  (room_id is not null and public.can_access_room(room_id))
);

drop policy if exists "Room members create scoped work items" on public.workspace_items;
create policy "Room members create scoped work items" on public.workspace_items for insert with check (
  room_id is not null and owner_id = auth.uid() and public.can_access_room(room_id)
);

drop policy if exists "Room members read room channels" on public.space_channels;
create policy "Room members read room channels" on public.space_channels for select using (
  room_id is not null and public.can_access_room(room_id)
);

drop policy if exists "Room members send room channel messages" on public.space_messages;
create policy "Room members send room channel messages" on public.space_messages for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id and c.room_id is not null and public.can_access_room(c.room_id)
  )
);
