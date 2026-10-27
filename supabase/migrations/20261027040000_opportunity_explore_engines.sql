-- Opportunity OS explore slices: Discovery engine (spec §8), Import-replacement
-- engine (§5), African intercontinental trade (§7), and one more Opportunity
-- Card (§9) beyond the existing Senegal pharma-supply seed.
--
-- Same honest-sourcing contract as the existing opportunity_cards table
-- (confidence/trust_label/sources, public read of published rows only,
-- no insert/update grant to anon or authenticated): never invent a trade
-- statistic or market claim. Every seeded row below traces to a real,
-- already-curated fact already stored in public.country_profiles
-- (020260919101805/009_opportunity_country_explorer's Senegal seed) --
-- nothing here is a new invented fact. Trade-gap analysis needs at least
-- two countries' real curated profiles to honestly compare; only Senegal
-- has one today, so opportunity_trade_gaps is seeded with zero rows --
-- an honest empty state, not a placeholder.

create table if not exists public.opportunity_import_replacement_analyses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(trim(slug)) between 3 and 120),
  country_code char(2) not null,
  product_category text not null check (char_length(trim(product_category)) between 2 and 160),
  import_dependency_note text not null,
  local_production_status text not null,
  raw_material_availability text,
  processing_gap text,
  equipment_needed text[] not null default '{}',
  skills_needed text[] not null default '{}',
  target_markets text[] not null default '{}',
  verdict text not null check (verdict in ('promising', 'mixed', 'unlikely')),
  verdict_reasoning text not null,
  confidence text not null default 'exploratory' check (confidence in ('high', 'medium', 'exploratory')),
  trust_label text not null default 'curated',
  sources jsonb not null default '[]'::jsonb,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunity_import_replacement_publish_idx
  on public.opportunity_import_replacement_analyses (publish_status, sort_order, country_code);

alter table public.opportunity_import_replacement_analyses enable row level security;

drop policy if exists "Anyone reads published import-replacement analyses" on public.opportunity_import_replacement_analyses;
create policy "Anyone reads published import-replacement analyses"
  on public.opportunity_import_replacement_analyses for select
  using (publish_status = 'published');

drop trigger if exists opportunity_import_replacement_set_updated_at on public.opportunity_import_replacement_analyses;
create trigger opportunity_import_replacement_set_updated_at
  before update on public.opportunity_import_replacement_analyses
  for each row execute function public.set_updated_at();

create table if not exists public.opportunity_discovery_hypotheses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(trim(slug)) between 3 and 120),
  title text not null check (char_length(trim(title)) between 3 and 200),
  country_code char(2) not null,
  hypothesis text not null,
  signal_basis text[] not null default '{}',
  reasoning text not null,
  confidence text not null default 'exploratory' check (confidence in ('high', 'medium', 'exploratory')),
  trust_label text not null default 'curated',
  sources jsonb not null default '[]'::jsonb,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunity_discovery_publish_idx
  on public.opportunity_discovery_hypotheses (publish_status, sort_order, country_code);

alter table public.opportunity_discovery_hypotheses enable row level security;

drop policy if exists "Anyone reads published discovery hypotheses" on public.opportunity_discovery_hypotheses;
create policy "Anyone reads published discovery hypotheses"
  on public.opportunity_discovery_hypotheses for select
  using (publish_status = 'published');

drop trigger if exists opportunity_discovery_set_updated_at on public.opportunity_discovery_hypotheses;
create trigger opportunity_discovery_set_updated_at
  before update on public.opportunity_discovery_hypotheses
  for each row execute function public.set_updated_at();

-- Seeded with zero rows, deliberately: a real cross-country trade-gap claim
-- ("Country A could sell X to Country B") needs real curated demand/supply
-- data for BOTH countries. Only Senegal has a real country_profiles row
-- today -- there is no second real profile to honestly compare against.
-- The table, RLS and API are real and functional; the UI shows an honest
-- "needs a second country's curated data" empty state rather than a
-- fabricated country pair.
create table if not exists public.opportunity_trade_gaps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(trim(slug)) between 3 and 120),
  origin_country_code char(2) not null,
  destination_country_code char(2) not null,
  product_category text not null check (char_length(trim(product_category)) between 2 and 160),
  gap_description text not null,
  logistics_notes text,
  regulatory_notes text,
  confidence text not null default 'exploratory' check (confidence in ('high', 'medium', 'exploratory')),
  trust_label text not null default 'curated',
  sources jsonb not null default '[]'::jsonb,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (origin_country_code <> destination_country_code)
);

create index if not exists opportunity_trade_gaps_publish_idx
  on public.opportunity_trade_gaps (publish_status, sort_order, origin_country_code);

alter table public.opportunity_trade_gaps enable row level security;

drop policy if exists "Anyone reads published trade gaps" on public.opportunity_trade_gaps;
create policy "Anyone reads published trade gaps"
  on public.opportunity_trade_gaps for select
  using (publish_status = 'published');

drop trigger if exists opportunity_trade_gaps_set_updated_at on public.opportunity_trade_gaps;
create trigger opportunity_trade_gaps_set_updated_at
  before update on public.opportunity_trade_gaps
  for each row execute function public.set_updated_at();

-- ============================================================
-- Seed: Import-replacement analysis, derived from Senegal's own real
-- major_imports + agricultural_products + manufacturing_sectors
-- (country_profiles, seeded 2026-09 from public overview sources).
-- Senegal already lists "Food processing" as a real manufacturing sector
-- and "Groundnuts"/"Cashews" as real agricultural products AND real major
-- exports in the same row -- raw export alongside an existing processing
-- sector is exactly the honest, source-traceable signal this analysis
-- reasons from, not an invented trade statistic.
-- ============================================================
insert into public.opportunity_import_replacement_analyses (
  slug, country_code, product_category, import_dependency_note,
  local_production_status, raw_material_availability, processing_gap,
  equipment_needed, skills_needed, target_markets,
  verdict, verdict_reasoning, confidence, trust_label, sources,
  publish_status, sort_order
) values (
  'senegal-processed-cashew-value-addition',
  'SN',
  'Processed cashew products (kernels, snacks, oil) vs. raw cashew export',
  'Senegal''s own curated country profile lists cashews as both a real agricultural product and a real major export -- consistent with West Africa''s broader pattern of exporting raw cashew for processing abroad rather than capturing the higher-value processed-product margin locally.',
  'Senegal''s curated profile already lists "Food processing" among its real manufacturing sectors, meaning some relevant capacity exists, but with no cashew-specific processing line indicated in the curated data.',
  'High, per the same curated profile -- cashews are listed as both a grown agricultural product and an exported commodity in the same country record.',
  'The gap this analysis flags, honestly: raw cashew export vs. local kernel/snack/oil processing is a real, well-known pattern across West African cashew-growing countries, but this record cites no Senegal-specific processing-capacity figure -- that is exactly why this is "exploratory," not "high" confidence.',
  array['Cashew shelling/decorticating equipment', 'Roasting/packaging line', 'Quality grading tools'],
  array['Food-safety/export-grade packaging know-how', 'Food processing operations'],
  array['Local retail', 'ECOWAS regional export', 'International specialty-snack export'],
  'mixed',
  'The raw-material and an adjacent manufacturing sector both show up as real in Senegal''s own curated profile, which is a genuine signal worth a founder''s own validation -- but this record has no cited source for actual processing capacity, financing need, or current competitor presence, so it is marked "mixed," not "promising," until someone sources those specifically.',
  'exploratory',
  'curated',
  '[
    {"title":"Kebu Country Intelligence — Senegal profile","type":"internal_curated","note":"Derived from country_profiles.agricultural_products, major_exports and manufacturing_sectors; validate specific capacity/competition claims before investing."}
  ]'::jsonb,
  'published',
  10
) on conflict (slug) do nothing;

-- ============================================================
-- Seed: Discovery hypothesis, derived from Senegal's own real
-- technology_ecosystem text + major_exports (raw commodity dependency).
-- ============================================================
insert into public.opportunity_discovery_hypotheses (
  slug, title, country_code, hypothesis, signal_basis, reasoning,
  confidence, trust_label, sources, publish_status, sort_order
) values (
  'senegal-agtech-export-tooling',
  'Export-processing and traceability tooling for raw-commodity exporters',
  'SN',
  'Senegal''s curated profile describes a growing Dakar tech/startup ecosystem alongside continued heavy reliance on exporting raw commodities (phosphates, groundnuts, fish, cashews per the same profile) rather than processed goods -- suggesting unmet demand for software tooling that helps commodity exporters and small processors manage traceability, quality grading, or buyer-matching.',
  array['country_profiles.technology_ecosystem (curated Dakar ecosystem description)', 'country_profiles.major_exports (raw-commodity-dominant export list)'],
  'This is a hypothesis about a software-tooling gap, reasoned from two real, already-curated facts about the same country sitting side by side in one record -- it is not a claim that this specific product exists, has demand, or is viable. Framed deliberately as "exploratory": no procurement data, funding activity, or named competitor was available to strengthen it beyond that.',
  'exploratory',
  'curated',
  '[
    {"title":"Kebu Country Intelligence — Senegal profile","type":"internal_curated","note":"Derived from country_profiles.technology_ecosystem and major_exports; this is a reasoned hypothesis, not a verified market finding."}
  ]'::jsonb,
  'published',
  10
) on conflict (slug) do nothing;

-- ============================================================
-- Seed: one more Opportunity Card (same table/schema as the existing
-- 063 migration's pharma-supply card), derived the same way as the
-- import-replacement analysis above -- raw cashew export alongside an
-- existing food-processing sector, both real fields on the same curated
-- Senegal country_profiles row.
-- ============================================================
insert into public.opportunity_cards (
  slug, title, opportunity_summary, country_code, location_label,
  problem, evidence, why_now, customer_segment, current_solutions,
  import_dependency, local_resources, required_capabilities,
  estimated_market, competition, regulatory_notes,
  potential_african_markets, business_models, difficulty, capital_intensity,
  time_to_market, confidence, trust_label, sources, publish_status, sort_order
) values (
  'senegal-cashew-value-addition',
  'Local cashew processing instead of raw export',
  'Senegal''s own curated profile lists cashews as both a grown agricultural product and a raw major export, with no cashew-specific processing capacity indicated -- a classic raw-export-vs-processed-value gap, flagged here for a founder to validate, not asserted as proven.',
  'SN',
  'Senegal · West Africa',
  'Raw cashew nuts are commonly exported unprocessed from West African growing regions, with the higher-margin shelling/roasting/packaging step captured elsewhere -- a widely documented regional pattern, though this record cites no Senegal-specific processing-volume figure.',
  'Senegal''s curated country profile lists cashews under both real agricultural_products and real major_exports in the same record, and separately lists "Food processing" as a real existing manufacturing sector -- an adjacent capability base, not cashew-specific evidence of existing processing lines.',
  'Regional food-processing investment interest and ECOWAS/AfCFTA trade integration (both already in Senegal''s curated trade_agreements) make local value-addition more commercially reachable than it would be in isolation.',
  'Local retailers, regional ECOWAS snack-food distributors, and export-grade specialty buyers.',
  'Mostly raw-nut export via existing trade channels; this record has no cited source identifying a specific local cashew processor.',
  'Moderate-to-high per the pattern described above, though not sourced to a Senegal-specific import/export cashew-processing statistic.',
  array['Cashew-growing regions', 'Existing food-processing sector (per curated profile)', 'ECOWAS/AfCFTA trade access (per curated profile)'],
  array['Shelling and roasting equipment', 'Food-safety export packaging', 'Quality grading'],
  'Regional West African snack-food market; no sourced market-size figure available for this record.',
  'Existing raw-nut exporters and a small number of regional processors; no specific competitor named here.',
  'Export-grade food products require standard food-safety registration; this record does not cite a specific regulatory pathway.',
  array['Mali', 'Gambia', 'Guinea-Bissau', 'Côte d''Ivoire'],
  array['Contract processing for export brands', 'Direct-to-retail branded snack line', 'Regional B2B bulk kernel supply'],
  'medium',
  'medium',
  '12–24 months for a packaged regional product; longer for export-certified lines',
  'exploratory',
  'curated',
  '[
    {"title":"Kebu Country Intelligence — Senegal profile","type":"internal_curated","note":"Derived from country_profiles.agricultural_products, major_exports, manufacturing_sectors and trade_agreements; validate specific volumes, processors and regulatory steps before investing."}
  ]'::jsonb,
  'published',
  20
) on conflict (slug) do nothing;
