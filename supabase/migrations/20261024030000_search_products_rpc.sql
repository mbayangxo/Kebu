-- Live-enforced, ranked, paginated Products Search — mirrors
-- public.search_businesses() exactly, but with two real entity types under
-- one mode: shop_product (project_products, live-joined to its parent
-- project's publish status) and marketplace_template (marketplace_templates,
-- whose status lives on the row itself). Neither entity type can ever be
-- returned once it stops being active/published, regardless of how stale
-- search_documents is — the live join on every call is the security
-- boundary, identical in spirit to search_businesses().
create or replace function public.search_products(
  p_query text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  entity_id uuid,
  entity_type text,
  title text,
  summary text,
  source_url text,
  source_name text,
  trust_label text,
  category text,
  price_label text,
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
      sd.entity_id::uuid as pid, sd.entity_type, sd.title, sd.summary, sd.source_url, sd.source_name,
      sd.trust_label, sd.category, sd.price_label, sd.fetched_at, sd.search_vector, sd.updated_at
    from public.search_documents sd
    where sd.mode = 'products' and sd.access_scope = 'public'
  ),
  matched as (
    select
      c.pid, c.entity_type, c.title, c.summary, c.source_url, c.source_name, c.trust_label,
      c.category, c.price_label, c.fetched_at, c.updated_at,
      case
        when p_query is null or btrim(p_query) = '' then 0::real
        else ts_rank(c.search_vector, websearch_to_tsquery('simple', p_query))
      end as rank
    from candidates c
    where (
      (c.entity_type = 'shop_product' and exists (
        select 1 from public.project_products pp
        join public.projects p on p.id = pp.project_id
        where pp.id = c.pid and pp.is_active and p.status = 'published'
      ))
      or
      (c.entity_type = 'marketplace_template' and exists (
        select 1 from public.marketplace_templates mt
        where mt.id = c.pid and mt.status = 'published'
      ))
    )
    and (
      p_query is null or btrim(p_query) = ''
      or c.search_vector @@ websearch_to_tsquery('simple', p_query)
    )
  )
  select
    pid, entity_type, title, summary, source_url, source_name, trust_label, category, price_label, fetched_at,
    rank, count(*) over () as total_count
  from matched
  order by rank desc, updated_at desc, pid
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, least(coalesce(p_offset, 0), 2000));
$$;

revoke execute on function public.search_products(text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_products(text, integer, integer) to service_role;
