-- Run in Supabase → SQL Editor. Read-only checks — does not change data.
-- If rows show ❌ for 021-027 only, run APPLY_MIGRATIONS_021_027.sql (NOT the full APPLY_ALL from line 1).
-- If many core tables are missing, run APPLY_ALL_PHASE_ONE.sql on a fresh project only.

select * from (
  select 'country_profiles' as object,
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'country_profiles'
    ) then '✅ OK' else '❌ MISSING — run 001 + 009' end as status
  union all
  select 'businesses',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'businesses'
    ) then '✅ OK' else '❌ MISSING — run 005' end
  union all
  select 'business_members',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'business_members'
    ) then '✅ OK' else '❌ MISSING — run 005' end
  union all
  select 'business_documents (uploads)',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'business_documents'
    ) then '✅ OK' else '❌ MISSING — run 017' end
  union all
  select 'business_kebu_records',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'business_kebu_records'
    ) then '✅ OK' else '❌ MISSING — run 021' end
  union all
  select 'projects',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'projects'
    ) then '✅ OK' else '❌ MISSING — run 004 + 008' end
  union all
  select 'deployments',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'deployments'
    ) then '✅ OK' else '❌ MISSING — run 008' end
  union all
  select 'site_domains',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'site_domains'
    ) then '✅ OK' else '❌ MISSING — run 008' end
  union all
  select 'site_domains.status column',
    case when exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'site_domains' and column_name = 'status'
    ) then '✅ OK' else '❌ MISSING — run 015' end
  union all
  select 'site_subscriptions (JOKO billing)',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'site_subscriptions'
    ) then '✅ OK' else '❌ MISSING — run 010' end
  union all
  select 'user_profiles',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'user_profiles'
    ) then '✅ OK' else '❌ MISSING — run 001' end
  union all
  select 'Senegal country profile (Opportunity OS)',
    case when exists (
      select 1 from public.country_profiles where country_code = 'SN'
    ) then '✅ OK' else '❌ MISSING — run 009' end
  union all
  select 'storage bucket: site-assets',
    case when exists (
      select 1 from storage.buckets where id = 'site-assets'
    ) then '✅ OK' else '❌ MISSING — run 023' end
  union all
  select 'project_products',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'project_products'
    ) then '✅ OK' else '❌ MISSING — run 022' end
  union all
  select 'opportunity_profiles',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'opportunity_profiles'
    ) then '✅ OK' else '❌ MISSING — run 026' end
  union all
  select 'afrique_ids',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'afrique_ids'
    ) then '✅ OK' else '❌ MISSING — run 027' end
  union all
  select 'builder section types (028)',
    case when exists (
      select 1 from public.builder_schema_meta
      where key = 'website_builder_version' and value::int >= 28
    ) then '✅ OK' else '❌ MISSING — run 028' end
  union all
  select 'site media + canvas (029)',
    case when exists (
      select 1 from public.builder_schema_meta
      where key = 'website_builder_version' and value::int >= 29
    ) then '✅ OK' else '❌ MISSING — run 029 (see VERIFY_SECTION_TYPES.sql if constraint fails)' end
  union all
  select 'kdirection section types (031)',
    case when exists (
      select 1 from public.builder_schema_meta
      where key = 'website_builder_version' and value::int >= 31
    ) then '✅ OK' else '❌ MISSING — run 031_kdirection_section_types.sql or FIX_SECTION_TYPES_031.sql' end
  union all
  select 'site_analytics_events (032)',
    case when exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'site_analytics_events'
    ) then '✅ OK' else '❌ MISSING — run 032_site_analytics.sql' end
) checks
order by object;
