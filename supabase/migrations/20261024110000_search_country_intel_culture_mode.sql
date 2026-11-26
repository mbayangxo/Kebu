-- Widens public.search_country_intel()'s allowed p_mode values to include
-- 'culture', alongside the existing 'research'/'trade'. Same function,
-- same live-join to country_profiles.publish_status='published' -- Culture
-- is architecturally identical to Research and Trade (same source table,
-- same live check), just a third content lens over it, so this extends the
-- one shared function rather than creating a near-duplicate.
create or replace function public.search_country_intel(
  p_mode text,
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
  with candidates as (
    select
      sd.entity_id as code, sd.title, sd.summary, sd.source_url, sd.source_name,
      sd.trust_label, sd.fetched_at, sd.updated_at, sd.search_vector
    from public.search_documents sd
    where sd.mode = p_mode and sd.access_scope = 'public'
      and p_mode in ('research', 'trade', 'culture')
  ),
  matched as (
    select
      c.code, c.title, c.summary, c.source_url, c.source_name, c.trust_label, c.fetched_at, c.updated_at,
      case
        when p_query is null or btrim(p_query) = '' then 0::real
        else ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))
      end as rank
    from candidates c
    where exists (
      select 1 from public.country_profiles cp
      where cp.country_code = c.code and cp.publish_status = 'published'
    )
    and (
      p_query is null or btrim(p_query) = ''
      or c.search_vector @@ websearch_to_tsquery('simple', p_query)
    )
  )
  select
    code, title, summary, source_url, source_name, trust_label, fetched_at,
    rank, count(*) over () as total_count
  from matched
  order by rank desc, updated_at desc, code
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, least(coalesce(p_offset, 0), 2000));
$$;

revoke execute on function public.search_country_intel(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_country_intel(text, text, integer, integer) to service_role;
