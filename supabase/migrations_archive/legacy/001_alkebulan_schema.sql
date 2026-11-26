-- Alkebulan: African Opportunity Engine
-- Core database schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- USER PROFILES
-- =====================
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  age integer,
  gender text,
  residence_country text,
  citizenship_countries text[] default '{}',
  parent_citizenship_countries text[] default '{}',
  diaspora_status text check (
    diaspora_status in (
      'Born in Africa',
      'African diaspora',
      'First-generation African',
      'African by parentage',
      'Citizen of an African country',
      'None of the above'
    )
  ),
  business_stage text check (
    business_stage in ('Idea', 'Early stage', 'Growing', 'Established', 'Not a business')
  ),
  sectors text[] default '{}',
  target_countries text[] default '{}',
  funding_types text[] default '{}',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security for user_profiles
alter table user_profiles enable row level security;

drop policy if exists "Users can read their own profile" on user_profiles;
create policy "Users can read their own profile"
  on user_profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on user_profiles;
create policy "Users can update their own profile"
  on user_profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on user_profiles;
create policy "Users can insert their own profile"
  on user_profiles for insert
  with check (auth.uid() = id);

-- =====================
-- OPPORTUNITIES
-- =====================
create table if not exists opportunities (
  id text primary key default 'opp-' || extract(epoch from now())::bigint::text,
  title text not null,
  country text not null,
  region text,
  type text not null check (
    type in ('Grant', 'Loan', 'Government contract', 'Tender', 'Accelerator', 'Fellowship', 'Procurement', 'Training', 'Investment')
  ),
  sectors text[] default '{}',
  eligibility_age_min integer,
  eligibility_age_max integer,
  eligibility_gender text,
  eligibility_citizenship text[] default '{}',
  eligibility_residence text[] default '{}',
  diaspora_allowed boolean default false,
  business_stage_required text[] default '{}',
  amount numeric,
  amount_max numeric,
  currency text default 'USD',
  deadline date,
  source_url text not null,
  source_name text not null,
  verified_status text default 'needs_review' check (
    verified_status in ('verified', 'needs_review', 'deadline_unknown', 'expired')
  ),
  summary text not null,
  description text,
  documents_required text[] default '{}',
  application_steps text[] default '{}',
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists opportunities_type_idx on opportunities(type);
create index if not exists opportunities_country_idx on opportunities(country);
create index if not exists opportunities_verified_idx on opportunities(verified_status);
create index if not exists opportunities_deadline_idx on opportunities(deadline);

-- Row Level Security for opportunities (public read)
alter table opportunities enable row level security;

drop policy if exists "Anyone can read opportunities" on opportunities;
create policy "Anyone can read opportunities"
  on opportunities for select
  using (true);

drop policy if exists "Only service role can insert/update opportunities" on opportunities;
create policy "Only service role can insert/update opportunities"
  on opportunities for insert
  with check (auth.role() = 'service_role');

drop policy if exists "Only service role can update opportunities" on opportunities;
create policy "Only service role can update opportunities"
  on opportunities for update
  using (auth.role() = 'service_role');

-- =====================
-- SAVED OPPORTUNITIES
-- =====================
create table if not exists saved_opportunities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  opportunity_id text not null,
  status text default 'saved' check (
    status in ('saved', 'applying', 'submitted', 'won', 'rejected')
  ),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, opportunity_id)
);

-- Row Level Security for saved_opportunities
alter table saved_opportunities enable row level security;

drop policy if exists "Users can manage their own saved opportunities" on saved_opportunities;
create policy "Users can manage their own saved opportunities"
  on saved_opportunities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================
-- COUNTRY PROFILES
-- =====================
create table if not exists country_profiles (
  id uuid primary key default uuid_generate_v4(),
  country text not null unique,
  country_code char(2) not null unique,
  capital text,
  population bigint,
  gdp text,
  languages text[] default '{}',
  industries text[] default '{}',
  cultural_notes text,
  historical_notes text,
  historical_empires text[] default '{}',
  ethnic_groups text[] default '{}',
  procurement_links jsonb default '[]',
  youth_programs text[] default '{}',
  women_programs text[] default '{}',
  sme_agencies text[] default '{}',
  startup_notes text,
  diaspora_notes text,
  business_etiquette text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Public read access for country profiles
alter table country_profiles enable row level security;

drop policy if exists "Anyone can read country profiles" on country_profiles;
create policy "Anyone can read country profiles"
  on country_profiles for select
  using (true);

-- =====================
-- AUTO-UPDATE TIMESTAMPS
-- =====================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_updated_at on user_profiles;
create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();

drop trigger if exists opportunities_updated_at on opportunities;
create trigger opportunities_updated_at
  before update on opportunities
  for each row execute function update_updated_at();

drop trigger if exists saved_opportunities_updated_at on saved_opportunities;
create trigger saved_opportunities_updated_at
  before update on saved_opportunities
  for each row execute function update_updated_at();

drop trigger if exists country_profiles_updated_at on country_profiles;
create trigger country_profiles_updated_at
  before update on country_profiles
  for each row execute function update_updated_at();

-- =====================
-- HANDLE NEW USER
-- Creates a user_profiles row on signup
-- =====================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
