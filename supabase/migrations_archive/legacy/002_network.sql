-- Network profiles for the First-Order Collective

create table if not exists network_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete set null,
  name text not null,
  initials text generated always as (
    upper(left(name, 1)) || upper(left(split_part(name, ' ', 2), 1))
  ) stored,
  location text not null,
  country text not null,
  sector text not null,
  headline text not null,
  building text not null,
  offering text not null,
  looking_for text[] default '{}',
  stage text check (stage in ('Idea', 'Early stage', 'Growing', 'Established')),
  languages text[] default '{}',
  is_visible boolean default true,
  is_verified boolean default false,
  contact_count integer default 0,
  joined_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists network_profiles_country_idx on network_profiles(country);
create index if not exists network_profiles_sector_idx on network_profiles(sector);
create index if not exists network_profiles_looking_for_idx on network_profiles using gin(looking_for);
create index if not exists network_profiles_visible_idx on network_profiles(is_visible);

-- Row Level Security
alter table network_profiles enable row level security;

create policy "Anyone can read visible network profiles"
  on network_profiles for select
  using (is_visible = true);

create policy "Users can insert their own network profile"
  on network_profiles for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can update their own network profile"
  on network_profiles for update
  using (auth.uid() = user_id);

create trigger network_profiles_updated_at
  before update on network_profiles
  for each row execute function update_updated_at();
