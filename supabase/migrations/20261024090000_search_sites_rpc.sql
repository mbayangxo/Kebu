-- Live-enforced, ranked, paginated Search over Kebu's own published sites
-- and stores -- the real corpus the Phase One indexer
-- (lib/search/indexer.ts) has been writing into search_documents under
-- mode='sites' since before this session, with no search function ever
-- built to actually query it. No mode-widening migration needed: 'sites'
-- has been an allowed mode value since the very first Search migration
-- (20260920087000_search_index_phase_one.sql).
--
-- Exposed in the UI as "Africa" -- the product spec (docs/product/
-- KEBU-SEARCH.md) defines Africa mode as "African sites, businesses,
-- content"; Business is already its own dedicated mode, so this covers the
-- "sites" component with the one real, already-indexed source that exists
-- for it, rather than duplicating businesses under a second label.
--
-- A site or store that is unpublished after indexing can never appear
-- here, regardless of how stale search_documents is -- same live-join
-- contract as every other Search mode.
create or replace function public.search_sites(
  p_query text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  entity_id text,
  entity_type text,
  title text,
  summary text,
  source_url text,
  source_name text,
  trust_label text,
  fetched_at timestamptz,
  rank real,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with candidates as (
    select
      sd.entity_id, sd.entity_type, sd.title, sd.summary, sd.source_url, sd.source_name,
      sd.trust_label, sd.fetched_at, sd.updated_at, sd.search_vector
    from public.search_documents sd
    where sd.mode = 'sites' and sd.access_scope = 'public'
  ),
  matched as (
    select
      c.entity_id, c.entity_type, c.title, c.summary, c.source_url, c.source_name, c.trust_label,
      c.fetched_at, c.updated_at,
      case
        when p_query is null or btrim(p_query) = '' then 0::real
        else ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))
      end as rank
    from candidates c
    where exists (
      select 1 from public.projects p
      where p.id::text = c.entity_id and p.status = 'published' and p.subdomain is not null
    )
    and (
      p_query is null or btrim(p_query) = ''
      or c.search_vector @@ websearch_to_tsquery('simple', p_query)
    )
  )
  select
    entity_id, entity_type, title, summary, source_url, source_name, trust_label, fetched_at,
    rank, count(*) over () as total_count
  from matched
  order by rank desc, updated_at desc, entity_id
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, least(coalesce(p_offset, 0), 2000));
$$;

revoke execute on function public.search_sites(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_sites(text, integer, integer) to service_role;
