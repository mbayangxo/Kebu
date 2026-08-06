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
