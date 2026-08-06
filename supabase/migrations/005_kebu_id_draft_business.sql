-- Kebu ID Slice 1: draft business identity (separate from personal eligibility)
-- Does NOT implement government registration, verification levels beyond draft, stores, or payments.

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

alter table public.businesses enable row level security;

-- Creator or active member can read
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

-- Only authenticated create (founder added in same transaction by API using user session)
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

-- =====================
-- BUSINESS MEMBERS
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

alter table public.business_create_idempotency enable row level security;

drop policy if exists "Users manage own idempotency rows" on public.business_create_idempotency;
create policy "Users manage own idempotency rows"
  on public.business_create_idempotency for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- updated_at
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
