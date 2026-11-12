-- =============================================================================
-- VERIFY_KEBU_SCHEMA.sql — paste in Supabase SQL Editor (read-only)
-- Shows: expected Kebu tables OK/MISSING + extra public tables (possible RECT)
-- =============================================================================

-- A) Expected Kebu tables (foundation + pending + shop + agency)
with expected(name, apply_hint) as (
  values
    -- Foundation (APPLY_ALL_PHASE_ONE)
    ('user_profiles', 'APPLY_ALL_PHASE_ONE'),
    ('opportunities', 'APPLY_ALL_PHASE_ONE'),
    ('saved_opportunities', 'APPLY_ALL_PHASE_ONE'),
    ('country_profiles', 'APPLY_ALL_PHASE_ONE'),
    ('country_ai_analyses', 'APPLY_ALL_PHASE_ONE'),
    ('projects', 'APPLY_ALL_PHASE_ONE'),
    ('project_pages', 'APPLY_ALL_PHASE_ONE'),
    ('project_sections', 'APPLY_ALL_PHASE_ONE'),
    ('businesses', 'APPLY_ALL_PHASE_ONE'),
    ('business_members', 'APPLY_ALL_PHASE_ONE'),
    ('business_audit_logs', 'APPLY_ALL_PHASE_ONE'),
    ('business_create_idempotency', 'APPLY_ALL_PHASE_ONE'),
    ('kebu_ids', 'APPLY_ALL_PHASE_ONE'),
    ('business_owners', 'APPLY_ALL_PHASE_ONE'),
    ('business_status_history', 'APPLY_ALL_PHASE_ONE'),
    ('registration_progress', 'APPLY_ALL_PHASE_ONE'),
    ('business_readiness_scores', 'APPLY_ALL_PHASE_ONE'),
    ('site_templates', 'APPLY_ALL_PHASE_ONE'),
    ('site_template_versions', 'APPLY_ALL_PHASE_ONE'),
    ('website_versions', 'APPLY_ALL_PHASE_ONE'),
    ('deployments', 'APPLY_ALL_PHASE_ONE'),
    ('site_domains', 'APPLY_ALL_PHASE_ONE'),
    ('website_assets', 'APPLY_ALL_PHASE_ONE'),
    ('site_subscriptions', 'APPLY_ALL_PHASE_ONE'),
    ('template_purchases', 'APPLY_ALL_PHASE_ONE'),
    ('builder_schema_meta', 'APPLY_ALL_PHASE_ONE'),
    ('site_health_checks', 'APPLY_ALL_PHASE_ONE'),
    ('site_analytics_events', 'APPLY_ALL_PHASE_ONE'),
    ('developer_profiles', 'APPLY_ALL_PHASE_ONE'),
    ('marketplace_templates', 'APPLY_ALL_PHASE_ONE'),
    ('business_documents', 'APPLY_ALL_PHASE_ONE'),
    ('business_kebu_records', 'APPLY_ALL_PHASE_ONE'),
    ('project_products', 'APPLY_ALL_PHASE_ONE'),
    ('create_designs', 'APPLY_ALL_PHASE_ONE'),
    ('business_b2b_profiles', 'APPLY_ALL_PHASE_ONE'),
    ('business_email_subscribers', 'APPLY_ALL_PHASE_ONE'),
    ('business_email_campaigns', 'APPLY_ALL_PHASE_ONE'),
    ('business_email_campaign_recipients', 'APPLY_ALL_PHASE_ONE'),
    ('opportunity_profiles', 'APPLY_ALL_PHASE_ONE'),
    ('opportunity_stories', 'APPLY_ALL_PHASE_ONE'),
    ('afrique_ids', 'APPLY_ALL_PHASE_ONE'),
    -- Pending / extras
    ('project_themes', 'APPLY_ALL_PENDING_ONCE / 033'),
    ('aesthetic_library', '040_aesthetics_marketplace'),
    -- Shop (APPLY_SHOP_ORDERS)
    ('shop_orders', 'APPLY_SHOP_ORDERS'),
    ('shop_order_items', 'APPLY_SHOP_ORDERS'),
    ('shop_order_counters', 'APPLY_SHOP_ORDERS'),
    ('shop_customers', 'APPLY_SHOP_ORDERS'),
    ('shop_customer_profiles', 'APPLY_SHOP_ORDERS'),
    ('shop_discount_codes', 'APPLY_SHOP_ORDERS'),
    ('shop_cart_drafts', 'APPLY_SHOP_ORDERS'),
    ('shop_wishlists', 'APPLY_SHOP_ORDERS'),
    ('shop_message_threads', 'APPLY_SHOP_ORDERS'),
    ('shop_messages', 'APPLY_SHOP_ORDERS'),
    -- Events / invoices / team
    ('business_events', '052_business_events'),
    ('event_ticket_types', '052_business_events'),
    ('event_registrations', '052_business_events'),
    ('business_invoices', '053_business_invoices_contracts'),
    ('business_invoice_lines', '053_business_invoices_contracts'),
    ('business_contracts', '053_business_invoices_contracts'),
    ('business_launch_plans', '053_business_invoices_contracts'),
    ('business_invites', '055_team_invites'),
    -- Agency
    ('business_artists', 'APPLY_AGENCY_056_058'),
    ('business_press_kits', 'APPLY_AGENCY_056_058'),
    ('business_artist_campaigns', 'APPLY_AGENCY_056_058'),
    ('business_artist_media', 'APPLY_AGENCY_056_058')
)
select
  e.name as object,
  e.apply_hint,
  case
    when to_regclass('public.' || e.name) is not null then 'OK'
    else 'MISSING'
  end as status
from expected e
order by
  case when to_regclass('public.' || e.name) is null then 0 else 1 end,
  e.name;

-- B) Extra public tables (not in Kebu expected list above) — review for RECT leftovers
-- Run as a second query if your editor only shows one result set:
/*
with expected(name) as (
  select unnest(array[
    'user_profiles','opportunities','saved_opportunities','country_profiles','country_ai_analyses',
    'projects','project_pages','project_sections','businesses','business_members','business_audit_logs',
    'business_create_idempotency','kebu_ids','business_owners','business_status_history',
    'registration_progress','business_readiness_scores','site_templates','site_template_versions',
    'website_versions','deployments','site_domains','website_assets','site_subscriptions',
    'template_purchases','builder_schema_meta','site_health_checks','site_analytics_events',
    'developer_profiles','marketplace_templates','business_documents','business_kebu_records',
    'project_products','create_designs','business_b2b_profiles','business_email_subscribers',
    'business_email_campaigns','business_email_campaign_recipients','opportunity_profiles',
    'opportunity_stories','afrique_ids','project_themes','aesthetic_library','shop_orders',
    'shop_order_items','shop_order_counters','shop_customers','shop_customer_profiles',
    'shop_discount_codes','shop_cart_drafts','shop_wishlists','shop_message_threads','shop_messages',
    'business_events','event_ticket_types','event_registrations','business_invoices',
    'business_invoice_lines','business_contracts','business_launch_plans','business_invites',
    'business_artists','business_press_kits','business_artist_campaigns','business_artist_media'
  ])
)
select t.tablename as possible_non_kebu_table
from pg_tables t
where t.schemaname = 'public'
  and t.tablename not in (select name from expected)
order by 1;
*/

-- C) Quick health signals
select 'builder_version' as check_name,
  coalesce(
    (select value from public.builder_schema_meta where key = 'website_builder_version'),
    'MISSING'
  ) as detail
union all
select 'senegal_seed',
  case when exists (select 1 from public.country_profiles where country_code = 'SN')
    then 'OK' else 'MISSING' end
union all
select 'bucket_site_assets',
  case when exists (select 1 from storage.buckets where id = 'site-assets')
    then 'OK' else 'MISSING' end
union all
select 'bucket_business_documents',
  case when exists (select 1 from storage.buckets where id = 'business-documents')
    then 'OK' else 'MISSING' end
union all
select 'section_types_email_popup_allowed',
  case when exists (
    select 1 from pg_constraint
    where conname = 'project_sections_section_type_check'
      and pg_get_constraintdef(oid) like '%email-popup%'
  ) then 'OK' else 'CHECK MISSING OR OLD — run FIX_section_type_check_rerun.sql' end
union all
select 'free_publish_tier_column',
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_subscriptions' and column_name = 'tier'
  ) then 'OK' else 'MISSING — run FIX_free_publish.sql or APPLY_ALL_PENDING_ONCE' end
union all
select 'free_publish_amount_allows_zero',
  case when exists (
    select 1 from pg_constraint
    where conname = 'site_subscriptions_amount_usd_cents_check'
      and pg_get_constraintdef(oid) like '%>= 0%'
  ) then 'OK' else 'MISSING OR OLD (>0) — run FIX_free_publish.sql' end
union all
select 'free_publish_insert_policy_038',
  case when exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'site_subscriptions'
      and policyname = 'Owners insert site subscriptions'
  ) then 'OK' else 'MISSING — run FIX_free_publish.sql (038 RLS)' end;
