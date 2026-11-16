-- READ-ONLY PRECONDITION CHECK. Does not apply or repair migrations.
-- Run against the intended QA database before considering the four Nov 12 files.
begin read only;
do $$ declare t text; missing text[]:='{}';begin
 foreach t in array array['public.sheet_bodies','public.slide_bodies','public.workspace_items','public.cloud_deployments','public.cloud_deployment_versions','public.room_calls','public.room_call_participants','realtime.messages'] loop
  if to_regclass(t) is null then missing:=array_append(missing,t);end if;
 end loop;
 if cardinality(missing)>0 then raise exception 'Migration prerequisites missing: %',array_to_string(missing,', ');end if;
 if to_regprocedure('public.can_access_room(uuid)') is null or to_regprocedure('realtime.topic()') is null then raise exception 'Room/Realtime authorization prerequisites missing';end if;
end $$;
select 'invalid_cloud_prefixes' as check_name,count(*) as failures from public.cloud_deployment_versions where storage_prefix is distinct from deployment_id::text||'/'||id::text
union all select 'foreign_cloud_live_versions',count(*) from public.cloud_deployments d join public.cloud_deployment_versions v on v.id=d.live_version_id where v.deployment_id<>d.id;
select schemaname,tablename,policyname,cmd,roles,qual,with_check from pg_policies where schemaname='realtime' and tablename='messages';
select version,name from supabase_migrations.schema_migrations where name ~ '(editor_revision|document_collaboration|cloud_deployment_version|private_room_call)' order by version;
rollback;
