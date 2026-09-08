-- =============================================================================
-- Kebu — ONE FILE: all NEW migrations (059 → 065)
-- Paste this entire script into Supabase → SQL Editor → Run once
--
-- Prerequisites (must already exist — run these first if missing):
--   • Phase One foundation: supabase/migrations/APPLY_ALL_PHASE_ONE.sql
--   • Shop: APPLY_SHOP_ORDERS.sql (through 055) — required for 059 gifts + 064 variants
--   • Agency (optional): APPLY_AGENCY_056_058.sql
--
-- Safe-ish to re-run: uses IF NOT EXISTS / DROP IF EXISTS / ON CONFLICT DO NOTHING
-- Order: 059 → 060 → 061 → 062 → 063 → 064 → 065
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 059 — Shop gift / buy-for-someone
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.shop_orders') is null then
    raise exception
      'public.shop_orders is missing. Apply APPLY_SHOP_ORDERS.sql first, then re-run this bundle.';
  end if;
end $$;

alter table public.shop_orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists recipient_email text,
  add column if not exists gift_message text,
  add column if not exists gift_public_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_name_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_name_len
      check (
        recipient_name is null
        or char_length(trim(recipient_name)) between 1 and 80
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_phone_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_phone_len
      check (
        recipient_phone is null
        or char_length(trim(recipient_phone)) between 8 and 24
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_email_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_email_check
      check (
        recipient_email is null
        or recipient_email ~* '^[^@]+@[^@]+\.[^@]+$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_message_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_message_len
      check (
        gift_message is null
        or char_length(gift_message) <= 400
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_requires_recipient'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_requires_recipient
      check (
        is_gift = false
        or (
          recipient_name is not null
          and char_length(trim(recipient_name)) between 1 and 80
          and recipient_phone is not null
          and char_length(trim(recipient_phone)) between 8 and 24
        )
      );
  end if;
end $$;

create unique index if not exists shop_orders_gift_public_id_uidx
  on public.shop_orders (gift_public_id)
  where gift_public_id is not null;

create index if not exists shop_orders_gift_idx
  on public.shop_orders (project_id, is_gift)
  where is_gift = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 060 — Opportunity listings metadata (trust labels)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.opportunities
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.opportunities.metadata is
  'Optional trust fields: verified_at, volatility, attributed_ministry, legal_basis, attributed_official, verification_source_url, flag_reason';

create index if not exists opportunities_metadata_gin on public.opportunities using gin (metadata);

-- ─────────────────────────────────────────────────────────────────────────────
-- 061 — Account workspace context (active business on profile)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.user_profiles
  add column if not exists active_business_id uuid references public.businesses(id) on delete set null;

create index if not exists user_profiles_active_business_idx
  on public.user_profiles (active_business_id)
  where active_business_id is not null;

comment on column public.user_profiles.active_business_id is
  'Active Business Kebu workspace (Kebu ID). Null = Personal Kebu context.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 062 — Account entitlements (african_opportunity_access, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.account_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null check (char_length(trim(entitlement_key)) between 2 and 80),
  status text not null default 'none' check (
    status in ('none', 'pending', 'verified', 'revoked')
  ),
  source text,
  granted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement_key)
);

create index if not exists account_entitlements_key_status_idx
  on public.account_entitlements (entitlement_key, status);

alter table public.account_entitlements enable row level security;

drop policy if exists "Users read own entitlements" on public.account_entitlements;
create policy "Users read own entitlements"
  on public.account_entitlements for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own entitlements" on public.account_entitlements;
create policy "Users upsert own entitlements"
  on public.account_entitlements for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own entitlements" on public.account_entitlements;
create policy "Users update own entitlements"
  on public.account_entitlements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists account_entitlements_set_updated_at on public.account_entitlements;
create trigger account_entitlements_set_updated_at
  before update on public.account_entitlements
  for each row execute function public.set_updated_at();

grant select, insert, update on public.account_entitlements to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 063 — Opportunity Cards
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.opportunity_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(trim(slug)) between 3 and 120),
  title text not null check (char_length(trim(title)) between 3 and 200),
  opportunity_summary text not null check (char_length(trim(opportunity_summary)) between 10 and 2000),
  country_code char(2) not null,
  location_label text,
  problem text not null,
  evidence text not null,
  why_now text,
  customer_segment text,
  current_solutions text,
  import_dependency text,
  local_resources text[] not null default '{}',
  required_capabilities text[] not null default '{}',
  estimated_market text,
  competition text,
  regulatory_notes text,
  potential_african_markets text[] not null default '{}',
  business_models text[] not null default '{}',
  difficulty text check (difficulty in ('low', 'medium', 'high')),
  capital_intensity text check (capital_intensity in ('low', 'medium', 'high')),
  time_to_market text,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'exploratory')),
  trust_label text not null default 'curated',
  sources jsonb not null default '[]'::jsonb,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunity_cards_publish_idx
  on public.opportunity_cards (publish_status, sort_order, country_code);

alter table public.opportunity_cards enable row level security;

drop policy if exists "Anyone reads published opportunity cards" on public.opportunity_cards;
create policy "Anyone reads published opportunity cards"
  on public.opportunity_cards for select
  using (publish_status = 'published');

drop trigger if exists opportunity_cards_set_updated_at on public.opportunity_cards;
create trigger opportunity_cards_set_updated_at
  before update on public.opportunity_cards
  for each row execute function public.set_updated_at();

insert into public.opportunity_cards (
  slug,
  title,
  opportunity_summary,
  country_code,
  location_label,
  problem,
  evidence,
  why_now,
  customer_segment,
  current_solutions,
  import_dependency,
  local_resources,
  required_capabilities,
  estimated_market,
  competition,
  regulatory_notes,
  potential_african_markets,
  business_models,
  difficulty,
  capital_intensity,
  time_to_market,
  confidence,
  trust_label,
  sources,
  publish_status,
  sort_order
) values (
  'senegal-local-pharma-supply',
  'Local pharmaceutical supply for public health procurement',
  'Senegal imports a large share of finished medicines. Public procurement is actively seeking qualified local suppliers — a gap for GMP-aware manufacturing, packaging, or licensed distribution.',
  'SN',
  'Senegal · West Africa',
  'Public hospitals and the national supply chain rely heavily on imported finished pharmaceuticals, leaving foreign exchange exposure and supply delays during global shocks.',
  'Senegal''s Pharmacie Nationale d''Approvisionnement (PNA) and related public health programs publish procurement needs for medicines and supplies. Import statistics show pharmaceuticals among priority import categories; local manufacturing capacity remains limited relative to demand.',
  'Post-COVID supply chain awareness, regional ECOWAS harmonization efforts, and youth-led health entrepreneurship programs increase appetite for local production partnerships.',
  'Public hospitals, community pharmacies, NGO health programs, and export-oriented ECOWAS neighbors needing registered products.',
  'Most volume still comes from imported brands via distributors; a few local repackagers and importers dominate mid-tier supply.',
  'High — finished dosage forms and active ingredients are largely imported despite domestic demand growth.',
  array['Pharmacy graduates', 'Dakar industrial zones', 'Regional trade via ECOWAS', 'University research partnerships'],
  array['GMP or partner with licensed facility', 'Product registration pathway', 'Cold-chain logistics', 'Quality control lab access'],
  'West Africa OTC and essential medicines market — multi-billion USD regional demand; Senegal as hub for francophone West Africa.',
  'Established importers with foreign brand licenses; limited local manufacturers with full GMP lines.',
  'Medicines require registration with health authorities; manufacturing needs facility inspection. Partner-with-licensee models reduce time-to-market.',
  array['Mali', 'Guinea', 'Côte d''Ivoire', 'Gambia'],
  array['Licensed local production partner', 'Import + repackaging under brand license', 'Essential generics contract manufacturing'],
  'high',
  'high',
  '18–36 months for registered product; 6–12 months for distribution partnership',
  'medium',
  'curated',
  '[
    {"title":"PNA Senegal","type":"public_procurement","url":"https://www.pna.sn","note":"National pharmaceutical supply entity"},
    {"title":"Kebu Opportunity OS — curated research","type":"internal_curated","note":"Structured from public procurement and trade context; validate before investing."}
  ]'::jsonb,
  'published',
  10
) on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 064 — Creation stack: variants · collections · brand kit · forms · Studio
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.project_products') is null then
    raise exception
      'public.project_products is missing. Apply APPLY_SHOP_ORDERS.sql first, then re-run this bundle.';
  end if;
end $$;

-- C4: product variants
create table if not exists public.project_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.project_products(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  option1 text not null default '' check (char_length(option1) <= 60),
  option2 text not null default '' check (char_length(option2) <= 60),
  option3 text not null default '' check (char_length(option3) <= 60),
  price_label text not null default '' check (char_length(price_label) <= 60),
  price_xof integer check (price_xof is null or price_xof >= 0),
  sku text check (sku is null or char_length(sku) <= 40),
  image_url text not null default '' check (char_length(image_url) <= 500),
  stock_qty integer check (stock_qty is null or (stock_qty >= 0 and stock_qty <= 1000000)),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_product_variants_product_idx
  on public.project_product_variants (product_id, sort_order);
create index if not exists project_product_variants_project_idx
  on public.project_product_variants (project_id);

alter table public.project_product_variants enable row level security;

drop policy if exists "Owners manage project_product_variants" on public.project_product_variants;
create policy "Owners manage project_product_variants"
  on public.project_product_variants for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_product_variants.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_product_variants.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists project_product_variants_set_updated_at on public.project_product_variants;
create trigger project_product_variants_set_updated_at
  before update on public.project_product_variants
  for each row execute function public.set_updated_at();

alter table public.project_products
  add column if not exists has_variants boolean not null default false;

alter table public.shop_order_items
  add column if not exists variant_id uuid references public.project_product_variants(id) on delete set null,
  add column if not exists variant_name text;

-- C5: collections
create table if not exists public.project_product_collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null check (char_length(slug) between 1 and 80),
  description text not null default '' check (char_length(description) <= 1000),
  image_url text not null default '' check (char_length(image_url) <= 500),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists project_product_collections_project_idx
  on public.project_product_collections (project_id, sort_order);

create table if not exists public.project_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.project_product_collections(id) on delete cascade,
  product_id uuid not null references public.project_products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, product_id)
);

create index if not exists project_collection_items_collection_idx
  on public.project_collection_items (collection_id, sort_order);

alter table public.project_product_collections enable row level security;
alter table public.project_collection_items enable row level security;

drop policy if exists "Owners manage project_product_collections" on public.project_product_collections;
create policy "Owners manage project_product_collections"
  on public.project_product_collections for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_product_collections.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_product_collections.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners manage project_collection_items" on public.project_collection_items;
create policy "Owners manage project_collection_items"
  on public.project_collection_items for all
  using (
    exists (
      select 1 from public.project_product_collections c
      join public.projects p on p.id = c.project_id
      where c.id = project_collection_items.collection_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.project_product_collections c
      join public.projects p on p.id = c.project_id
      where c.id = project_collection_items.collection_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists project_product_collections_set_updated_at on public.project_product_collections;
create trigger project_product_collections_set_updated_at
  before update on public.project_product_collections
  for each row execute function public.set_updated_at();

-- S3: brand kit
create table if not exists public.business_brand_kits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  name text not null default 'Brand kit' check (char_length(trim(name)) between 1 and 120),
  logo_url text not null default '' check (char_length(logo_url) <= 500),
  primary_color text not null default '#0F0D33' check (char_length(primary_color) <= 40),
  accent_color text not null default '#E05A2B' check (char_length(accent_color) <= 40),
  background_color text not null default '#FAFAF8' check (char_length(background_color) <= 40),
  text_color text not null default '#0F0D33' check (char_length(text_color) <= 40),
  font_display text not null default 'Fraunces' check (char_length(font_display) <= 80),
  font_body text not null default 'system-ui' check (char_length(font_body) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_brand_kits_owner_idx
  on public.business_brand_kits (owner_id, updated_at desc);
create index if not exists business_brand_kits_business_idx
  on public.business_brand_kits (business_id) where business_id is not null;

alter table public.business_brand_kits enable row level security;

drop policy if exists "Owners manage business_brand_kits" on public.business_brand_kits;
create policy "Owners manage business_brand_kits"
  on public.business_brand_kits for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists business_brand_kits_set_updated_at on public.business_brand_kits;
create trigger business_brand_kits_set_updated_at
  before update on public.business_brand_kits
  for each row execute function public.set_updated_at();

alter table public.project_products
  add column if not exists create_design_id uuid references public.create_designs(id) on delete set null;

-- W14: form submissions
create table if not exists public.project_form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  section_id uuid not null references public.project_sections(id) on delete cascade,
  form_name text not null default '' check (char_length(form_name) <= 120),
  payload jsonb not null default '{}'::jsonb,
  submitter_email text,
  submitter_name text,
  submitter_phone text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists project_form_submissions_project_idx
  on public.project_form_submissions (project_id, created_at desc);
create index if not exists project_form_submissions_section_idx
  on public.project_form_submissions (section_id, created_at desc);

alter table public.project_form_submissions enable row level security;

drop policy if exists "Owners read project_form_submissions" on public.project_form_submissions;
create policy "Owners read project_form_submissions"
  on public.project_form_submissions for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_form_submissions.project_id and p.owner_id = auth.uid()
    )
  );

-- Studio design types
alter table public.create_designs drop constraint if exists create_designs_design_type_check;
alter table public.create_designs
  add constraint create_designs_design_type_check
  check (design_type in (
    'poster', 'social_square', 'flyer',
    'instagram_post', 'instagram_story', 'facebook_post', 'whatsapp_status'
  ));

-- Builder: form section type
alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (
    section_type in (
      'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
      'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'email-popup',
      'whatsapp', 'heading', 'paragraph', 'button', 'free-text', 'footer', 'form',
      'maylecor-home', 'maylecor-music', 'legally-blonde-hero',
      'kdirection-home', 'kdirection-page'
    )
  );

alter table public.project_sections validate constraint project_sections_section_type_check;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '64')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 065 — W13: Universal site header/footer (site_chrome)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.projects
  add column if not exists site_chrome jsonb not null default '{}'::jsonb;

comment on column public.projects.site_chrome is
  'Universal header (navigation) + footer props applied to every page when enabled.';

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '65')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- Done — reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────────────

notify pgrst, 'reload schema';

-- Verify (optional — run separately after success):
-- select
--   to_regclass('public.account_entitlements') as entitlements,
--   to_regclass('public.opportunity_cards') as opportunity_cards,
--   to_regclass('public.project_product_variants') as variants,
--   to_regclass('public.project_product_collections') as collections,
--   to_regclass('public.business_brand_kits') as brand_kits,
--   to_regclass('public.project_form_submissions') as form_submissions,
--   (select count(*) from information_schema.columns
--    where table_schema = 'public' and table_name = 'projects' and column_name = 'site_chrome') as site_chrome_col;
