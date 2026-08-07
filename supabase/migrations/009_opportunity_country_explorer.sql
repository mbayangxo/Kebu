-- Opportunity OS Slice 1: Country Explorer
-- Extends existing country_profiles; adds AI analysis table (never mixed into verified fields).

alter table public.country_profiles
  add column if not exists overview text;

alter table public.country_profiles
  add column if not exists economy_overview text;

alter table public.country_profiles
  add column if not exists major_exports text[] default '{}';

alter table public.country_profiles
  add column if not exists major_imports text[] default '{}';

alter table public.country_profiles
  add column if not exists agricultural_products text[] default '{}';

alter table public.country_profiles
  add column if not exists manufacturing_sectors text[] default '{}';

alter table public.country_profiles
  add column if not exists technology_ecosystem text;

alter table public.country_profiles
  add column if not exists infrastructure text;

alter table public.country_profiles
  add column if not exists logistics text;

alter table public.country_profiles
  add column if not exists trade_agreements text[] default '{}';

alter table public.country_profiles
  add column if not exists public_entrepreneurship_programs text[] default '{}';

alter table public.country_profiles
  add column if not exists startup_ecosystem text;

alter table public.country_profiles
  add column if not exists universities text[] default '{}';

alter table public.country_profiles
  add column if not exists industrial_zones text[] default '{}';

alter table public.country_profiles
  add column if not exists business_registration_guidance text;

alter table public.country_profiles
  add column if not exists publish_status text;

update public.country_profiles
set publish_status = 'published'
where publish_status is null;

alter table public.country_profiles
  alter column publish_status set default 'draft';

alter table public.country_profiles
  alter column publish_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'country_profiles_publish_status_check'
  ) then
    alter table public.country_profiles
      add constraint country_profiles_publish_status_check
      check (publish_status in ('draft', 'published', 'archived'));
  end if;
end $$;

alter table public.country_profiles
  add column if not exists data_confidence text default 'moderate'
    check (data_confidence in ('low', 'moderate', 'high'));

alter table public.country_profiles
  add column if not exists sources jsonb not null default '[]'::jsonb;

alter table public.country_profiles
  add column if not exists last_verified_at timestamptz;

-- Public read published only (replace open read if present)
drop policy if exists "Anyone can read country profiles" on public.country_profiles;
create policy "Anyone can read published country profiles"
  on public.country_profiles for select
  using (publish_status = 'published');

-- Service/admin writes use service role; authenticated insert for seed tooling when allowed
drop policy if exists "Service inserts country profiles" on public.country_profiles;
-- No broad insert for anon. Seed uses service role or SQL below.

-- =====================
-- AI ANALYSES (separate from verified profile)
-- =====================
create table if not exists public.country_ai_analyses (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.country_profiles(country_code) on delete cascade,
  label text not null default 'ai_generated'
    check (label in ('ai_generated', 'estimated', 'requires_validation')),
  prompt_summary text,
  analysis_markdown text not null,
  model_version text,
  confidence text not null default 'low'
    check (confidence in ('low', 'moderate', 'high')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists country_ai_analyses_country_idx
  on public.country_ai_analyses (country_code, created_at desc);

alter table public.country_ai_analyses enable row level security;

drop policy if exists "Anyone read country AI analyses" on public.country_ai_analyses;
create policy "Anyone read country AI analyses"
  on public.country_ai_analyses for select
  using (
    exists (
      select 1 from public.country_profiles cp
      where cp.country_code = country_ai_analyses.country_code
        and cp.publish_status = 'published'
    )
  );

drop policy if exists "Authenticated insert own country AI analyses" on public.country_ai_analyses;
create policy "Authenticated insert own country AI analyses"
  on public.country_ai_analyses for insert
  with check (auth.uid() = created_by);

-- =====================
-- SEED: Senegal (verified-style public overview — not AI)
-- =====================
insert into public.country_profiles (
  country, country_code, capital, population, gdp, languages, industries,
  cultural_notes, historical_notes, historical_empires, ethnic_groups,
  procurement_links, youth_programs, women_programs, sme_agencies,
  startup_notes, diaspora_notes, business_etiquette,
  overview, economy_overview, major_exports, major_imports,
  agricultural_products, manufacturing_sectors, technology_ecosystem,
  infrastructure, logistics, trade_agreements, public_entrepreneurship_programs,
  startup_ecosystem, universities, industrial_zones, business_registration_guidance,
  publish_status, data_confidence, sources, last_verified_at
) values (
  'Senegal', 'SN', 'Dakar', 17000000, '$27 billion',
  array['French','Wolof','Pulaar','Serer','Diola','Mandinka'],
  array['Fishing','Agriculture','Tourism','Mining','Telecommunications','Creative economy'],
  'Senegal is known for Teranga (hospitality) and a strong culture of trade and entrepreneurship.',
  'Historically linked to Wolof, Jolof, and Mali spheres; Dakar was a major colonial administrative center.',
  array['Wolof Empire','Jolof Empire','Mali Empire'],
  array['Wolof','Fula','Serer','Jola','Mandinka','Soninke'],
  '[{"name":"ARMP","url":"https://www.armp.sn"},{"name":"Marchés Publics","url":"https://marchespublics.sn"}]'::jsonb,
  array['Programme 100 000 Entrepreneurs','DER/FJ','FONSIS Youth Investment Program'],
  array['DER/FJ Women''s Entrepreneurship Fund','ADPME Women SME Support'],
  array['ADPME','APIX','DER/FJ','FONSIS'],
  'Dakar tech hubs include CTIC Dakar; FORCE-N and related initiatives support startups.',
  'Significant diaspora communities in France, Italy, Spain, and the US; remittances and diaspora investment matter.',
  array['Invest in greetings and relationships','Business is relationship-based','Friday is often a shorter day'],
  'Senegal is a West African coastal country centered on Dakar, with agriculture, fisheries, services, and growing tech and creative sectors.',
  'Services and trade dominate urban activity; agriculture and fisheries remain critical for employment; phosphates and related mining contribute to exports.',
  array['Gold','Phosphates','Petroleum products','Fish','Groundnuts','Cashews'],
  array['Petroleum products','Machinery','Food products','Vehicles','Pharmaceuticals'],
  array['Rice','Groundnuts','Millet','Sorghum','Cashews','Horticulture','Fish'],
  array['Food processing','Construction materials','Textiles','Light manufacturing'],
  'Growing digital ecosystem in Dakar with incubators, fintech experiments, and creative/tech startups.',
  'Port of Dakar, road corridors to inland neighbors, expanding energy and urban infrastructure projects.',
  'Maritime trade via Dakar port; regional trucking; air links through Blaise Diagne International Airport.',
  array['ECOWAS','AfCFTA participation','WAEMU'],
  array['DER/FJ','ADPME','APIX','Programme 100 000 Entrepreneurs'],
  'CTIC Dakar and related hubs; government and donor programs supporting entrepreneurship.',
  array['Université Cheikh Anta Diop (UCAD)','École Polytechnique de Thiès','Other public and private institutions'],
  array['Diamniadio industrial / urban projects','Port-linked industrial zones'],
  'Company creation commonly involves APIX and formal registration steps; confirm current procedures with official sources before filing.',
  'published', 'moderate',
  '[{"title":"Kebu curated public overview","type":"curated","note":"Seeded for Country Explorer Slice 1; replace with cited official sources over time"}]'::jsonb,
  now()
)
on conflict (country_code) do update set
  overview = excluded.overview,
  economy_overview = excluded.economy_overview,
  major_exports = excluded.major_exports,
  major_imports = excluded.major_imports,
  agricultural_products = excluded.agricultural_products,
  manufacturing_sectors = excluded.manufacturing_sectors,
  technology_ecosystem = excluded.technology_ecosystem,
  infrastructure = excluded.infrastructure,
  logistics = excluded.logistics,
  trade_agreements = excluded.trade_agreements,
  public_entrepreneurship_programs = excluded.public_entrepreneurship_programs,
  startup_ecosystem = excluded.startup_ecosystem,
  universities = excluded.universities,
  industrial_zones = excluded.industrial_zones,
  business_registration_guidance = excluded.business_registration_guidance,
  publish_status = 'published',
  updated_at = now();
