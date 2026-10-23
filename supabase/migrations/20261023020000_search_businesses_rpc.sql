-- Live-enforced, ranked Business Search.
--
-- The previous slice read search_documents directly, trusting the cached
-- index's access_scope alone. That left a real staleness window: a business
-- that moved from active to draft/suspended/archived, or was deleted
-- outright, stayed publicly discoverable until the next index refresh ran.
-- This function closes that window by joining to the live businesses row on
-- every call — there is no way to get a result for a business that isn't
-- active right now, regardless of how stale search_documents is.
--
-- It also adds real relevance ranking (ts_rank) with a deterministic
-- tie-break, replacing a plain filter-only textSearch call that never
-- ordered results at all.
create or replace function public.search_businesses(p_query text default null, p_country text default null)
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
  rank real
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
  )
  select
    c.business_id, c.title, c.summary, c.source_url, c.source_name, c.trust_label,
    c.category, c.country_code, c.fetched_at,
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
  order by rank desc, c.updated_at desc, c.business_id  -- deterministic: rank ties never reorder between calls
  limit 20;
$$;

-- Supabase grants EXECUTE on new public functions to anon/authenticated by
-- default (see 20260925012420_revoke_anon_builder_rpcs.sql for the same
-- issue on the Builder RPCs). This function only needs to be callable from
-- the server-side admin client in app/api/search/businesses — same posture
-- as search_documents itself (service-role only).
revoke execute on function public.search_businesses(text, text) from public, anon, authenticated;
grant execute on function public.search_businesses(text, text) to service_role;
