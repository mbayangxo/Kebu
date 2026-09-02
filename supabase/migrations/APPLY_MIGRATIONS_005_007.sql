-- APPLY migrations 005–007 (Kebu ID + business registration)
-- Paste into Supabase → SQL Editor → Run once.
-- Safe to re-run if tables/policies already partially exist (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Prerequisite: auth.users exists (default on Supabase).

-- ========== 005_kebu_id_draft_business.sql ==========
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

-- ========== 006_kebu_id_lock_draft_status.sql ==========
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

-- ========== 007_business_registration.sql ==========
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

-- ========== quick verify ==========
select tablename from pg_tables where schemaname = 'public' and tablename in ('businesses','business_members','business_registration_progress','business_owners') order by 1;
