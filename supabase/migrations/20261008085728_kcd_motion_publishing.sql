-- Forward local motion publication support; existing service-only grants preserved.
begin;
-- Insertion and restoration share this packing boundary. Legacy payloads retain their original contract.
create or replace function public.kcd__stored_props(p_node jsonb, p_op int)
returns jsonb language plpgsql immutable security invoker set search_path=public,pg_temp as $$
declare
  props jsonb := p_node -> 'props';
  ov jsonb := coalesce(p_node -> 'overrides', '{}'::jsonb);
  bucket jsonb := '{}'::jsonb;
  k text;
begin
  if p_node->>'type' in ('section','group','text','image') then
    if (p_node ? 'motion' and jsonb_typeof(p_node->'motion')='null') or (p_node ? 'interaction' and jsonb_typeof(p_node->'interaction')='null') then perform public.kcd__fail('KCD_INVALID','Native node effects cannot be null',p_op); end if;
    perform public.kcd__native_effect(p_node->'motion',false,p_op);
    perform public.kcd__native_effect(p_node->'interaction',true,p_op);
  end if;
  for k in select jsonb_object_keys(p_node) loop
    if k not in ('id', 'type', 'typeVersion', 'pageId', 'parentId', 'orderKey', 'props', 'overrides', 'responsiveState',
                 'visibility', 'a11y', 'motion', 'interaction', 'dataBinding', 'locked', 'unknown', 'version') then
      perform public.kcd__fail('KCD_INVALID', format('Unknown element field "%s"', k), p_op);
    end if;
  end loop;
  if p_node ? 'unknown' and jsonb_typeof(p_node -> 'unknown') = 'object' and p_node -> 'unknown' <> '{}'::jsonb then
    perform public.kcd__fail('KCD_INVALID', 'Elements with unrecognized data cannot be stored', p_op);
  end if;
  if props is null or jsonb_typeof(props) <> 'object' then perform public.kcd__fail('KCD_INVALID', 'props must be an object', p_op); end if;
  for k in select jsonb_object_keys(props) loop
    if k in ('deviceOverrides', '_motion', '_a11y', '_visibility', '_interaction', '_dataBinding', '_locked', '__proto__', 'prototype', 'constructor') then
      perform public.kcd__fail('KCD_INVALID', format('Invalid prop key "%s"', k), p_op);
    end if;
  end loop;
  if jsonb_typeof(ov) <> 'object' then perform public.kcd__fail('KCD_INVALID', 'overrides must be an object', p_op); end if;
  for k in select jsonb_object_keys(ov) loop
    if k not in ('tablet', 'mobile') then perform public.kcd__fail('KCD_INVALID', format('Unknown device "%s"', k), p_op); end if;
    if jsonb_typeof(ov -> k) <> 'object' then perform public.kcd__fail('KCD_INVALID', 'Device overrides must be objects', p_op); end if;
    bucket := bucket || jsonb_build_object(k, ov -> k);
  end loop;
  if p_node ? 'responsiveState' then bucket := bucket || jsonb_build_object('_state', p_node -> 'responsiveState'); end if;
  if bucket <> '{}'::jsonb then props := props || jsonb_build_object('deviceOverrides', bucket); end if;
  if p_node ? 'motion'      then props := props || jsonb_build_object('_motion', p_node -> 'motion'); end if;
  if p_node ? 'a11y'        then props := props || jsonb_build_object('_a11y', p_node -> 'a11y'); end if;
  if p_node ? 'visibility'  then props := props || jsonb_build_object('_visibility', p_node -> 'visibility'); end if;
  if p_node ? 'interaction' then props := props || jsonb_build_object('_interaction', p_node -> 'interaction'); end if;
  if p_node ? 'dataBinding' then props := props || jsonb_build_object('_dataBinding', p_node -> 'dataBinding'); end if;
  if p_node ? 'locked' then
    if jsonb_typeof(p_node -> 'locked') <> 'boolean' then perform public.kcd__fail('KCD_INVALID', 'locked must be a boolean', p_op); end if;
    props := props || jsonb_build_object('_locked', p_node -> 'locked');
  end if;
  if octet_length(props::text) > 320 * 1024 then
    perform public.kcd__fail('KCD_LIMIT', format('Element %s is too large', p_node ->> 'id'), p_op);
  end if;
  return props;
end $$;

-- Preserve the compare-and-publish transaction and service-only grants; accept renderer 7.
create or replace function public.publish_kcd_document(p_project_id uuid,p_owner_id uuid,p_subdomain text,p_source jsonb,p_snapshot jsonb,p_canonical_payload text)
returns jsonb language plpgsql security invoker set search_path=public,extensions,pg_temp as $$
declare v_hash text; v_id uuid; v_time timestamptz:=now(); v_version integer;
begin
 if length(p_subdomain) not between 3 and 48 or p_subdomain !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid subdomain' using errcode='22023'; end if;
 perform 1 from public.projects where id=p_project_id and owner_id=p_owner_id and document_schema_version='kcd-1' for update;
 if not found then raise exception 'Project not found' using errcode='42501'; end if;
 if public.kcd_publish_source(p_project_id,p_owner_id) is distinct from p_source then raise exception 'Draft changed; retry publishing' using errcode='40001'; end if;
 v_hash:=encode(digest(p_canonical_payload,'sha256'),'hex');
 if p_snapshot->>'format' is distinct from 'kcd-1' or p_snapshot->'document'->>'id' is distinct from p_project_id::text or (p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":2}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":3}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":4}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":5}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":6}'::jsonb and p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":7}'::jsonb) or p_snapshot->>'contentHash' is distinct from v_hash or p_canonical_payload::jsonb is distinct from p_snapshot-'contentHash' then raise exception 'Invalid published envelope' using errcode='22023'; end if;
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
