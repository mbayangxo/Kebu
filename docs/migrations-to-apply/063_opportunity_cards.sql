-- P3: Opportunity OS — Opportunity Card slice (structured economic intelligence cards).

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

-- Curated seed card: Senegal pharmaceutical import replacement (evidence-based, not AI invented).
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
