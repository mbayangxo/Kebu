-- READ ONLY. Run on the explicitly selected QA target. No DDL, account data or secrets.
-- This inventories presence and selected shape only; a green result is NOT full acceptance.
begin read only;
with required_tables(name) as (values
 ('business_members'),('business_invites'),('workspace_items'),('library_nodes'),('rooms'),('room_members'),
 ('sheet_bodies'),('slide_bodies'),('cloud_deployments'),('cloud_deployment_versions'),
 ('room_calls'),('room_call_participants'),('kebu_builtin_app_installs'),('job_listings'),('job_applications'),
 ('business_employer_verifications'),('liguey_interviews'),('company_projects'),('company_project_tasks'),
 ('company_learning_modules'),('company_learning_assignments'),('company_hr_requests'),('company_shifts'),
 ('company_benefits'),('company_pay_preferences'),('company_pay_statements'))
select current_database() as database_name,r.name,c.oid is not null as present,c.relrowsecurity as rls_enabled,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=r.name) as policy_count,
 (select jsonb_agg(a.attname order by a.attnum) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as columns
from required_tables r left join pg_class c on c.oid=to_regclass('public.'||r.name)
order by r.name;
with required_functions(signature) as (values
 ('public.accept_business_invite(text)'),('public.can_access_room(uuid)'),('public.room_call_join(uuid,integer)'),
 ('public.company_portal_action(uuid,text,jsonb)'),('public.company_prepare_hire(uuid)'),('public.company_portfolio()'),
 ('public.liguey_review_employer(uuid,timestamp with time zone,text,boolean,boolean,boolean,text)'))
select signature,to_regprocedure(signature) is not null as present from required_functions order by signature;
select version,name from supabase_migrations.schema_migrations order by version;
rollback;
