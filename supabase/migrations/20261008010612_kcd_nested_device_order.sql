-- Extend native responsive keys without changing legacy types or permissions.
begin;
update public.kcd_node_types set overridable = (
  select array_agg(distinct key order by key)
  from unnest(overridable || array['childOrder']) as keys(key)
) where type in ('section','group') and version = 1;
-- Preserve the compare-and-publish transaction and service-only grants; accept renderer 5.
create or replace function public.publish_kcd_document(p_project_id uuid,p_owner_id uuid,p_subdomain text,p_source jsonb,p_snapshot jsonb,p_canonical_payload text)
returns jsonb language plpgsql security invoker set search_path=public,extensions,pg_temp as $$
declare v_hash text; v_id uuid; v_time timestamptz:=now(); v_version integer;
begin
 if length(p_subdomain) not between 3 and 48 or p_subdomain !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid subdomain' using errcode='22023'; end if;
 perform 1 from public.projects where id=p_project_id and owner_id=p_owner_id and document_schema_version='kcd-1' for update;
 if not found then raise exception 'Project not found' using errcode='42501'; end if;
 if public.kcd_publish_source(p_project_id,p_owner_id) is distinct from p_source then raise exception 'Draft changed; retry publishing' using errcode='40001'; end if;
 v_hash:=encode(digest(p_canonical_payload,'sha256'),'hex');
 if p_snapshot->>'format' is distinct from 'kcd-1' or p_snapshot->'document'->>'id' is distinct from p_project_id::text or (p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":2}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":3}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":4}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":5}'::jsonb) or p_snapshot->>'contentHash' is distinct from v_hash or p_canonical_payload::jsonb is distinct from p_snapshot-'contentHash' then raise exception 'Invalid published envelope' using errcode='22023'; end if;
 if p_snapshot->>'publishedAt' is null then raise exception 'Missing published time' using errcode='22023'; end if;
 perform (p_snapshot->>'publishedAt')::timestamptz;
 perform pg_advisory_xact_lock(hashtextextended('kcd-domain:'||p_subdomain,0));
 if exists(select 1 from public.projects where subdomain=p_subdomain and id<>p_project_id) or exists(select 1 from public.deployments where subdomain=p_subdomain and project_id<>p_project_id and status in('live','suspended')) then raise exception 'Subdomain already published' using errcode='23505'; end if;
 update public.deployments set status='superseded' where project_id=p_project_id and status in('live','suspended');
 insert into public.deployments(project_id,subdomain,snapshot,schema_version,content_hash,status,published_by,public_path,published_at)
 values(p_project_id,p_subdomain,p_snapshot,'kcd-1',v_hash,'live',p_owner_id,'/sites/'||p_subdomain,v_time) returning id into v_id;
 update public.projects set status='published',subdomain=p_subdomain,published_at=v_time,updated_at=v_time where id=p_project_id;
 select coalesce(max(version_number),0)+1 into v_version from public.website_versions where project_id=p_project_id;
 insert into public.website_versions(project_id,version_number,label,snapshot,created_by) values(p_project_id,v_version,'Published',p_snapshot,p_owner_id);
 return jsonb_build_object('deploymentId',v_id,'publicPath','/sites/'||p_subdomain,'contentHash',v_hash);
end $$;
revoke all on function public.publish_kcd_document(uuid,uuid,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.publish_kcd_document(uuid,uuid,text,jsonb,jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
