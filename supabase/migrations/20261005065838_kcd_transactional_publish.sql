-- S7: trusted server preflight followed by an atomic compare-and-publish transaction.
-- Browser roles cannot invoke these functions or bypass preflight with direct inserts.
create or replace function public.kcd_publish_source(p_project_id uuid,p_owner_id uuid)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'project',jsonb_build_object('id',p.id,'owner_id',p.owner_id,'title',p.title,'theme',p.theme,'seo',p.seo,'site_chrome',p.site_chrome,'document_schema_version',p.document_schema_version),
 'pages',coalesce((select jsonb_agg(to_jsonb(pg) order by pg.order_key collate "C",pg.id) from public.project_pages pg where pg.project_id=p.id),'[]'::jsonb),
 'sections',coalesce((select jsonb_agg(to_jsonb(s) order by s.id) from public.project_sections s join public.project_pages pg on pg.id=s.page_id where pg.project_id=p.id),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(to_jsonb(pr) order by pr.sort_order,pr.id) from public.project_products pr where pr.project_id=p.id and pr.is_active),'[]'::jsonb))
 from public.projects p where p.id=p_project_id and p.owner_id=p_owner_id and p.document_schema_version='kcd-1';
$$;
revoke all on function public.kcd_publish_source(uuid,uuid) from public,anon,authenticated;
grant execute on function public.kcd_publish_source(uuid,uuid) to service_role;

create or replace function public.kcd_publish_draft_lock() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_old uuid; v_new uuid;
begin
 if tg_table_name='project_sections' then
  if tg_op<>'INSERT' then select project_id into v_old from public.project_pages where id=old.page_id; end if;
  if tg_op<>'DELETE' then select project_id into v_new from public.project_pages where id=new.page_id; end if;
 else
  if tg_op<>'INSERT' then v_old:=old.project_id; end if;
  if tg_op<>'DELETE' then v_new:=new.project_id; end if;
 end if;
 perform 1 from public.projects where id in(v_old,v_new) and document_schema_version='kcd-1' order by id for update;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger kcd_publish_sections_lock before insert or update or delete on public.project_sections for each row execute function public.kcd_publish_draft_lock();
create trigger kcd_publish_products_lock before insert or update or delete on public.project_products for each row execute function public.kcd_publish_draft_lock();

create or replace function public.kcd_native_deployment_guard() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.schema_version='kcd-1' then
  if current_user not in('service_role','postgres') then raise exception 'Native publishing requires server preflight' using errcode='42501'; end if;
  if new.snapshot->>'format' is distinct from 'kcd-1' or new.snapshot->>'contentHash' is distinct from new.content_hash or new.snapshot->'document'->>'id' is distinct from new.project_id::text then raise exception 'Invalid native snapshot' using errcode='22023'; end if;
 elsif exists(select 1 from public.projects where id=new.project_id and document_schema_version='kcd-1') then
  raise exception 'Native drafts cannot use the legacy publisher' using errcode='22023';
 end if;
 return new;
end $$;
create trigger kcd_native_deployment_guard before insert on public.deployments for each row execute function public.kcd_native_deployment_guard();

create or replace function public.kcd_deployments_immutable() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if old.schema_version='kcd-1' then
  if to_jsonb(new)-'status' is distinct from to_jsonb(old)-'status' then raise exception 'Published snapshots are immutable' using errcode='check_violation'; end if;
 elsif new.snapshot is distinct from old.snapshot or new.schema_version is distinct from old.schema_version or new.content_hash is distinct from old.content_hash or new.project_id is distinct from old.project_id then
  raise exception 'Published snapshots are immutable' using errcode='check_violation';
 end if; return new;
end $$;

create or replace function public.publish_kcd_document(p_project_id uuid,p_owner_id uuid,p_subdomain text,p_source jsonb,p_snapshot jsonb,p_canonical_payload text)
returns jsonb language plpgsql security invoker set search_path=public,extensions,pg_temp as $$
declare v_hash text; v_id uuid; v_time timestamptz:=now(); v_version integer;
begin
 if length(p_subdomain) not between 3 and 48 or p_subdomain !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid subdomain' using errcode='22023'; end if;
 perform 1 from public.projects where id=p_project_id and owner_id=p_owner_id and document_schema_version='kcd-1' for update;
 if not found then raise exception 'Project not found' using errcode='42501'; end if;
 if public.kcd_publish_source(p_project_id,p_owner_id) is distinct from p_source then raise exception 'Draft changed; retry publishing' using errcode='40001'; end if;
 v_hash:=encode(digest(p_canonical_payload,'sha256'),'hex');
 if p_snapshot->>'format' is distinct from 'kcd-1' or p_snapshot->'document'->>'id' is distinct from p_project_id::text or p_snapshot->'rendererRequirement' is distinct from '{"renderer":"web-dom","minVersion":2}'::jsonb or p_snapshot->>'contentHash' is distinct from v_hash or p_canonical_payload::jsonb is distinct from p_snapshot-'contentHash' then raise exception 'Invalid published envelope' using errcode='22023'; end if;
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
revoke all on function public.kcd_publish_draft_lock(),public.kcd_native_deployment_guard() from public,anon,authenticated;
notify pgrst,'reload schema';
