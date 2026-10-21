-- Port marketplace_templates and aesthetic_library into the canonical
-- fresh-install chain. Same schema-drift pattern already found and fixed
-- once this session for developer_profiles: both tables are real,
-- shipped, and actively used by app/api/aesthetics/* and
-- lib/create/aesthetics-marketplace.ts, but were only ever defined in
-- supabase/migrations_archive/legacy/014_builder_extensions.sql and
-- 040_aesthetics_marketplace.sql — never in this chain. A fresh/local
-- database has no aesthetic_library or marketplace_templates table at all.
--
-- One deliberate fix while porting, not a faithful copy: the archived
-- "Owners update aesthetic library" policy's WITH CHECK only verifies
-- owner_id = auth.uid(), with no restriction on status. That lets a buyer
-- set their own pending row's status to 'owned' directly (e.g. via
-- PostgREST) without ever completing payment — a real bypass of the Joko
-- checkout this marketplace depends on for every priced purchase. Closed
-- below the same way as creative_asset_library's new policy
-- (20261021010000): an owner's own UPDATE can never set status='owned';
-- only service_role (the Joko webhook, which bypasses RLS) can.
--
-- project_themes_source_check (also in 040_aesthetics_marketplace.sql) is
-- NOT ported here: project_themes itself is a further table missing from
-- this canonical chain entirely — a separate, out-of-scope finding,
-- recorded here rather than fixed, same as developer_apps was earlier.

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

alter table public.marketplace_templates enable row level security;

drop policy if exists "Public read published marketplace templates" on public.marketplace_templates;
create policy "Public read published marketplace templates"
  on public.marketplace_templates for select
  using (status = 'published' or exists (
    select 1 from public.developer_profiles dp
    where dp.id = marketplace_templates.developer_id and dp.user_id = auth.uid()
  ));

drop policy if exists "Approved developers manage own templates" on public.marketplace_templates;
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

grant select, insert, update, delete on public.marketplace_templates to authenticated;

-- Public can read approved developer display names for store cards.
drop policy if exists "Public read approved developer profiles" on public.developer_profiles;
create policy "Public read approved developer profiles"
  on public.developer_profiles for select
  using (status = 'approved' or auth.uid() = user_id);

-- Owned / purchased aesthetics (definition snapshotted so a buyer keeps what they bought).
create table if not exists public.aesthetic_library (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null
    check (kind in ('catalog', 'marketplace', 'upload')),
  catalog_slug text,
  marketplace_id uuid references public.marketplace_templates(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 80),
  definition jsonb not null,
  status text not null default 'owned'
    check (status in ('owned', 'pending', 'failed')),
  amount_usd_cents integer not null default 0 check (amount_usd_cents >= 0),
  joko_reference text,
  joko_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aesthetic_library_source_ref check (
    (kind = 'catalog' and catalog_slug is not null)
    or (kind = 'marketplace' and marketplace_id is not null)
    or (kind = 'upload')
  )
);

create index if not exists aesthetic_library_owner_idx
  on public.aesthetic_library (owner_id, updated_at desc);

create unique index if not exists aesthetic_library_owner_catalog_owned_idx
  on public.aesthetic_library (owner_id, catalog_slug)
  where catalog_slug is not null and status = 'owned';

create unique index if not exists aesthetic_library_owner_marketplace_owned_idx
  on public.aesthetic_library (owner_id, marketplace_id)
  where marketplace_id is not null and status = 'owned';

alter table public.aesthetic_library enable row level security;

drop policy if exists "Owners select aesthetic library" on public.aesthetic_library;
create policy "Owners select aesthetic library"
  on public.aesthetic_library for select
  using (owner_id = auth.uid());

drop policy if exists "Owners insert aesthetic library" on public.aesthetic_library;
create policy "Owners insert aesthetic library"
  on public.aesthetic_library for insert
  with check (owner_id = auth.uid());

-- Fixed from the archived original (see header): an owner's UPDATE can never
-- itself set status = 'owned'. Only service_role can.
drop policy if exists "Owners update aesthetic library" on public.aesthetic_library;
create policy "Owners update aesthetic library"
  on public.aesthetic_library for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status <> 'owned');

drop policy if exists "Owners delete aesthetic library" on public.aesthetic_library;
create policy "Owners delete aesthetic library"
  on public.aesthetic_library for delete
  using (owner_id = auth.uid() and status <> 'pending');

grant select, insert, update, delete on public.aesthetic_library to authenticated;
grant update on public.aesthetic_library to service_role;
