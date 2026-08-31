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
