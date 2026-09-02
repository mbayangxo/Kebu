-- =============================================================================
-- KEBU PHASE ONE — apply all migrations (paste entire file into Supabase SQL Editor)
-- Fresh project: run once. If you already ran 001+009, run only 004-017 sections.
-- Generated: 2026-09-01
-- =============================================================================

-- ########## BEGIN 001_alkebulan_schema.sql ##########
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

create policy "Users can read their own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on user_profiles for update
  using (auth.uid() = id);

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

create policy "Anyone can read opportunities"
  on opportunities for select
  using (true);

create policy "Only service role can insert/update opportunities"
  on opportunities for insert
  with check (auth.role() = 'service_role');

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

create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();

create trigger opportunities_updated_at
  before update on opportunities
  for each row execute function update_updated_at();

create trigger saved_opportunities_updated_at
  before update on saved_opportunities
  for each row execute function update_updated_at();

create trigger country_profiles_updated_at
  before update on country_profiles
  for each row execute function update_updated_at();

-- =====================
-- HANDLE NEW USER
-- Creates a user_profiles row on signup
-- =====================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ########## END 001_alkebulan_schema.sql ##########

-- ########## BEGIN 002_network.sql ##########
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

-- ########## END 002_network.sql ##########

-- ########## BEGIN 003_tracker_vault.sql ##########
-- Application tracker
create table if not exists application_tracker (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete cascade,
  opportunity_id text not null,
  opportunity_title text not null,
  opportunity_type text not null,
  opportunity_country text not null,
  opportunity_amount bigint,
  opportunity_currency text default 'USD',
  status text not null default 'saved'
    check (status in ('saved', 'applying', 'submitted', 'won', 'rejected')),
  notes text,
  deadline date,
  saved_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists application_tracker_user_idx on application_tracker(user_id);
create index if not exists application_tracker_status_idx on application_tracker(status);

alter table application_tracker enable row level security;

create policy "Users manage their own tracked applications"
  on application_tracker for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger application_tracker_updated_at
  before update on application_tracker
  for each row execute function update_updated_at();

-- Watchlist alerts
create table if not exists watchlist_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete cascade,
  label text not null,
  countries text[] default '{}',
  sectors text[] default '{}',
  funding_types text[] default '{}',
  alert_enabled boolean default true,
  created_at timestamptz default now()
);

alter table watchlist_alerts enable row level security;

create policy "Users manage their own watchlist"
  on watchlist_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Document vault (metadata — files stored in Supabase Storage bucket 'documents')
create table if not exists document_vault (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete cascade,
  document_type text not null check (document_type in (
    'ID', 'Passport', 'Business Registration', 'Tax Certificate',
    'Business Plan', 'Bank Statement', 'Certificate', 'Contract', 'Other'
  )),
  filename text not null,
  storage_path text not null,
  file_size_kb integer,
  uploaded_at timestamptz default now()
);

alter table document_vault enable row level security;

create policy "Users manage their own vault"
  on document_vault for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ########## END 003_tracker_vault.sql ##########

-- ########## BEGIN 004_create_projects.sql ##########
-- Kebu Create Mode foundation: owned website projects with structured sections
-- Vertical slice: blank website → hero section → Postgres persistence + RLS

create extension if not exists "pgcrypto";

-- =====================
-- PROJECTS
-- =====================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  project_type text not null default 'website'
    check (project_type in ('website', 'store', 'portfolio', 'landing')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Owners select own projects" on public.projects;
create policy "Owners select own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners insert own projects" on public.projects;
create policy "Owners insert own projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners update own projects" on public.projects;
create policy "Owners update own projects"
  on public.projects for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners delete own projects" on public.projects;
create policy "Owners delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- =====================
-- PROJECT PAGES
-- =====================
create table if not exists public.project_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slug text not null default 'home' check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null default 'Home' check (char_length(trim(title)) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists project_pages_project_id_idx on public.project_pages (project_id);

alter table public.project_pages enable row level security;

drop policy if exists "Owners select own project pages" on public.project_pages;
create policy "Owners select own project pages"
  on public.project_pages for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert own project pages" on public.project_pages;
create policy "Owners insert own project pages"
  on public.project_pages for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update own project pages" on public.project_pages;
create policy "Owners update own project pages"
  on public.project_pages for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete own project pages" on public.project_pages;
create policy "Owners delete own project pages"
  on public.project_pages for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_pages.project_id and p.owner_id = auth.uid()
    )
  );

-- =====================
-- PROJECT SECTIONS (structured blocks)
-- =====================
create table if not exists public.project_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.project_pages(id) on delete cascade,
  section_type text not null default 'hero'
    check (section_type in (
      'hero', 'heading', 'paragraph', 'image', 'button',
      'features', 'footer', 'navigation', 'whatsapp'
    )),
  sort_order integer not null default 0,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_sections_page_id_idx on public.project_sections (page_id);
create index if not exists project_sections_page_sort_idx on public.project_sections (page_id, sort_order);

alter table public.project_sections enable row level security;

drop policy if exists "Owners select own project sections" on public.project_sections;
create policy "Owners select own project sections"
  on public.project_sections for select
  using (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert own project sections" on public.project_sections;
create policy "Owners insert own project sections"
  on public.project_sections for insert
  with check (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update own project sections" on public.project_sections;
create policy "Owners update own project sections"
  on public.project_sections for update
  using (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete own project sections" on public.project_sections;
create policy "Owners delete own project sections"
  on public.project_sections for delete
  using (
    exists (
      select 1
      from public.project_pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = project_sections.page_id and p.owner_id = auth.uid()
    )
  );

-- updated_at triggers (reuse function from 001 if present)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists project_pages_set_updated_at on public.project_pages;
create trigger project_pages_set_updated_at
  before update on public.project_pages
  for each row execute function public.set_updated_at();

drop trigger if exists project_sections_set_updated_at on public.project_sections;
create trigger project_sections_set_updated_at
  before update on public.project_sections
  for each row execute function public.set_updated_at();

-- ########## END 004_create_projects.sql ##########

-- ########## BEGIN 005_kebu_id_draft_business.sql ##########
-- Kebu ID Slice 1: draft business identity (separate from personal eligibility)
-- Does NOT implement government registration, verification levels beyond draft, stores, or payments.
--
-- Order: tables first, then RLS policies (policies reference business_members — table must exist).

create extension if not exists "pgcrypto";

-- =====================
-- BUSINESSES
-- =====================
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  public_kebu_id text not null unique
    check (public_kebu_id ~ '^KEBU-[A-Z]{2}-[0-9]{2}-[A-Z0-9]{6}$'),
  legal_name text not null check (char_length(trim(legal_name)) between 1 and 160),
  trading_name text check (trading_name is null or char_length(trim(trading_name)) between 1 and 160),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  category text not null check (char_length(trim(category)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 1000),
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'active', 'suspended', 'archived')),
  verification_level integer not null default 1
    check (verification_level between 1 and 4),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists businesses_created_by_idx on public.businesses (created_by);
create index if not exists businesses_country_idx on public.businesses (country_code);
create unique index if not exists businesses_public_kebu_id_uidx on public.businesses (public_kebu_id);

-- =====================
-- BUSINESS MEMBERS (must exist before businesses RLS policies reference it)
-- =====================
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in (
      'founder', 'cofounder', 'beneficial_owner', 'director', 'administrator',
      'finance_manager', 'store_manager', 'developer', 'designer', 'employee',
      'accountant', 'legal_representative', 'viewer'
    )),
  status text not null default 'active'
    check (status in ('pending', 'active', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists business_members_user_idx on public.business_members (user_id);
create index if not exists business_members_business_idx on public.business_members (business_id);

-- =====================
-- AUDIT LOGS
-- =====================
create table if not exists public.business_audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 80),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_audit_logs_business_idx
  on public.business_audit_logs (business_id, created_at desc);

-- =====================
-- IDEMPOTENCY (create draft business)
-- =====================
create table if not exists public.business_create_idempotency (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null check (char_length(trim(idempotency_key)) between 8 and 128),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists business_create_idempotency_user_idx
  on public.business_create_idempotency (user_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists business_members_set_updated_at on public.business_members;
create trigger business_members_set_updated_at
  before update on public.business_members
  for each row execute function public.set_updated_at();

-- =====================
-- RLS (after all tables exist)
-- =====================
alter table public.businesses enable row level security;

drop policy if exists "Members select businesses" on public.businesses;
create policy "Members select businesses"
  on public.businesses for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Users insert draft businesses" on public.businesses;
create policy "Users insert draft businesses"
  on public.businesses for insert
  with check (auth.uid() = created_by and verification_level = 1 and lifecycle_status = 'draft');

drop policy if exists "Founders update own draft businesses" on public.businesses;
create policy "Founders update own draft businesses"
  on public.businesses for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

alter table public.business_members enable row level security;

drop policy if exists "Users select own memberships" on public.business_members;
create policy "Users select own memberships"
  on public.business_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.business_members m2
    where m2.business_id = business_members.business_id
      and m2.user_id = auth.uid()
      and m2.status = 'active'
      and m2.role in ('founder', 'administrator')
  ));

drop policy if exists "Users insert self as founder on create" on public.business_members;
create policy "Users insert self as founder on create"
  on public.business_members for insert
  with check (
    user_id = auth.uid()
    and role = 'founder'
    and status = 'active'
    and exists (
      select 1 from public.businesses b
      where b.id = business_members.business_id and b.created_by = auth.uid()
    )
  );

alter table public.business_audit_logs enable row level security;

drop policy if exists "Members select audit logs" on public.business_audit_logs;
create policy "Members select audit logs"
  on public.business_audit_logs for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_audit_logs.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Actors insert audit logs" on public.business_audit_logs;
create policy "Actors insert audit logs"
  on public.business_audit_logs for insert
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = business_audit_logs.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

alter table public.business_create_idempotency enable row level security;

drop policy if exists "Users manage own idempotency rows" on public.business_create_idempotency;
create policy "Users manage own idempotency rows"
  on public.business_create_idempotency for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ########## END 005_kebu_id_draft_business.sql ##########

-- ########## BEGIN 006_kebu_id_lock_draft_status.sql ##########
-- Kebu ID Slice 1 hardening: clients must not raise verification_level or leave draft via RLS.
-- Also allow creator cleanup of failed draft creates (CASCADE removes members/audit/idempotency).

drop policy if exists "Founders update own draft businesses" on public.businesses;
create policy "Founders update own draft businesses"
  on public.businesses for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  )
  with check (
    verification_level = 1
    and lifecycle_status = 'draft'
    and exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Creators delete own draft businesses" on public.businesses;
create policy "Creators delete own draft businesses"
  on public.businesses for delete
  using (
    created_by = auth.uid()
    and lifecycle_status = 'draft'
    and verification_level = 1
  );

-- ########## END 006_kebu_id_lock_draft_status.sql ##########

-- ########## BEGIN 007_business_registration.sql ##########
-- Kebu Business Registration Slice 1
-- Extends businesses for registration wizard fields, status history, progress timeline,
-- owners, readiness scores. Government submission is NOT live — connector interface only.

-- =====================
-- EXTEND BUSINESSES
-- =====================
alter table public.businesses
  add column if not exists region text
    check (region is null or char_length(trim(region)) between 1 and 120);

alter table public.businesses
  add column if not exists business_email text
    check (business_email is null or char_length(trim(business_email)) between 3 and 254);

alter table public.businesses
  add column if not exists business_phone text
    check (business_phone is null or char_length(trim(business_phone)) between 5 and 40);

alter table public.businesses
  add column if not exists website text
    check (website is null or char_length(trim(website)) between 3 and 300);

alter table public.businesses
  add column if not exists legal_structure text
    check (legal_structure is null or char_length(trim(legal_structure)) between 1 and 80);

alter table public.businesses
  add column if not exists registration_status text;

update public.businesses
set registration_status = 'draft'
where registration_status is null;

alter table public.businesses
  alter column registration_status set default 'draft';

alter table public.businesses
  alter column registration_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_registration_status_check'
  ) then
    alter table public.businesses
      add constraint businesses_registration_status_check
      check (registration_status in (
        'draft',
        'preparing',
        'ready_to_submit',
        'submitted',
        'government_review',
        'additional_info_requested',
        'approved',
        'rejected',
        'archived'
      ));
  end if;
end $$;

-- =====================
-- KEBU IDS (public identity ledger)
-- =====================
create table if not exists public.kebu_ids (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  public_kebu_id text not null unique
    check (public_kebu_id ~ '^KEBU-[A-Z]{2}-[0-9]{2}-[A-Z0-9]{6}$'),
  issued_at timestamptz not null default now()
);

create index if not exists kebu_ids_public_idx on public.kebu_ids (public_kebu_id);

alter table public.kebu_ids enable row level security;

drop policy if exists "Members select kebu_ids" on public.kebu_ids;
create policy "Members select kebu_ids"
  on public.kebu_ids for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = kebu_ids.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
    or exists (
      select 1 from public.businesses b
      where b.id = kebu_ids.business_id and b.created_by = auth.uid()
    )
  );

drop policy if exists "Creators insert kebu_ids" on public.kebu_ids;
create policy "Creators insert kebu_ids"
  on public.kebu_ids for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = kebu_ids.business_id and b.created_by = auth.uid()
    )
  );

-- =====================
-- BUSINESS OWNERS
-- =====================
create table if not exists public.business_owners (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 160),
  email text not null check (char_length(trim(email)) between 3 and 254),
  ownership_percent numeric(5,2) not null
    check (ownership_percent > 0 and ownership_percent <= 100),
  is_primary_founder boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_owners_business_idx on public.business_owners (business_id);

alter table public.business_owners enable row level security;

drop policy if exists "Members select business_owners" on public.business_owners;
create policy "Members select business_owners"
  on public.business_owners for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_owners.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Founders insert business_owners" on public.business_owners;
create policy "Founders insert business_owners"
  on public.business_owners for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_owners.business_id and b.created_by = auth.uid()
    )
    or exists (
      select 1 from public.business_members m
      where m.business_id = business_owners.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Founders update business_owners" on public.business_owners;
create policy "Founders update business_owners"
  on public.business_owners for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_owners.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_owners.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

-- =====================
-- STATUS HISTORY (append-only)
-- =====================
create table if not exists public.business_status_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists business_status_history_biz_idx
  on public.business_status_history (business_id, created_at desc);

alter table public.business_status_history enable row level security;

drop policy if exists "Members select status history" on public.business_status_history;
create policy "Members select status history"
  on public.business_status_history for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_status_history.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Actors insert status history" on public.business_status_history;
create policy "Actors insert status history"
  on public.business_status_history for insert
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = business_status_history.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

-- No UPDATE/DELETE policies → history cannot be overwritten via client

-- =====================
-- REGISTRATION PROGRESS
-- =====================
create table if not exists public.registration_progress (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  step_key text not null check (char_length(trim(step_key)) between 1 and 80),
  label text not null check (char_length(trim(label)) between 1 and 160),
  sort_order integer not null check (sort_order >= 0),
  is_complete boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, step_key)
);

create index if not exists registration_progress_biz_idx
  on public.registration_progress (business_id, sort_order);

alter table public.registration_progress enable row level security;

drop policy if exists "Members select registration_progress" on public.registration_progress;
create policy "Members select registration_progress"
  on public.registration_progress for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = registration_progress.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Founders insert registration_progress" on public.registration_progress;
create policy "Founders insert registration_progress"
  on public.registration_progress for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = registration_progress.business_id and b.created_by = auth.uid()
    )
    or exists (
      select 1 from public.business_members m
      where m.business_id = registration_progress.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Founders update registration_progress" on public.registration_progress;
create policy "Founders update registration_progress"
  on public.registration_progress for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = registration_progress.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = registration_progress.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

-- =====================
-- BUSINESS READINESS SCORES (KA Score v0 — profile readiness only)
-- =====================
create table if not exists public.business_readiness_scores (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  score_value integer not null check (score_value between 0 and 100),
  score_band text not null
    check (score_band in ('building', 'developing', 'established', 'strong', 'opportunity_ready')),
  confidence_level text not null
    check (confidence_level in ('low', 'moderate', 'high')),
  model_version text not null,
  explanation jsonb not null default '{}'::jsonb,
  missing_items jsonb not null default '[]'::jsonb,
  helping_factors jsonb not null default '[]'::jsonb,
  limiting_factors jsonb not null default '[]'::jsonb,
  previous_score_id uuid references public.business_readiness_scores(id) on delete set null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists business_readiness_scores_biz_idx
  on public.business_readiness_scores (business_id, calculated_at desc);

alter table public.business_readiness_scores enable row level security;

drop policy if exists "Members select readiness scores" on public.business_readiness_scores;
create policy "Members select readiness scores"
  on public.business_readiness_scores for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_readiness_scores.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

-- Inserts only via authenticated founder/admin (API computes value — never trust client score body)
drop policy if exists "Founders insert readiness scores" on public.business_readiness_scores;
create policy "Founders insert readiness scores"
  on public.business_readiness_scores for insert
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_readiness_scores.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

-- No UPDATE policy → historical scores immutable

drop trigger if exists business_owners_set_updated_at on public.business_owners;
create trigger business_owners_set_updated_at
  before update on public.business_owners
  for each row execute function public.set_updated_at();

drop trigger if exists registration_progress_set_updated_at on public.registration_progress;
create trigger registration_progress_set_updated_at
  before update on public.registration_progress
  for each row execute function public.set_updated_at();

-- Founders may update registration profile fields but cannot raise verification_level / leave lifecycle draft
drop policy if exists "Founders update own draft businesses" on public.businesses;
create policy "Founders update own draft businesses"
  on public.businesses for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  )
  with check (
    verification_level = 1
    and lifecycle_status = 'draft'
    and registration_status in ('draft', 'preparing', 'ready_to_submit')
    and exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

-- ########## END 007_business_registration.sql ##########

-- ########## BEGIN 008_website_builder.sql ##########
-- Kebu AI Website Builder vertical slice
-- Extends projects for business linkage, themes, subdomains; templates; versions; deployments.
-- Public sites are served from deployments.snapshot only (draft data stays private).

-- Expand section types
alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'features',
    'testimonials', 'faq', 'contact', 'whatsapp', 'footer',
    'heading', 'paragraph', 'button'
  ));

-- Project hosting / brief fields
alter table public.projects add column if not exists business_id uuid references public.businesses(id) on delete set null;
alter table public.projects add column if not exists subdomain text
  check (subdomain is null or subdomain ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
alter table public.projects add column if not exists locale text default 'en';
alter table public.projects add column if not exists country_code text;
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists visual_direction text;
alter table public.projects add column if not exists theme jsonb not null default '{}'::jsonb;
alter table public.projects add column if not exists source text
  check (source is null or source in ('blank', 'template', 'ai'));
alter table public.projects add column if not exists template_id uuid;
alter table public.projects add column if not exists published_at timestamptz;

create unique index if not exists projects_subdomain_uidx
  on public.projects (subdomain)
  where subdomain is not null;

create index if not exists projects_business_id_idx on public.projects (business_id);

-- =====================
-- SITE TEMPLATES (structured, not screenshots)
-- =====================
create table if not exists public.site_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null check (char_length(trim(category)) between 1 and 80),
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_templates(id) on delete cascade,
  version integer not null check (version >= 1),
  schema_version text not null default 'website-v1',
  definition jsonb not null,
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

alter table public.site_templates enable row level security;
alter table public.site_template_versions enable row level security;

drop policy if exists "Authenticated read active templates" on public.site_templates;
create policy "Authenticated read active templates"
  on public.site_templates for select
  using (auth.role() = 'authenticated' and is_active = true);

drop policy if exists "Authenticated read template versions" on public.site_template_versions;
create policy "Authenticated read template versions"
  on public.site_template_versions for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.site_templates t
      where t.id = site_template_versions.template_id and t.is_active = true
    )
  );

-- =====================
-- WEBSITE VERSIONS (history)
-- =====================
create table if not exists public.website_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  label text,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create index if not exists website_versions_project_idx
  on public.website_versions (project_id, version_number desc);

alter table public.website_versions enable row level security;

drop policy if exists "Owners manage website versions" on public.website_versions;
create policy "Owners select website versions"
  on public.website_versions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = website_versions.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert website versions" on public.website_versions;
create policy "Owners insert website versions"
  on public.website_versions for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = website_versions.project_id and p.owner_id = auth.uid()
    )
  );

-- =====================
-- DEPLOYMENTS (published snapshots — public read by subdomain)
-- =====================
create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subdomain text not null check (subdomain ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  snapshot jsonb not null,
  status text not null default 'live'
    check (status in ('live', 'superseded', 'failed')),
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  public_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists deployments_project_idx on public.deployments (project_id, published_at desc);
create unique index if not exists deployments_live_subdomain_uidx
  on public.deployments (subdomain)
  where status = 'live';

alter table public.deployments enable row level security;

-- Owners can manage their deployments
drop policy if exists "Owners select deployments" on public.deployments;
create policy "Owners select deployments"
  on public.deployments for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = deployments.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert deployments" on public.deployments;
create policy "Owners insert deployments"
  on public.deployments for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = deployments.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update deployments" on public.deployments;
create policy "Owners update deployments"
  on public.deployments for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = deployments.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = deployments.project_id and p.owner_id = auth.uid()
    )
  );

-- Anon/authenticated may read LIVE deployments only (published public sites)
drop policy if exists "Public read live deployments" on public.deployments;
create policy "Public read live deployments"
  on public.deployments for select
  using (status = 'live');

-- Domains (custom domain reserved for later; structure present)
create table if not exists public.site_domains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  hostname text not null unique,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.site_domains enable row level security;

drop policy if exists "Owners manage domains" on public.site_domains;
create policy "Owners select domains"
  on public.site_domains for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = site_domains.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert domains" on public.site_domains;
create policy "Owners insert domains"
  on public.site_domains for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = site_domains.project_id and p.owner_id = auth.uid()
    )
  );

-- Minimal assets metadata (uploads validated server-side in later polish; URL refs allowed now)
create table if not exists public.website_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'file')),
  url text not null,
  alt text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.website_assets enable row level security;

drop policy if exists "Owners select assets" on public.website_assets;
create policy "Owners select assets"
  on public.website_assets for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = website_assets.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners insert assets" on public.website_assets;
create policy "Owners insert assets"
  on public.website_assets for insert
  with check (
    exists (
      select 1 from public.projects p
      where p.id = website_assets.project_id and p.owner_id = auth.uid()
    )
  );

-- ########## END 008_website_builder.sql ##########

-- ########## BEGIN 009_opportunity_country_explorer.sql ##########
-- Opportunity OS Slice 1: Country Explorer
-- Extends existing country_profiles; adds AI analysis table (never mixed into verified fields).

alter table public.country_profiles
  add column if not exists overview text;

alter table public.country_profiles
  add column if not exists economy_overview text;

alter table public.country_profiles
  add column if not exists major_exports text[] default '{}';

alter table public.country_profiles
  add column if not exists major_imports text[] default '{}';

alter table public.country_profiles
  add column if not exists agricultural_products text[] default '{}';

alter table public.country_profiles
  add column if not exists manufacturing_sectors text[] default '{}';

alter table public.country_profiles
  add column if not exists technology_ecosystem text;

alter table public.country_profiles
  add column if not exists infrastructure text;

alter table public.country_profiles
  add column if not exists logistics text;

alter table public.country_profiles
  add column if not exists trade_agreements text[] default '{}';

alter table public.country_profiles
  add column if not exists public_entrepreneurship_programs text[] default '{}';

alter table public.country_profiles
  add column if not exists startup_ecosystem text;

alter table public.country_profiles
  add column if not exists universities text[] default '{}';

alter table public.country_profiles
  add column if not exists industrial_zones text[] default '{}';

alter table public.country_profiles
  add column if not exists business_registration_guidance text;

alter table public.country_profiles
  add column if not exists publish_status text;

update public.country_profiles
set publish_status = 'published'
where publish_status is null;

alter table public.country_profiles
  alter column publish_status set default 'draft';

alter table public.country_profiles
  alter column publish_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'country_profiles_publish_status_check'
  ) then
    alter table public.country_profiles
      add constraint country_profiles_publish_status_check
      check (publish_status in ('draft', 'published', 'archived'));
  end if;
end $$;

alter table public.country_profiles
  add column if not exists data_confidence text default 'moderate'
    check (data_confidence in ('low', 'moderate', 'high'));

alter table public.country_profiles
  add column if not exists sources jsonb not null default '[]'::jsonb;

alter table public.country_profiles
  add column if not exists last_verified_at timestamptz;

-- Public read published only (replace open read if present)
drop policy if exists "Anyone can read country profiles" on public.country_profiles;
create policy "Anyone can read published country profiles"
  on public.country_profiles for select
  using (publish_status = 'published');

-- Service/admin writes use service role; authenticated insert for seed tooling when allowed
drop policy if exists "Service inserts country profiles" on public.country_profiles;
-- No broad insert for anon. Seed uses service role or SQL below.

-- =====================
-- AI ANALYSES (separate from verified profile)
-- =====================
create table if not exists public.country_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.country_profiles(country_code) on delete cascade,
  label text not null default 'ai_generated'
    check (label in ('ai_generated', 'estimated', 'requires_validation')),
  prompt_summary text,
  analysis_markdown text not null,
  model_version text,
  confidence text not null default 'low'
    check (confidence in ('low', 'moderate', 'high')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists country_ai_analyses_country_idx
  on public.country_ai_analyses (country_code, created_at desc);

alter table public.country_ai_analyses enable row level security;

drop policy if exists "Anyone read country AI analyses" on public.country_ai_analyses;
create policy "Anyone read country AI analyses"
  on public.country_ai_analyses for select
  using (
    exists (
      select 1 from public.country_profiles cp
      where cp.country_code = country_ai_analyses.country_code
        and cp.publish_status = 'published'
    )
  );

drop policy if exists "Authenticated insert own country AI analyses" on public.country_ai_analyses;
create policy "Authenticated insert own country AI analyses"
  on public.country_ai_analyses for insert
  with check (auth.uid() = created_by);

-- =====================
-- SEED: Senegal (verified-style public overview — not AI)
-- =====================
insert into public.country_profiles (
  country, country_code, capital, population, gdp, languages, industries,
  cultural_notes, historical_notes, historical_empires, ethnic_groups,
  procurement_links, youth_programs, women_programs, sme_agencies,
  startup_notes, diaspora_notes, business_etiquette,
  overview, economy_overview, major_exports, major_imports,
  agricultural_products, manufacturing_sectors, technology_ecosystem,
  infrastructure, logistics, trade_agreements, public_entrepreneurship_programs,
  startup_ecosystem, universities, industrial_zones, business_registration_guidance,
  publish_status, data_confidence, sources, last_verified_at
) values (
  'Senegal', 'SN', 'Dakar', 17000000, '$27 billion',
  array['French','Wolof','Pulaar','Serer','Diola','Mandinka'],
  array['Fishing','Agriculture','Tourism','Mining','Telecommunications','Creative economy'],
  'Senegal is known for Teranga (hospitality) and a strong culture of trade and entrepreneurship.',
  'Historically linked to Wolof, Jolof, and Mali spheres; Dakar was a major colonial administrative center.',
  array['Wolof Empire','Jolof Empire','Mali Empire'],
  array['Wolof','Fula','Serer','Jola','Mandinka','Soninke'],
  '[{"name":"ARMP","url":"https://www.armp.sn"},{"name":"Marchés Publics","url":"https://marchespublics.sn"}]'::jsonb,
  array['Programme 100 000 Entrepreneurs','DER/FJ','FONSIS Youth Investment Program'],
  array['DER/FJ Women''s Entrepreneurship Fund','ADPME Women SME Support'],
  array['ADPME','APIX','DER/FJ','FONSIS'],
  'Dakar tech hubs include CTIC Dakar; FORCE-N and related initiatives support startups.',
  'Significant diaspora communities in France, Italy, Spain, and the US; remittances and diaspora investment matter.',
  array['Invest in greetings and relationships','Business is relationship-based','Friday is often a shorter day'],
  'Senegal is a West African coastal country centered on Dakar, with agriculture, fisheries, services, and growing tech and creative sectors.',
  'Services and trade dominate urban activity; agriculture and fisheries remain critical for employment; phosphates and related mining contribute to exports.',
  array['Gold','Phosphates','Petroleum products','Fish','Groundnuts','Cashews'],
  array['Petroleum products','Machinery','Food products','Vehicles','Pharmaceuticals'],
  array['Rice','Groundnuts','Millet','Sorghum','Cashews','Horticulture','Fish'],
  array['Food processing','Construction materials','Textiles','Light manufacturing'],
  'Growing digital ecosystem in Dakar with incubators, fintech experiments, and creative/tech startups.',
  'Port of Dakar, road corridors to inland neighbors, expanding energy and urban infrastructure projects.',
  'Maritime trade via Dakar port; regional trucking; air links through Blaise Diagne International Airport.',
  array['ECOWAS','AfCFTA participation','WAEMU'],
  array['DER/FJ','ADPME','APIX','Programme 100 000 Entrepreneurs'],
  'CTIC Dakar and related hubs; government and donor programs supporting entrepreneurship.',
  array['Université Cheikh Anta Diop (UCAD)','École Polytechnique de Thiès','Other public and private institutions'],
  array['Diamniadio industrial / urban projects','Port-linked industrial zones'],
  'Company creation commonly involves APIX and formal registration steps; confirm current procedures with official sources before filing.',
  'published', 'moderate',
  '[{"title":"Kebu curated public overview","type":"curated","note":"Seeded for Country Explorer Slice 1; replace with cited official sources over time"}]'::jsonb,
  now()
)
on conflict (country_code) do update set
  overview = excluded.overview,
  economy_overview = excluded.economy_overview,
  major_exports = excluded.major_exports,
  major_imports = excluded.major_imports,
  agricultural_products = excluded.agricultural_products,
  manufacturing_sectors = excluded.manufacturing_sectors,
  technology_ecosystem = excluded.technology_ecosystem,
  infrastructure = excluded.infrastructure,
  logistics = excluded.logistics,
  trade_agreements = excluded.trade_agreements,
  public_entrepreneurship_programs = excluded.public_entrepreneurship_programs,
  startup_ecosystem = excluded.startup_ecosystem,
  universities = excluded.universities,
  industrial_zones = excluded.industrial_zones,
  business_registration_guidance = excluded.business_registration_guidance,
  publish_status = 'published',
  updated_at = now();

-- ########## END 009_opportunity_country_explorer.sql ##########

-- ########## BEGIN 010_site_billing_joko.sql ##########
-- Kebu site hosting + template purchases via JOKO mobile money

alter table public.site_templates
  add column if not exists price_usd_cents integer not null default 0 check (price_usd_cents >= 0);

alter table public.site_templates
  add column if not exists requires_purchase boolean not null default false;

create table if not exists public.site_subscriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  amount_usd_cents integer not null default 400 check (amount_usd_cents > 0),
  currency text not null default 'USD',
  period_start timestamptz,
  period_end timestamptz,
  joko_reference text,
  joko_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_subscriptions_project_status_idx
  on public.site_subscriptions (project_id, status, period_end desc);

create index if not exists site_subscriptions_owner_idx
  on public.site_subscriptions (owner_id, created_at desc);

create table if not exists public.template_purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  template_slug text not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded')),
  amount_usd_cents integer not null default 0 check (amount_usd_cents >= 0),
  joko_reference text,
  joko_payment_id text,
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, template_slug, joko_reference)
);

create index if not exists template_purchases_owner_slug_idx
  on public.template_purchases (owner_id, template_slug, status);

alter table public.site_subscriptions enable row level security;
alter table public.template_purchases enable row level security;

drop policy if exists "Owners select site subscriptions" on public.site_subscriptions;
create policy "Owners select site subscriptions"
  on public.site_subscriptions for select
  using (owner_id = auth.uid());

drop policy if exists "Owners insert pending site subscriptions" on public.site_subscriptions;
create policy "Owners insert pending site subscriptions"
  on public.site_subscriptions for insert
  with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists "Owners select template purchases" on public.template_purchases;
create policy "Owners select template purchases"
  on public.template_purchases for select
  using (owner_id = auth.uid());

drop policy if exists "Owners insert pending template purchases" on public.template_purchases;
create policy "Owners insert pending template purchases"
  on public.template_purchases for insert
  with check (owner_id = auth.uid() and status = 'pending');

-- ########## END 010_site_billing_joko.sql ##########

-- ########## BEGIN 011_maylecor_section_types.sql ##########
-- May Lecor / K-Direction artist layout section types

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'features',
    'testimonials', 'faq', 'contact', 'whatsapp', 'footer',
    'heading', 'paragraph', 'button',
    'maylecor-home', 'maylecor-music'
  ));

create table if not exists public.builder_schema_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '11')
on conflict (key) do update set value = excluded.value, updated_at = now();

alter table public.builder_schema_meta enable row level security;

drop policy if exists "Authenticated read builder schema meta" on public.builder_schema_meta;
create policy "Authenticated read builder schema meta"
  on public.builder_schema_meta for select
  using (auth.role() = 'authenticated');

-- ########## END 011_maylecor_section_types.sql ##########

-- ########## BEGIN 012_legally_blonde_section_type.sql ##########
-- Legally Blonde animated showcase section type

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (section_type in (
    'navigation', 'hero', 'text', 'image', 'gallery', 'features',
    'testimonials', 'faq', 'contact', 'whatsapp', 'footer',
    'heading', 'paragraph', 'button',
    'maylecor-home', 'maylecor-music', 'legally-blonde-hero'
  ));

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '12')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ########## END 012_legally_blonde_section_type.sql ##########

-- ########## BEGIN 013_site_seo_settings.sql ##########
-- Site SEO settings (favicon, meta tags) stored on project + published snapshot

alter table public.projects add column if not exists seo jsonb not null default '{}'::jsonb;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '13')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ########## END 013_site_seo_settings.sql ##########

-- ########## BEGIN 014_builder_extensions.sql ##########
-- Builder extensions: site health monitoring, developer template marketplace (foundation)

-- ── Published site health (daily cron) ───────────────────────────────────────
create table if not exists public.site_health_checks (
  subdomain text primary key,
  ok boolean not null default false,
  http_status integer,
  error_message text,
  checked_at timestamptz not null default now()
);

alter table public.site_health_checks enable row level security;

create policy "Owners read health via deployment"
  on public.site_health_checks for select
  using (
    exists (
      select 1 from public.deployments d
      join public.projects p on p.id = d.project_id
      where d.subdomain = site_health_checks.subdomain
        and p.owner_id = auth.uid()
    )
  );

-- Service role / cron writes only (no insert policy for authenticated users)

-- ── Developer template marketplace (approval required before sell) ─────────
create table if not exists public.developer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  website_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.marketplace_templates (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.developer_profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  category text,
  price_cents integer not null default 0 check (price_cents >= 0),
  definition jsonb not null,
  preview_url text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  sales_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.developer_profiles enable row level security;
alter table public.marketplace_templates enable row level security;

create policy "Developers read own profile"
  on public.developer_profiles for select
  using (auth.uid() = user_id);

create policy "Developers insert own profile"
  on public.developer_profiles for insert
  with check (auth.uid() = user_id);

create policy "Developers update own pending profile"
  on public.developer_profiles for update
  using (auth.uid() = user_id);

create policy "Public read published marketplace templates"
  on public.marketplace_templates for select
  using (status = 'published' or exists (
    select 1 from public.developer_profiles dp
    where dp.id = marketplace_templates.developer_id and dp.user_id = auth.uid()
  ));

create policy "Approved developers manage own templates"
  on public.marketplace_templates for all
  using (
    exists (
      select 1 from public.developer_profiles dp
      where dp.id = marketplace_templates.developer_id
        and dp.user_id = auth.uid()
        and dp.status = 'approved'
    )
  );

create index if not exists idx_marketplace_templates_status on public.marketplace_templates(status);
create index if not exists idx_developer_profiles_status on public.developer_profiles(status);

-- ########## END 014_builder_extensions.sql ##########

-- ########## BEGIN 015_custom_domains.sql ##########
-- Custom domains: connect real domains (Namecheap, etc.) to published Kebu sites

alter table public.site_domains
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'verified', 'failed')),
  add column if not exists is_primary boolean not null default false,
  add column if not exists dns_target text,
  add column if not exists provider text not null default 'manual'
    check (provider in ('manual', 'namecheap', 'kebu')),
  add column if not exists verified_at timestamptz,
  add column if not exists last_check_at timestamptz,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

-- Keep legacy verified flag in sync
update public.site_domains set status = 'verified', verified = true where verified = true and status = 'pending';

create index if not exists idx_site_domains_hostname_verified
  on public.site_domains (hostname)
  where status = 'verified';

create index if not exists idx_site_domains_project
  on public.site_domains (project_id);

drop policy if exists "Owners update domains" on public.site_domains;
create policy "Owners update domains"
  on public.site_domains for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = site_domains.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete domains" on public.site_domains;
create policy "Owners delete domains"
  on public.site_domains for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = site_domains.project_id and p.owner_id = auth.uid()
    )
  );

-- Service role reads verified hostnames for middleware routing (no anon access)

-- ########## END 015_custom_domains.sql ##########

-- ########## BEGIN 016_registration_timeline.sql ##########
-- Align registration progress timeline with canonical Business Registration tracker

update public.registration_progress set label = 'Application Started', sort_order = 10
  where step_key = 'business_created';

update public.registration_progress set label = 'Documents Uploaded', sort_order = 20
  where step_key = 'documents_uploaded';

update public.registration_progress set label = 'Identity Verified', sort_order = 30
  where step_key = 'business_information_complete';

update public.registration_progress set label = 'Government Review', sort_order = 40
  where step_key = 'government_review';

update public.registration_progress set label = 'Registration Approved', sort_order = 60
  where step_key = 'approved';

update public.registration_progress set label = 'Registration Certificate Ready', sort_order = 70
  where step_key = 'registration_certificate';

update public.registration_progress set label = 'Business Active', sort_order = 90
  where step_key = 'active_business';

delete from public.registration_progress
  where step_key in ('ready_to_submit', 'submitted');

insert into public.registration_progress (business_id, step_key, label, sort_order, is_complete)
select b.id, 'payment_confirmed', 'Payment Confirmed', 50, false
from public.businesses b
where not exists (
  select 1 from public.registration_progress rp
  where rp.business_id = b.id and rp.step_key = 'payment_confirmed'
);

insert into public.registration_progress (business_id, step_key, label, sort_order, is_complete)
select b.id, 'tax_registration', 'Tax Registration', 80, false
from public.businesses b
where not exists (
  select 1 from public.registration_progress rp
  where rp.business_id = b.id and rp.step_key = 'tax_registration'
);

-- ########## END 016_registration_timeline.sql ##########

-- ########## BEGIN 017_business_documents.sql ##########
-- Business registration documents — Supabase Storage + metadata (Slice: document upload)

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  document_type text not null check (document_type in (
    'founder_id',
    'business_plan',
    'address_proof',
    'registration_form',
    'other'
  )),
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  storage_path text not null unique,
  mime_type text not null check (char_length(trim(mime_type)) between 3 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists business_documents_biz_idx on public.business_documents (business_id, document_type);
create index if not exists business_documents_path_idx on public.business_documents (storage_path);

alter table public.business_documents enable row level security;

drop policy if exists "Members select business_documents" on public.business_documents;
create policy "Members select business_documents"
  on public.business_documents for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_documents.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Founders insert business_documents" on public.business_documents;
create policy "Founders insert business_documents"
  on public.business_documents for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = business_documents.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Founders delete business_documents" on public.business_documents;
create policy "Founders delete business_documents"
  on public.business_documents for delete
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_documents.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

-- Private bucket for business registration files (10 MB max enforced in app + column)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-documents',
  'business-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business doc members read" on storage.objects;
create policy "Business doc members read"
  on storage.objects for select
  using (
    bucket_id = 'business-documents'
    and auth.uid() is not null
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and (storage.foldername(name))[1] = m.business_id::text
    )
  );

drop policy if exists "Business doc founders upload" on storage.objects;
create policy "Business doc founders upload"
  on storage.objects for insert
  with check (
    bucket_id = 'business-documents'
    and auth.uid() is not null
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
        and (storage.foldername(name))[1] = m.business_id::text
    )
  );

drop policy if exists "Business doc founders delete" on storage.objects;
create policy "Business doc founders delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-documents'
    and auth.uid() is not null
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
        and (storage.foldername(name))[1] = m.business_id::text
    )
  );

-- ########## END 017_business_documents.sql ##########

-- ########## BEGIN 018_supabase_api_grants.sql ##########
-- Supabase API roles need schema/table grants; RLS policies alone are not enough.
-- Without these, anon/authenticated clients get "permission denied for table …".

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated, anon;

alter default privileges in schema public
  grant all on tables to postgres, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;

-- ########## END 018_supabase_api_grants.sql ##########

-- ########## BEGIN 019_fix_auth_signup_trigger.sql ##########
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(nullif(excluded.name, ''), public.user_profiles.name),
    updated_at = now();
  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant usage on schema public to supabase_auth_admin;
grant insert, update, select on public.user_profiles to supabase_auth_admin;

-- ########## END 019_fix_auth_signup_trigger.sql ##########
