-- Business Search: paginate results instead of a hard top-20 cutoff, and
-- report how many total matches exist so the caller knows whether there is
-- more to load. The previous slice's search_businesses(text, text) always
-- returned at most 20 rows with no way to see further results and no way
-- for the caller to know there were ever more than that.
--
-- Adds p_limit/p_offset, both clamped server-side so a caller cannot
-- request an unbounded page or an unbounded scan depth, and a total_count
-- column computed with a window function over the same already-filtered,
-- already live-joined match set the page itself is drawn from -- so the
-- count can never disagree with what the active-status/query/country
-- filters actually matched.
drop function if exists public.search_businesses(text, text);

create or replace function public.search_businesses(
  p_query text default null,
  p_country text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  entity_id uuid,
  title text,
  summary text,
  source_url text,
  source_name text,
  trust_label text,
  category text,
  country_code text,
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
      sd.entity_id::uuid as business_id,
      sd.title, sd.summary, sd.source_url, sd.source_name, sd.trust_label,
      sd.category, sd.country_code, sd.fetched_at, sd.search_vector, sd.updated_at
    from public.search_documents sd
    where sd.mode = 'businesses'
      and sd.access_scope = 'public'
      and (p_country is null or sd.country_code = p_country)
  ),
  matched as (
    select
      c.business_id, c.title, c.summary, c.source_url, c.source_name, c.trust_label,
      c.category, c.country_code, c.fetched_at, c.updated_at,
      case
        when p_query is null or btrim(p_query) = '' then 0::real
        else ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))
      end as rank
    from candidates c
    join public.businesses b on b.id = c.business_id
    where b.lifecycle_status = 'active'  -- re-checked live on every call, never cached
      and (
        p_query is null or btrim(p_query) = ''
        or c.search_vector @@ websearch_to_tsquery('simple', p_query)
      )
  )
  select
    business_id, title, summary, source_url, source_name, trust_label,
    category, country_code, fetched_at, rank,
    count(*) over () as total_count
  from matched
  order by rank desc, updated_at desc, business_id  -- deterministic: rank ties never reorder between calls
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, least(coalesce(p_offset, 0), 2000));
$$;

-- Supabase grants EXECUTE on new public functions to anon/authenticated by
-- default; this function is server-side-only, same posture as search_documents.
revoke execute on function public.search_businesses(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_businesses(text, text, integer, integer) to service_role;
