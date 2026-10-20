-- Studio Creative Assets Marketplace (photos, fonts, pattern/texture swatches).
--
-- Fixes a real schema-drift bug found while building this: app/api/aesthetics/*
-- and lib/create/aesthetics-marketplace.ts have depended on public.developer_profiles
-- since that feature shipped, but the table was only ever defined in the archived
-- supabase/migrations_archive/legacy/014_builder_extensions.sql — never added to the
-- canonical fresh-install chain. A fresh/local database has had no developer_profiles
-- table at all. Ported verbatim here (same columns, same RLS shape) so both the
-- existing aesthetics marketplace and this new creative-assets marketplace share one
-- real developer identity, instead of inventing a second one.
--
-- Design precedent followed exactly from the existing aesthetics marketplace
-- (lib/create/aesthetics-marketplace.ts): developer accounts are auto-approved on
-- creation (no manual moderation queue exists anywhere in this codebase for this
-- product area); a developer self-publishes a listing by flipping its own status.
-- This migration does not invent a different, heavier-gated pattern for assets.
--
-- Launch scope (explicit user decision, October 20, 2026): free-only. price_cents
-- exists for forward-compatibility but every route in this slice enforces 0 at the
-- application layer — paid listings are a deliberately separate future slice. When
-- that slice ships, the agreed revenue split is 80% seller / 20% platform; record
-- that split in the payout code when it is built, not retrofitted onto this comment.

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

alter table public.developer_profiles enable row level security;

drop policy if exists "Developers read own profile" on public.developer_profiles;
create policy "Developers read own profile"
  on public.developer_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Public read approved developer profiles" on public.developer_profiles;
create policy "Public read approved developer profiles"
  on public.developer_profiles for select
  using (status = 'approved' or auth.uid() = user_id);

drop policy if exists "Developers insert own profile" on public.developer_profiles;
create policy "Developers insert own profile"
  on public.developer_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Developers update own pending profile" on public.developer_profiles;
create policy "Developers update own pending profile"
  on public.developer_profiles for update
  using (auth.uid() = user_id);

create index if not exists idx_developer_profiles_status on public.developer_profiles(status);

grant select, insert, update on public.developer_profiles to authenticated;

-- Marketplace listings: photos, fonts and pattern/texture swatches a developer
-- publishes for other Kebu users to use in Studio, Library and (optionally) Liguey.
create table if not exists public.marketplace_creative_assets (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.developer_profiles(id) on delete cascade,
  slug text not null unique,
  kind text not null check (kind in ('photo', 'font', 'pattern', 'texture')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  category text,
  tags text[] not null default '{}',
  file_url text not null,
  preview_url text,
  license_note text not null default 'Free to use in your Kebu designs.',
  price_cents integer not null default 0 check (price_cents >= 0),
  acquire_count integer not null default 0 check (acquire_count >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_creative_assets_status_kind
  on public.marketplace_creative_assets(status, kind);
create index if not exists idx_marketplace_creative_assets_developer
  on public.marketplace_creative_assets(developer_id);

drop trigger if exists marketplace_creative_assets_set_updated_at on public.marketplace_creative_assets;
create trigger marketplace_creative_assets_set_updated_at
  before update on public.marketplace_creative_assets
  for each row execute function public.set_updated_at();

alter table public.marketplace_creative_assets enable row level security;

drop policy if exists "Public read published creative assets" on public.marketplace_creative_assets;
create policy "Public read published creative assets"
  on public.marketplace_creative_assets for select
  using (status = 'published' or exists (
    select 1 from public.developer_profiles dp
    where dp.id = marketplace_creative_assets.developer_id and dp.user_id = auth.uid()
  ));

drop policy if exists "Approved developers manage own creative assets" on public.marketplace_creative_assets;
create policy "Approved developers manage own creative assets"
  on public.marketplace_creative_assets for all
  using (
    exists (
      select 1 from public.developer_profiles dp
      where dp.id = marketplace_creative_assets.developer_id
        and dp.user_id = auth.uid()
        and dp.status = 'approved'
    )
  )
  with check (
    exists (
      select 1 from public.developer_profiles dp
      where dp.id = marketplace_creative_assets.developer_id
        and dp.user_id = auth.uid()
        and dp.status = 'approved'
    )
    -- Free-only launch scope: a non-zero price can never be written from this slice's
    -- application code, but the database does not trust that alone.
    and price_cents = 0
  );

grant select, insert, update, delete on public.marketplace_creative_assets to authenticated;

-- A user's acquired (free, owned) creative assets — mirrors aesthetic_library's shape.
create table if not exists public.creative_asset_library (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null references public.marketplace_creative_assets(id) on delete cascade,
  status text not null default 'owned' check (status in ('owned')),
  created_at timestamptz not null default now(),
  unique (owner_id, asset_id)
);

create index if not exists idx_creative_asset_library_owner
  on public.creative_asset_library(owner_id, created_at desc);

alter table public.creative_asset_library enable row level security;

drop policy if exists "Owners select creative asset library" on public.creative_asset_library;
create policy "Owners select creative asset library"
  on public.creative_asset_library for select
  using (owner_id = auth.uid());

drop policy if exists "Owners insert creative asset library" on public.creative_asset_library;
create policy "Owners insert creative asset library"
  on public.creative_asset_library for insert
  with check (owner_id = auth.uid());

drop policy if exists "Owners delete creative asset library" on public.creative_asset_library;
create policy "Owners delete creative asset library"
  on public.creative_asset_library for delete
  using (owner_id = auth.uid());

grant select, insert, delete on public.creative_asset_library to authenticated;
