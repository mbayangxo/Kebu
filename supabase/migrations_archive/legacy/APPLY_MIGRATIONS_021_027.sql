-- Run ONLY if VERIFY shows 021-027 missing and 001-020 already applied.
-- Safe to re-run (idempotent policies). Do NOT re-run APPLY_ALL_PHASE_ONE from line 1.

-- ========== 021_kebu_business_records.sql ==========
-- Kebu official business records + extended document types (gov + ECOWAS + Kebu record)

alter table public.business_documents drop constraint if exists business_documents_document_type_check;

alter table public.business_documents add constraint business_documents_document_type_check
  check (document_type in (
    'founder_id',
    'business_plan',
    'address_proof',
    'registration_form',
    'gov_rccm',
    'gov_tax_certificate',
    'ecowas_trade_packet',
    'kebu_official_record',
    'other'
  ));

create table if not exists public.business_kebu_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  record_version text not null,
  public_kebu_id text not null,
  snapshot jsonb not null,
  storage_path text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references auth.users(id) on delete restrict
);

create index if not exists business_kebu_records_public_id_idx on public.business_kebu_records (public_kebu_id);

alter table public.business_kebu_records enable row level security;

drop policy if exists "Members select business_kebu_records" on public.business_kebu_records;
create policy "Members select business_kebu_records"
  on public.business_kebu_records for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_kebu_records.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Founders upsert business_kebu_records" on public.business_kebu_records;
create policy "Founders upsert business_kebu_records"
  on public.business_kebu_records for insert
  with check (
    generated_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = business_kebu_records.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Founders update business_kebu_records" on public.business_kebu_records;
create policy "Founders update business_kebu_records"
  on public.business_kebu_records for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_kebu_records.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/html']
where id = 'business-documents';

-- ========== 022_site_products_and_create_designs.sql ==========
-- Per-site products (Builder store catalog) + Kebu Create design assets

create table if not exists public.project_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  price_label text not null default '' check (char_length(price_label) <= 60),
  image_url text not null default '' check (char_length(image_url) <= 500),
  whatsapp_order_message text not null default '' check (char_length(whatsapp_order_message) <= 300),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_products_project_idx on public.project_products (project_id, sort_order);
create index if not exists project_products_business_idx on public.project_products (business_id) where business_id is not null;

alter table public.project_products enable row level security;

drop policy if exists "Owners manage project_products" on public.project_products;
create policy "Owners manage project_products"
  on public.project_products for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_products.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_products.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists project_products_set_updated_at on public.project_products;
create trigger project_products_set_updated_at
  before update on public.project_products
  for each row execute function public.set_updated_at();

-- Kebu Create — posters, social graphics, flyers (separate from Builder websites)

create table if not exists public.create_designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  design_type text not null default 'poster'
    check (design_type in ('poster', 'social_square', 'flyer')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  canvas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists create_designs_owner_idx on public.create_designs (owner_id, updated_at desc);
create index if not exists create_designs_business_idx on public.create_designs (business_id) where business_id is not null;

alter table public.create_designs enable row level security;

drop policy if exists "Owners manage create_designs" on public.create_designs;
create policy "Owners manage create_designs"
  on public.create_designs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists create_designs_set_updated_at on public.create_designs;
create trigger create_designs_set_updated_at
  before update on public.create_designs
  for each row execute function public.set_updated_at();

-- ========== 023_site_assets_bucket.sql ==========
-- Public site assets (logos, favicons, product photos) — uploaded from Kebu Builder

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload site assets" on storage.objects;
create policy "Owners upload site assets"
  on storage.objects for insert
  with check (
    bucket_id = 'site-assets'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners update site assets" on storage.objects;
create policy "Owners update site assets"
  on storage.objects for update
  using (
    bucket_id = 'site-assets'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read site assets" on storage.objects;
create policy "Public read site assets"
  on storage.objects for select
  using (bucket_id = 'site-assets');

drop policy if exists "Owners delete site assets" on storage.objects;
create policy "Owners delete site assets"
  on storage.objects for delete
  using (
    bucket_id = 'site-assets'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========== 024_b2b_business_profiles.sql ==========
-- B2B trade profiles (visible only to other Kebu business members) + commerce mode on businesses

alter table public.businesses
  add column if not exists commerce_mode text not null default 'b2c'
    check (commerce_mode in ('b2c', 'b2b', 'both'));

create table if not exists public.business_b2b_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  headline text not null default '' check (char_length(headline) <= 160),
  about text not null default '' check (char_length(about) <= 2000),
  logo_url text not null default '' check (char_length(logo_url) <= 500),
  cover_url text not null default '' check (char_length(cover_url) <= 500),
  gallery_urls text[] not null default '{}',
  categories text[] not null default '{}',
  min_order_note text not null default '' check (char_length(min_order_note) <= 200),
  contact_email text check (contact_email is null or char_length(trim(contact_email)) between 3 and 254),
  contact_phone text check (contact_phone is null or char_length(trim(contact_phone)) between 5 and 40),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_b2b_profiles_published_idx
  on public.business_b2b_profiles (is_published, updated_at desc)
  where is_published = true;

alter table public.business_b2b_profiles enable row level security;

drop policy if exists "Business members browse published b2b profiles" on public.business_b2b_profiles;
create policy "Business members browse published b2b profiles"
  on public.business_b2b_profiles for select
  using (
    is_published = true
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Founders manage own b2b profile" on public.business_b2b_profiles;
create policy "Founders manage own b2b profile"
  on public.business_b2b_profiles for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_b2b_profiles.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_b2b_profiles.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop trigger if exists business_b2b_profiles_set_updated_at on public.business_b2b_profiles;
create trigger business_b2b_profiles_set_updated_at
  before update on public.business_b2b_profiles
  for each row execute function public.set_updated_at();

-- ========== 025_profiles_avatars_and_email_campaigns.sql ==========
-- Personal avatars, business logos, customer email capture, campaigns

alter table public.user_profiles
  add column if not exists avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500);

alter table public.businesses
  add column if not exists logo_url text not null default '' check (char_length(logo_url) <= 500);

create table if not exists public.business_email_subscribers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  email text not null check (char_length(trim(email)) between 3 and 254),
  name text check (name is null or char_length(trim(name)) between 1 and 120),
  source text not null default 'site' check (source in ('site', 'manual', 'import')),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create index if not exists business_email_subscribers_business_idx
  on public.business_email_subscribers (business_id, created_at desc);

create table if not exists public.business_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  create_design_id uuid references public.create_designs(id) on delete set null,
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  body_html text not null default '' check (char_length(body_html) <= 50000),
  body_text text not null default '' check (char_length(body_text) <= 20000),
  from_name text not null default '' check (char_length(from_name) <= 120),
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  sent_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_email_campaigns_business_idx
  on public.business_email_campaigns (business_id, created_at desc);

create table if not exists public.business_email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.business_email_campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.business_email_subscribers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  unique (campaign_id, subscriber_id)
);

alter table public.business_email_subscribers enable row level security;
alter table public.business_email_campaigns enable row level security;
alter table public.business_email_campaign_recipients enable row level security;

drop policy if exists "Managers manage subscribers" on public.business_email_subscribers;
create policy "Managers manage subscribers"
  on public.business_email_subscribers for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_subscribers.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_subscribers.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Managers manage campaigns" on public.business_email_campaigns;
create policy "Managers manage campaigns"
  on public.business_email_campaigns for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_campaigns.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_email_campaigns.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Managers read campaign recipients" on public.business_email_campaign_recipients;
create policy "Managers read campaign recipients"
  on public.business_email_campaign_recipients for select
  using (
    exists (
      select 1 from public.business_email_campaigns c
      join public.business_members m on m.business_id = c.business_id
      where c.id = business_email_campaign_recipients.campaign_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop trigger if exists business_email_campaigns_set_updated_at on public.business_email_campaigns;
create trigger business_email_campaigns_set_updated_at
  before update on public.business_email_campaigns
  for each row execute function public.set_updated_at();

-- ========== 026_opportunity_profiles_and_stories.sql ==========
-- Opportunity OS: user intake + hope/stories (personalization before recommendations)

create table if not exists public.opportunity_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  main_goal text check (char_length(main_goal) <= 80),
  goals text[] not null default '{}',
  interest_paths text[] not null default '{}',
  resource_needs text[] not null default '{}',
  starting_budget_band text check (
    starting_budget_band is null or starting_budget_band in (
      'under_50k', '50k_500k', '500k_5m', '5m_plus', 'not_sure'
    )
  ),
  preferred_country_codes text[] not null default '{}',
  enjoy_doing text not null default '' check (char_length(enjoy_doing) <= 500),
  intake_complete boolean not null default false,
  intake_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunity_profiles enable row level security;

drop policy if exists "Users manage own opportunity profile" on public.opportunity_profiles;
create policy "Users manage own opportunity profile"
  on public.opportunity_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.opportunity_stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 2 and 80),
  title text not null check (char_length(title) between 1 and 200),
  person_name text not null default '' check (char_length(person_name) <= 120),
  country_code char(2),
  era text not null default 'contemporary' check (era in ('historical', 'contemporary', 'ancestral_legacy')),
  summary text not null check (char_length(summary) between 20 and 2000),
  lesson text not null default '' check (char_length(lesson) <= 800),
  themes text[] not null default '{}',
  resource_tags text[] not null default '{}',
  trust_label text not null default 'verified_public'
    check (trust_label in ('verified_public', 'estimated', 'ai_generated', 'requires_validation')),
  source_url text check (source_url is null or char_length(source_url) <= 500),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunity_stories_published_idx
  on public.opportunity_stories (is_published, sort_order);

alter table public.opportunity_stories enable row level security;

drop policy if exists "Public read published stories" on public.opportunity_stories;
create policy "Public read published stories"
  on public.opportunity_stories for select
  using (is_published = true);

drop trigger if exists opportunity_profiles_set_updated_at on public.opportunity_profiles;
create trigger opportunity_profiles_set_updated_at
  before update on public.opportunity_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists opportunity_stories_set_updated_at on public.opportunity_stories;
create trigger opportunity_stories_set_updated_at
  before update on public.opportunity_stories
  for each row execute function public.set_updated_at();

insert into public.opportunity_stories (
  slug, title, person_name, country_code, era, summary, lesson, themes, resource_tags, trust_label, source_url, sort_order
) values
(
  'wangari-maathai-green-belt',
  'From one tree to millions — community wealth',
  'Wangari Maathai',
  'KE',
  'contemporary',
  'Wangari Maathai started the Green Belt Movement in Kenya — paying women to plant trees. It grew into environmental restoration, women''s income, and global recognition. She showed that a small local action with clear resources (land, seedlings, community) can scale.',
  'You do not need a factory on day one. Start with a resource your community already has — land, craft, data, or trust — and organize people around it.',
  array['agriculture_resources', 'ancestry_heritage', 'grants_funding'],
  array['grants', 'ancestral_knowledge', 'country_intel'],
  'verified_public',
  'https://www.nobelprize.org/prizes/peace/2004/maathai/biographical/',
  10
),
(
  'dangote-industrial-path',
  'Building industry from trading roots',
  'Aliko Dangote',
  'NG',
  'contemporary',
  'Aliko Dangote began in commodities trading in Nigeria and reinvested profits into cement, sugar, and flour — industries Africa was importing. His path shows how understanding import gaps and local demand can turn into manufacturing at scale.',
  'Look at what your country imports heavily. Local production of everyday goods is often the first realistic industrial opportunity — if you can finance inventory and distribution.',
  array['manufacturing', 'trade_import_export', 'grants_funding'],
  array['loans', 'country_intel', 'startup_programs'],
  'verified_public',
  'https://www.dangote.com/',
  20
),
(
  'mali-gold-trade-legacy',
  'When Africa moved gold — not just extracted it',
  'Mansa Musa era · West Africa',
  'ML',
  'ancestral_legacy',
  'Medieval Mali sat on major trade routes. Gold, salt, and knowledge moved across the Sahel — cities like Timbuktu became centers of learning and commerce. Africans were not only resource-rich; they built systems to trade, tax, and educate.',
  'Heritage is not nostalgia — it is proof that organization, trade routes, and skills existed before colonial borders. Modern opportunity often reconnects those same flows digitally.',
  array['ancestry_heritage', 'trade_import_export'],
  array['ancestral_knowledge', 'country_intel'],
  'verified_public',
  'https://www.britannica.com/place/Mali-historical-empire-Africa',
  30
),
(
  'senegal-teranga-entrepreneurship',
  'Small service businesses that scale with trust',
  'Senegalese SME pattern',
  'SN',
  'contemporary',
  'In Senegal, many successful businesses start in services — tailoring, food, logistics, phone credit, construction crews — where reputation (teranga) drives repeat customers. Formal registration and Kebu ID come after proof of demand.',
  'If you are starting with little cash, service + trust + repeat customers often beats a big plan with no customers.',
  array['construction_bidding', 'retail_store', 'creative_media'],
  array['grants', 'tenders_contracts', 'startup_programs'],
  'verified_public',
  null,
  40
)
on conflict (slug) do nothing;

-- ========== 027_afrique_id.sql ==========
-- Afrique ID: personal identity linked to Kebu account (separate from Kebu ID / business)

create table if not exists public.afrique_ids (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_afrique_id text not null unique check (char_length(public_afrique_id) between 12 and 24),
  country_code char(2) not null,
  eligibility_status text not null default 'unverified' check (
    eligibility_status in (
      'unverified', 'pending', 'verified', 'rejected', 'expired', 'suspended', 'manual_review'
    )
  ),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists afrique_ids_public_id_idx on public.afrique_ids (public_afrique_id);

alter table public.afrique_ids enable row level security;

drop policy if exists "Users read own Afrique ID" on public.afrique_ids;
create policy "Users read own Afrique ID"
  on public.afrique_ids for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own Afrique ID" on public.afrique_ids;
create policy "Users insert own Afrique ID"
  on public.afrique_ids for insert
  with check (auth.uid() = user_id);

drop policy if exists "Public read verified Afrique ID cards" on public.afrique_ids;
create policy "Public read verified Afrique ID cards"
  on public.afrique_ids for select
  using (eligibility_status = 'verified');

drop trigger if exists afrique_ids_set_updated_at on public.afrique_ids;
create trigger afrique_ids_set_updated_at
  before update on public.afrique_ids
  for each row execute function public.set_updated_at();

drop policy if exists "Users request Afrique ID verification" on public.afrique_ids;
create policy "Users request Afrique ID verification"
  on public.afrique_ids for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and eligibility_status = 'pending');

grant select, insert, update on public.afrique_ids to authenticated;

