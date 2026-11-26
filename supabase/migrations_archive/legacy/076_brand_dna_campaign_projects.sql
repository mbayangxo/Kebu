-- Brand DNA foundation + Creative Director campaign projects
-- Depends: business_brand_kits (064) · create_designs · studio_video_projects (075)

-- ── Brand DNA fields on existing brand kits ─────────────────────────────────

alter table public.business_brand_kits
  add column if not exists tagline text not null default ''
    check (char_length(tagline) <= 200),
  add column if not exists photography_style text not null default ''
    check (char_length(photography_style) <= 400),
  add column if not exists voice_tone text not null default ''
    check (char_length(voice_tone) <= 400),
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists customer_notes text not null default ''
    check (char_length(customer_notes) <= 1000),
  add column if not exists products_notes text not null default ''
    check (char_length(products_notes) <= 1000),
  add column if not exists visual_rules text not null default ''
    check (char_length(visual_rules) <= 1000),
  add column if not exists approved_imagery jsonb not null default '[]'::jsonb,
  add column if not exists dna_version int not null default 1
    check (dna_version >= 1 and dna_version <= 100);

comment on column public.business_brand_kits.photography_style is
  'Brand DNA: how products/people should be photographed';
comment on column public.business_brand_kits.voice_tone is
  'Brand DNA: writing/speaking voice for captions and copy';
comment on column public.business_brand_kits.visual_rules is
  'Brand DNA: do/don''t visual rules for Studio/Builder/Shop AI';

-- Prefer one DNA kit per business in app logic (GET upserts by business_id).
-- No hard unique index: legacy owners may already have multiple kits.

-- ── Creative Director campaign projects ─────────────────────────────────────

create table if not exists public.studio_campaign_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  brand_kit_id uuid references public.business_brand_kits(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  brief text not null default '' check (char_length(brief) <= 2000),
  goal text not null default '' check (char_length(goal) <= 400),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'launched', 'archived')),
  /** Moodboard / visual direction — single source of truth for the campaign */
  mood jsonb not null default '{}'::jsonb,
  design_ids uuid[] not null default '{}'::uuid[],
  video_project_ids uuid[] not null default '{}'::uuid[],
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_campaign_projects_owner_idx
  on public.studio_campaign_projects (owner_id, updated_at desc);
create index if not exists studio_campaign_projects_business_idx
  on public.studio_campaign_projects (business_id)
  where business_id is not null;

alter table public.studio_campaign_projects enable row level security;

drop policy if exists "Owners manage studio_campaign_projects" on public.studio_campaign_projects;
create policy "Owners manage studio_campaign_projects"
  on public.studio_campaign_projects for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_campaign_projects to authenticated;
grant all on public.studio_campaign_projects to service_role;

drop trigger if exists studio_campaign_projects_set_updated_at on public.studio_campaign_projects;
create trigger studio_campaign_projects_set_updated_at
  before update on public.studio_campaign_projects
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
