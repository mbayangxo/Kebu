create table if not exists public.search_documents (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  mode text not null check (mode in ('sites','opportunities')),
  entity_type text not null,
  entity_id text not null,
  title text not null,
  summary text not null default '',
  source_url text,
  source_name text,
  trust_label text,
  access_scope text not null default 'public' check (access_scope in ('public','opportunity_verified')),
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(source_name,'')), 'C')
  ) stored
);

create index if not exists search_documents_vector_idx on public.search_documents using gin(search_vector);
create index if not exists search_documents_mode_idx on public.search_documents(mode, updated_at desc);

alter table public.search_documents enable row level security;
revoke all on public.search_documents from public, anon, authenticated;
grant all on public.search_documents to service_role;
