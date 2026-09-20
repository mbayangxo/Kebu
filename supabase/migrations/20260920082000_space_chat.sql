create table if not exists public.space_channels (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.space_channels(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists space_channels_business_idx on public.space_channels (business_id, updated_at desc) where business_id is not null;
create index if not exists space_channels_creator_idx on public.space_channels (created_by, updated_at desc);
create index if not exists space_messages_channel_idx on public.space_messages (channel_id, created_at asc);

alter table public.space_channels enable row level security;
alter table public.space_messages enable row level security;

drop policy if exists "Members read channels" on public.space_channels;
create policy "Members read channels" on public.space_channels for select using (
  created_by = auth.uid()
  or (
    business_id is not null and exists (
      select 1 from public.business_members m where m.business_id = space_channels.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Members create channels" on public.space_channels;
create policy "Members create channels" on public.space_channels for insert with check (
  created_by = auth.uid()
  and (
    business_id is null or exists (
      select 1 from public.business_members m where m.business_id = space_channels.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Members update channels" on public.space_channels;
create policy "Members update channels" on public.space_channels for update using (
  created_by = auth.uid()
  or (
    business_id is not null and exists (
      select 1 from public.business_members m where m.business_id = space_channels.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Members read messages" on public.space_messages;
create policy "Members read messages" on public.space_messages for select using (
  exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        c.created_by = auth.uid()
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m where m.business_id = c.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);

drop policy if exists "Members send messages" on public.space_messages;
create policy "Members send messages" on public.space_messages for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        c.created_by = auth.uid()
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m where m.business_id = c.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);
