-- Live-enforced, ranked, paginated Opportunities Search -- the first
-- authenticated Search mode. Architecturally the same live-join pattern as
-- search_businesses()/search_products(), but what it re-checks live on
-- every call is the *caller's own* identity verification
-- (afrique_ids.user_id = p_user_id, eligibility_status='verified',
-- identity_type='indigenous') rather than an entity's status --
-- opportunities itself has no draft/published concept, so the entity side
-- needs no live-join at all. Returns zero rows (never an error) for any
-- unverified or missing caller, so even a direct RPC call independent of
-- the calling route's own check can never leak a result.
create or replace function public.search_opportunities(
  p_user_id uuid,
  p_query text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  entity_id text,
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
  with verified_caller as (
    select 1 from public.afrique_ids a
    where a.user_id = p_user_id and a.eligibility_status = 'verified' and a.identity_type = 'indigenous'
  ),
  candidates as (
    select
      sd.entity_id, sd.title, sd.summary, sd.source_url, sd.source_name,
      sd.trust_label, sd.fetched_at, sd.updated_at, sd.search_vector
    from public.search_documents sd
    where sd.mode = 'opportunities' and sd.access_scope = 'opportunity_verified'
      and exists (select 1 from verified_caller)
  ),
  matched as (
    select
      c.entity_id, c.title, c.summary, c.source_url, c.source_name, c.trust_label, c.fetched_at, c.updated_at,
      case
        when p_query is null or btrim(p_query) = '' then 0::real
        else ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))
      end as rank
    from candidates c
    where (
      p_query is null or btrim(p_query) = ''
      or c.search_vector @@ websearch_to_tsquery('simple', p_query)
    )
  )
  select
    entity_id, title, summary, source_url, source_name, trust_label, fetched_at,
    rank, count(*) over () as total_count
  from matched
  order by rank desc, updated_at desc, entity_id
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, least(coalesce(p_offset, 0), 2000));
$$;

revoke execute on function public.search_opportunities(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_opportunities(uuid, text, integer, integer) to service_role;
