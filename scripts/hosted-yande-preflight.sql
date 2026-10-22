-- Read-only catalog checks. No user rows, application RPC execution or writes.
-- Passing these checks cannot certify hosted authentication or permit rollout.
with required_tables(name) as (values
  ('account_ai_usage_events'), ('studio_generation_runs'),
  ('studio_campaign_projects'), ('yande_interactions')
), table_inventory as (
  select name, to_regclass('public.' || name) as relation from required_tables
), table_checks as (
  select 'table:' || name as requirement,
    relation is not null and coalesce(c.relrowsecurity, false) as passed,
    jsonb_build_object('present', relation is not null, 'rlsEnabled', c.relrowsecurity) as details
  from table_inventory left join pg_class c on c.oid = relation
), reservation as (
  select to_regprocedure('public.reserve_account_ai_generation(uuid,uuid,uuid,integer,text)') as routine
), function_check as (
  select 'function:reserve_account_ai_generation' as requirement,
    routine is not null and not coalesce(p.prosecdef, true)
      and coalesce(has_function_privilege('service_role', routine, 'EXECUTE'), false)
      and not coalesce(has_function_privilege('anon', routine, 'EXECUTE'), true)
      and not coalesce(has_function_privilege('authenticated', routine, 'EXECUTE'), true) as passed,
    jsonb_build_object('present', routine is not null, 'securityDefiner', p.prosecdef,
      'serviceExecute', has_function_privilege('service_role', routine, 'EXECUTE'),
      'anonExecute', has_function_privilege('anon', routine, 'EXECUTE'),
      'authenticatedExecute', has_function_privilege('authenticated', routine, 'EXECUTE')) as details
  from reservation left join pg_proc p on p.oid = routine
), protected_tables(name) as (values ('account_ai_usage_events'), ('yande_interactions')),
privilege_inventory as (
  select name, to_regclass('public.' || name) as relation from protected_tables
), privilege_checks as (
  select 'grants:' || name as requirement,
    relation is not null
      and coalesce(has_table_privilege('service_role', relation, 'INSERT'), false)
      and coalesce(has_table_privilege('authenticated', relation, 'SELECT'), false)
      and (name = 'account_ai_usage_events' or not coalesce(has_table_privilege('anon', relation, 'SELECT'), true))
      and not coalesce(has_table_privilege('anon', relation, 'INSERT,UPDATE,DELETE,TRUNCATE'), true)
      and not coalesce(has_table_privilege('authenticated', relation, 'INSERT,UPDATE,DELETE,TRUNCATE'), true) as passed,
    jsonb_build_object('present', relation is not null,
      'serviceInsert', has_table_privilege('service_role', relation, 'INSERT'),
      'authenticatedSelect', has_table_privilege('authenticated', relation, 'SELECT'),
      'anonSelect', has_table_privilege('anon', relation, 'SELECT'),
      'anonAnyWrite', has_table_privilege('anon', relation, 'INSERT,UPDATE,DELETE,TRUNCATE'),
      'authenticatedAnyWrite', has_table_privilege('authenticated', relation, 'INSERT,UPDATE,DELETE,TRUNCATE')) as details
  from privilege_inventory
), checks as (
  select * from table_checks union all select * from function_check union all select * from privilege_checks
)
select jsonb_build_object('scope', 'yande-schema-and-grants-only',
  'observedAt', statement_timestamp(), 'checksPassed', (select bool_and(passed) from checks),
  'failedChecks', (select count(*) from checks where not passed),
  'checks', (select jsonb_agg(jsonb_build_object('requirement', requirement, 'passed', passed, 'details', details) order by requirement) from checks),
  'authenticatedAcceptance', 'not-established-by-this-query',
  'releaseCertification', 'not-established-by-this-query') as yande_release_preflight;
