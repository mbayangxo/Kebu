-- Opportunity OS — listing metadata for trust labels (extends opportunities from 001)

alter table public.opportunities
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.opportunities.metadata is
  'Optional trust fields: verified_at, volatility, attributed_ministry, legal_basis, attributed_official, verification_source_url, flag_reason';

create index if not exists opportunities_metadata_gin on public.opportunities using gin (metadata);
