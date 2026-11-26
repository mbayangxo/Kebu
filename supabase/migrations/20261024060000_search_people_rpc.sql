-- Live-enforced, ranked, paginated People & Talent Search -- mirrors
-- public.search_products() exactly: live-joins every candidate to the real
-- developer_profiles row on every call, requiring status = 'approved'.
-- A developer who is suspended, rejected, or still pending never appears
-- here, regardless of how stale search_documents is.
create or replace function public.search_people(
  p_query text default null,
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
      sd.entity_id::uuid as pid, sd.title, sd.summary, sd.source_url, sd.source_name,
      sd.trust_label, sd.fetched_at, sd.updated_at, sd.search_vector
    from public.search_documents sd
    where sd.mode = 'people' and sd.access_scope = 'public'
  ),
  matched as (
    select
      c.pid, c.title, c.summary, c.source_url, c.source_name, c.trust_label, c.fetched_at, c.updated_at,
      case
        when p_query is null or btrim(p_query) = '' then 0::real
        else ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))
      end as rank
    from candidates c
    where exists (
      select 1 from public.developer_profiles dp
      where dp.id = c.pid and dp.status = 'approved'
    )
    and (
      p_query is null or btrim(p_query) = ''
      or c.search_vector @@ websearch_to_tsquery('simple', p_query)
    )
  )
  select
    pid, title, summary, source_url, source_name, trust_label, fetched_at,
    rank, count(*) over () as total_count
  from matched
  order by rank desc, updated_at desc, pid
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, least(coalesce(p_offset, 0), 2000));
$$;

revoke execute on function public.search_people(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_people(text, integer, integer) to service_role;
