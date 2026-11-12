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
