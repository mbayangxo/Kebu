-- C4 variants · C5 collections · S3 brand kit · W14 forms · Studio design types
-- Apply after 063.

-- ── C4: product variants ─────────────────────────────────────────────────────

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

-- ── C5: collections ────────────────────────────────────────────────────────

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

-- ── S3: brand kit ───────────────────────────────────────────────────────────

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

-- ── W14: form submissions ───────────────────────────────────────────────────

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

-- ── Studio design types ─────────────────────────────────────────────────────

alter table public.create_designs drop constraint if exists create_designs_design_type_check;
alter table public.create_designs
  add constraint create_designs_design_type_check
  check (design_type in (
    'poster', 'social_square', 'flyer',
    'instagram_post', 'instagram_story', 'facebook_post', 'whatsapp_status'
  ));

-- ── Builder: form section type ──────────────────────────────────────────────

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

notify pgrst, 'reload schema';
