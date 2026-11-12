create table if not exists public.browser_journeys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.browser_tabs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid references public.browser_journeys(id) on delete set null,
  title text not null default 'New tab',
  url text not null default '',
  position integer not null default 0,
  pinned boolean not null default false,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.browser_bookmarks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid references public.browser_journeys(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  url text not null check (char_length(url) between 8 and 2000),
  created_at timestamptz not null default now(),
  unique (owner_id, url)
);

create table if not exists public.browser_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tab_id uuid references public.browser_tabs(id) on delete set null,
  title text not null default '',
  url text not null check (char_length(url) between 8 and 2000),
  visited_at timestamptz not null default now()
);

create index if not exists browser_tabs_owner_position_idx on public.browser_tabs(owner_id, position, last_opened_at desc);
create index if not exists browser_history_owner_time_idx on public.browser_history(owner_id, visited_at desc);
create index if not exists browser_bookmarks_owner_time_idx on public.browser_bookmarks(owner_id, created_at desc);

alter table public.browser_journeys enable row level security;
alter table public.browser_tabs enable row level security;
alter table public.browser_bookmarks enable row level security;
alter table public.browser_history enable row level security;

create policy "Users manage own browser journeys" on public.browser_journeys for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own browser tabs" on public.browser_tabs for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own browser bookmarks" on public.browser_bookmarks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Users manage own browser history" on public.browser_history for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
