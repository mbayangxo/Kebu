-- Read-only release inventory. Uses catalogs only: no user rows, application
-- RPC execution, writes, migration repair, cron changes, or provider calls.
-- A matching schema does not certify JWT/RLS behavior or authorize promotion.
with required_tables(name) as (values
  ('projects'), ('project_pages'), ('project_sections'), ('kcd_node_types'),
  ('creative_op_journal'), ('website_versions'), ('deployments'),
  ('mailboxes'), ('mail_messages'), ('mail_threads'), ('mail_attachments'),
  ('mail_forwarding_rules'), ('search_documents'), ('network_profiles'),
  ('personal_connections'), ('worker_profiles'), ('job_listings'),
  ('developer_profiles'), ('marketplace_templates'), ('aesthetic_library'),
  ('marketplace_creative_assets'), ('creative_asset_library')
), table_checks as (
  select 'table:' || required_tables.name as requirement,
    c.oid is not null and coalesce(c.relrowsecurity, false) as passed,
    jsonb_build_object('present', c.oid is not null, 'rlsEnabled', c.relrowsecurity) as details
  from required_tables
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c on c.relnamespace = n.oid
    and c.relname = required_tables.name and c.relkind in ('r', 'p')
), required_columns(table_name, column_name) as (values
  ('projects', 'document_schema_version'),
  ('project_sections', 'node_version'), ('project_sections', 'parent_id'),
  ('project_sections', 'order_key'), ('project_sections', 'type_version'),
  ('project_pages', 'layout_version'), ('create_designs', 'updated_at'),
  ('creative_asset_library', 'provider_reference'),
  ('creative_asset_library', 'provider'),
  ('aesthetic_library', 'provider_reference'), ('aesthetic_library', 'provider')
), column_checks as (
  select 'column:' || r.table_name || '.' || r.column_name as requirement,
    exists(select 1 from information_schema.columns c where c.table_schema = 'public'
      and c.table_name = r.table_name and c.column_name = r.column_name) as passed,
    '{}'::jsonb as details
  from required_columns r
), required_functions(signature, authenticated_execute) as (values
  ('public.kcd_operation_protocol()', true),
  ('public.apply_node_ops(uuid,jsonb)', true),
  ('public.apply_experience_plan(uuid,jsonb)', true),
  ('public.publish_kcd_document(uuid,uuid,text,jsonb,jsonb,text)', false)
), function_inventory as (
  select *, to_regprocedure(signature) as routine from required_functions
), function_checks as (
  select 'function:' || signature as requirement,
    routine is not null
      and not coalesce(has_function_privilege('anon', routine, 'EXECUTE'), true)
      and coalesce(has_function_privilege('authenticated', routine, 'EXECUTE') = authenticated_execute, false)
      as passed,
    jsonb_build_object('present', routine is not null,
      'anonExecute', has_function_privilege('anon', routine, 'EXECUTE'),
      'authenticatedExecute', has_function_privilege('authenticated', routine, 'EXECUTE'),
      'serviceExecute', has_function_privilege('service_role', routine, 'EXECUTE')) as details
  from function_inventory
), checks as (
  select * from table_checks union all select * from column_checks union all select * from function_checks
)
select jsonb_build_object(
  'scope', 'schema-and-grants-only',
  'observedAt', statement_timestamp(),
  'postgresVersion', current_setting('server_version'),
  'schemaChecksPassed', (select bool_and(passed) from checks),
  'failedChecks', (select count(*) from checks where not passed),
  'checks', (select jsonb_agg(jsonb_build_object('requirement', requirement, 'passed', passed, 'details', details) order by requirement) from checks),
  'authenticatedAcceptance', 'not-established-by-this-query',
  'releaseCertification', 'not-established-by-this-query'
) as hosted_release_preflight;
