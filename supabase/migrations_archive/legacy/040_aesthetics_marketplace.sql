-- Aesthetics marketplace: owned library + developer sell (Shopify-style themes).
-- UI name = Aesthetics. Tables keep marketplace_templates for compatibility.

-- Allow applying marketplace / library aesthetics onto a site as named drafts.
do $$
begin
  if exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'project_themes' and constraint_name like '%source%'
  ) then
    alter table public.project_themes drop constraint if exists project_themes_source_check;
  end if;
exception when undefined_object then
  null;
end $$;

alter table public.project_themes drop constraint if exists project_themes_source_check;
alter table public.project_themes
  add constraint project_themes_source_check
  check (source in ('current', 'catalog', 'upload', 'marketplace', 'library'));

-- Owned / purchased aesthetics (definition snapshotted so buyer keeps what they bought).
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

drop policy if exists "Owners update aesthetic library" on public.aesthetic_library;
create policy "Owners update aesthetic library"
  on public.aesthetic_library for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners delete aesthetic library" on public.aesthetic_library;
create policy "Owners delete aesthetic library"
  on public.aesthetic_library for delete
  using (owner_id = auth.uid() and status <> 'pending');

grant select, insert, update, delete on public.aesthetic_library to authenticated;

-- Public can read approved developer display names for store cards.
drop policy if exists "Public read approved developer profiles" on public.developer_profiles;
create policy "Public read approved developer profiles"
  on public.developer_profiles for select
  using (status = 'approved' or auth.uid() = user_id);

-- Developers may insert marketplace rows while approved (already in 014).
grant select, insert, update, delete on public.marketplace_templates to authenticated;
grant select, insert, update on public.developer_profiles to authenticated;
