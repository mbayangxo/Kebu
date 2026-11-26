-- Local 3E save protocol. No production rollout.
begin;
-- Validate bounded native presets without accepting scripts or arbitrary CSS.
create or replace function public.kcd__native_effect(p_value jsonb,p_interaction boolean,p_i integer)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare k text; v jsonb; allowed text[];
begin
 if p_value is null or jsonb_typeof(p_value)='null' then return; end if;
 allowed:=case when p_interaction then array['version','effect','duration','easing'] else array['version','preset','trigger','duration','delay','distance','easing','enabled','devices'] end;
 if jsonb_typeof(p_value) is distinct from 'object' then perform public.kcd__fail('KCD_INVALID','Invalid native effect',p_i); end if;
 for k in select jsonb_object_keys(p_value) loop
  if not(k=any(allowed)) then perform public.kcd__fail('KCD_INVALID','Unknown native effect field',p_i); end if;
 end loop;
 if p_value->'version' is distinct from '1'::jsonb
 or jsonb_typeof(p_value->'easing') is distinct from 'string'
 or p_value->>'easing' not in('linear','ease','ease-in','ease-out','ease-in-out')
 or jsonb_typeof(p_value->'duration') is distinct from 'number' then perform public.kcd__fail('KCD_INVALID','Invalid native effect',p_i); end if;
 if (p_value->>'duration')::numeric<>trunc((p_value->>'duration')::numeric) or (p_value->>'duration')::numeric not between 50 and (case when p_interaction then 1000 else 5000 end) then perform public.kcd__fail('KCD_INVALID','Invalid effect duration',p_i); end if;
 if p_interaction then
  if jsonb_typeof(p_value->'effect') is distinct from 'string' or p_value->>'effect' not in('lift','grow','dim') then perform public.kcd__fail('KCD_INVALID','Invalid interaction effect',p_i); end if;
 else
  if jsonb_typeof(p_value->'preset') is distinct from 'string' or p_value->>'preset' not in('fade','rise','slide-left','slide-right','zoom')
  or jsonb_typeof(p_value->'trigger') is distinct from 'string' or p_value->>'trigger' not in('load','enter')
  or jsonb_typeof(p_value->'enabled') is distinct from 'boolean'
  or jsonb_typeof(p_value->'delay') is distinct from 'number'
  or jsonb_typeof(p_value->'distance') is distinct from 'number' then perform public.kcd__fail('KCD_INVALID','Invalid motion preset',p_i); end if;
  if (p_value->>'delay')::numeric<>trunc((p_value->>'delay')::numeric) or (p_value->>'delay')::numeric not between 0 and 5000 or (p_value->>'distance')::numeric not between 0 and 200 then perform public.kcd__fail('KCD_INVALID','Invalid motion bounds',p_i); end if;
  if p_value ? 'devices' then
   if jsonb_typeof(p_value->'devices') is distinct from 'object' then perform public.kcd__fail('KCD_INVALID','Invalid motion devices',p_i); end if;
   for k,v in select * from jsonb_each(p_value->'devices') loop
    if k not in('tablet','mobile') or jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'enabled') is distinct from 'boolean' or v-'enabled'<>'{}'::jsonb then perform public.kcd__fail('KCD_INVALID','Invalid motion device override',p_i); end if;
   end loop;
  end if;
 end if;
end $$;
revoke all on function public.kcd__native_effect(jsonb,boolean,integer) from public,anon,authenticated;
create or replace function public.kcd__apply(p_project_id uuid, p_tx jsonb)
returns jsonb language plpgsql as $$
declare
  v_ops      jsonb := p_tx -> 'ops';
  v_expect   jsonb := p_tx -> 'expect';
  v_op       jsonb;
  v_i        int := -1;
  v_name     text;
  v_addr     text[] := '{}';
  v_conf     jsonb := '[]';
  v_touched  uuid[] := '{}';
  v_inserted uuid[] := '{}';
  v_restored jsonb := '{}';
  v_removed  jsonb := '{}';
  v_pages    uuid[] := '{}';
  v_new_pages uuid[] := '{}';
  v_restored_pages jsonb := '{}';
  v_removed_pages jsonb := '{}';
  v_page_data jsonb;
  v_page_row public.project_pages;
  v_slots    text[] := '{}';
  v_rebal    text[] := '{}';
  v_keys     jsonb := '{}';
  v_node     public.project_sections;
  v_rules    public.kcd_node_types;
  v_n        jsonb;
  v_batch    uuid[];
  v_top      uuid;
  v_id       uuid;
  v_parent   uuid;
  v_page     uuid;
  v_segs     text[];
  v_props    jsonb;
  v_bucket   jsonb;
  v_ver      bigint;
  v_type     text;
  v_key      text;
  v_slot     text;
  v_layouts  jsonb;
  v_comp     jsonb;
  v_cur      uuid;
  v_actual   bigint;
  v_versions jsonb := '{}';
  v_k        text;
  v_kids     record;
  v_new      text[];
  v_idx      int;
begin
  perform set_config('kcd.applying', 'on', true);
  set constraints public.project_sections_sibling_order_key deferred;
  set constraints public.project_pages_order_key_unique deferred;
  set constraints public.project_pages_project_id_slug_key deferred;

  -- Expected versions (core addressedIds / checkVersions): every existing node or page addressed.
  for v_op in select * from jsonb_array_elements(v_ops) loop
    v_name := v_op ->> 'op';
    if v_name in ('insertNode', 'insertSubtree', 'restoreSubtree', 'insertPage', 'restorePage') then continue; end if;
    if v_name in ('setDeviceComposition', 'updatePage', 'movePage', 'removePage') then
      if public.kcd__is_uuid(v_op -> 'pageId', false)
         and exists (select 1 from public.project_pages where id = (v_op ->> 'pageId')::uuid and project_id = p_project_id) then
        v_addr := v_addr || (v_op ->> 'pageId');
        if v_name = 'removePage' then v_addr := v_addr || coalesce((select array_agg(id::text) from public.project_sections where page_id = (v_op ->> 'pageId')::uuid), '{}'); end if;
      end if;
    elsif public.kcd__is_uuid(v_op -> 'id', false) and (public.kcd__node(p_project_id, (v_op ->> 'id')::uuid)).id is not null then
      v_addr := v_addr || (v_op ->> 'id');
    end if;
  end loop;
  select coalesce(array_agg(distinct a order by a), '{}') into v_addr from unnest(v_addr) a;
  -- Lock addressed rows in id order (the project row is already locked by the caller).
  perform 1 from public.project_sections where id = any (v_addr::uuid[]) order by id for update;
  perform 1 from public.project_pages    where id = any (v_addr::uuid[]) order by id for update;
  foreach v_k in array v_addr loop
    select node_version into v_actual from public.project_sections where id = v_k::uuid;
    if not found then select layout_version into v_actual from public.project_pages where id = v_k::uuid; end if;
    if not (v_expect ? v_k) then perform public.kcd__fail('KCD_INVALID', format('Missing expected version for %s', v_k)); end if;
    if (v_expect ->> v_k)::bigint <> v_actual then
      v_conf := v_conf || jsonb_build_object('id', v_k, 'expected', (v_expect ->> v_k)::bigint, 'actual', v_actual);
    end if;
  end loop;
  if jsonb_array_length(v_conf) > 0 then
    raise exception using errcode = 'KCCON', message = 'Changed elsewhere — reload to continue', detail = v_conf::text;
  end if;

  for v_op in select * from jsonb_array_elements(v_ops) loop
    v_i := v_i + 1;
    v_name := v_op ->> 'op';

    if v_name in ('insertPage', 'restorePage') then
      v_page_data := v_op -> 'page';
      perform public.kcd__validate_page(v_page_data, v_i);
      v_page := (v_page_data ->> 'id')::uuid;
      if exists(select 1 from public.project_pages where id=v_page) or exists(select 1 from public.project_sections where id=v_page) then perform public.kcd__fail('KCD_INVALID','Page identity already exists',v_i); end if;
      if (select count(*) from public.project_pages where project_id=p_project_id) >= 12 then perform public.kcd__fail('KCD_INVALID','Maximum 12 pages per site',v_i); end if;
      v_ver := 1;
      if v_name = 'insertPage' then
        if not public.kcd__is_uuid(v_page_data->'id',true) or v_removed_pages ? v_page::text or exists(select 1 from public.creative_op_journal where project_id=p_project_id and status='committed' and removed_pages ? v_page::text) then perform public.kcd__fail('KCD_INVALID','New page identity cannot reuse a tombstone',v_i); end if;
        v_new_pages := v_new_pages || v_page;
      else
        if v_removed_pages ? v_page::text then
          v_ver := (v_removed_pages->>v_page::text)::bigint;
          v_removed_pages := v_removed_pages - v_page::text;
        else
          select (removed_pages->>v_page::text)::bigint into v_ver from public.creative_op_journal where project_id=p_project_id and status='committed' and removed_pages ? v_page::text order by id desc limit 1;
        end if;
        if v_ver is null or v_ver <> (v_page_data->>'layoutVersion')::bigint then perform public.kcd__fail('KCD_INVALID','Page must be restored at its recorded version',v_i); end if;
        v_ver := v_ver + 1; v_restored_pages := v_restored_pages || jsonb_build_object(v_page::text,v_ver);
      end if;
      v_layouts := '{}'::jsonb;
      foreach v_key in array array['tablet','mobile'] loop
        if v_page_data->'deviceLayout' ? v_key then v_layouts := v_layouts || jsonb_build_object(v_key,public.kcd__composition(v_page_data->'deviceLayout'->v_key,v_i)); end if;
      end loop;
      insert into public.project_pages(id,project_id,slug,title,sort_order,order_key,layout_version,device_layouts,kcd_unknown)
      values(v_page,p_project_id,v_page_data->>'slug',v_page_data->>'title',0,v_page_data->>'orderKey',v_ver,nullif(v_layouts,'{}'::jsonb),v_page_data->'unknown') returning * into v_page_row;
      if v_name = 'restorePage' then
        v_n := v_op->'nodes';
        if jsonb_typeof(v_n) is distinct from 'array' then perform public.kcd__fail('KCD_INVALID','Restored page elements must be an array',v_i); end if;
      v_batch := '{}';
      v_top := null;
      for v_idx in 0 .. jsonb_array_length(v_n) - 1 loop
        v_op := v_n -> v_idx;
        if jsonb_typeof(v_op) is distinct from 'object' or not public.kcd__is_uuid(v_op -> 'id', false) then
          perform public.kcd__fail('KCD_INVALID', 'Restored elements need their original ids', v_i);
        end if;
        v_id := (v_op ->> 'id')::uuid;
        if exists (select 1 from public.project_pages where id = v_id) or exists (select 1 from public.project_sections where id = v_id) then perform public.kcd__fail('KCD_INVALID', format('Element %s already exists', v_id), v_i); end if;
        if jsonb_typeof(v_op -> 'version') is distinct from 'number' or (v_op ->> 'version')::numeric < 1
           or (v_op ->> 'version')::numeric <> floor((v_op ->> 'version')::numeric) then
          perform public.kcd__fail('KCD_INVALID', 'Restored elements need their recorded version', v_i);
        end if;
        if jsonb_typeof(v_op -> 'orderKey') is distinct from 'string' or not public.kcd_order_key_valid(v_op ->> 'orderKey') then
          perform public.kcd__fail('KCD_INVALID', 'Invalid order key', v_i);
        end if;
        if not public.kcd__is_uuid(v_op -> 'pageId', false) then perform public.kcd__fail('KCD_INVALID', 'pageId must be a UUID', v_i); end if;
        v_page := (v_op ->> 'pageId')::uuid;
        if v_page <> v_page_row.id then perform public.kcd__fail('KCD_INVALID', 'Restored element belongs to another page', v_i); end if;
        v_parent := case when public.kcd__is_uuid(v_op -> 'parentId', false) then (v_op ->> 'parentId')::uuid else null end;
        if v_op -> 'parentId' is not null and jsonb_typeof(v_op -> 'parentId') <> 'null' and v_parent is null then
          perform public.kcd__fail('KCD_INVALID', 'parentId must be a UUID or null', v_i);
        end if;
        v_type := v_op ->> 'type';
        select * into v_rules from public.kcd_node_types where type = v_type;
        if not found then perform public.kcd__fail('KCD_INVALID', format('Unknown element type "%s"', v_type), v_i); end if;
        if v_parent is not null and v_parent = any (v_batch) then
          if (select page_id from public.project_sections where id = v_parent) <> v_page then
            perform public.kcd__fail('KCD_INVALID', 'An element and its parent must be on the same page', v_i);
          end if;
        else
          if v_parent is not null then perform public.kcd__fail('KCD_INVALID', 'Restore page nodes parents first', v_i); end if;
          v_top := v_id;
          perform public.kcd__check_placement(p_project_id, v_page, v_parent, v_type, v_i);
        end if;
        -- Only ids removed in THIS document may come back: in this transaction, or as recorded
        -- by the journal at their removed version.
        if v_removed ? v_id::text then
          v_ver := (v_removed ->> v_id::text)::bigint;
          v_removed := v_removed - v_id::text;
          v_touched := v_touched || v_id;
        else
          select (removed_nodes ->> v_id::text)::bigint into v_ver
          from public.creative_op_journal
          where project_id = p_project_id and status = 'committed' and removed_nodes ? v_id::text
          order by id desc limit 1;
          if v_ver is null then
            perform public.kcd__fail('KCD_INVALID', format('Element %s was not removed from this document', v_id), v_i);
          end if;
          if v_ver <> (v_op ->> 'version')::bigint then
            perform public.kcd__fail('KCD_INVALID', format('Element %s must be restored at its removed version %s', v_id, v_ver), v_i);
          end if;
          v_ver := v_ver + 1;
          v_restored := v_restored || jsonb_build_object(v_id::text, v_ver);
        end if;
        insert into public.project_sections (id, page_id, parent_id, section_type, sort_order, props, order_key, node_version, type_version)
        values (v_id, v_page, v_parent, v_rules.storage_type, 0, public.kcd__stored_props(v_op - 'version', v_i), v_op ->> 'orderKey', v_ver,
                coalesce((v_op ->> 'typeVersion')::int, v_rules.version));
        v_batch := v_batch || v_id;
        v_slots := v_slots || public.kcd__slot(v_page, v_parent);
      end loop;

      end if;
    elsif v_name in ('updatePage','movePage','removePage') then
      if not public.kcd__is_uuid(v_op->'pageId',false) then perform public.kcd__fail('KCD_INVALID','Page id is required',v_i); end if;
      v_page := (v_op->>'pageId')::uuid;
      select * into v_page_row from public.project_pages where id=v_page and project_id=p_project_id;
      if not found then perform public.kcd__fail('KCD_INVALID','Page does not exist',v_i); end if;
      if v_name = 'removePage' then
        if (select count(*) from public.project_pages where project_id=p_project_id) <= 1 then perform public.kcd__fail('KCD_INVALID','Cannot delete the last page',v_i); end if;
        for v_kids in select id,node_version from public.project_sections where page_id=v_page loop
          if v_kids.id = any(v_inserted) then v_inserted := array_remove(v_inserted,v_kids.id);
          elsif v_restored ? v_kids.id::text then v_restored := v_restored-v_kids.id::text;
          else v_removed := v_removed || jsonb_build_object(v_kids.id::text,v_kids.node_version); end if;
          v_touched := array_remove(v_touched,v_kids.id);
        end loop;
        if v_page=any(v_new_pages) then v_new_pages:=array_remove(v_new_pages,v_page);
        elsif v_restored_pages ? v_page::text then v_restored_pages:=v_restored_pages-v_page::text;
        else v_removed_pages:=v_removed_pages || jsonb_build_object(v_page::text,v_page_row.layout_version); end if;
        v_pages:=array_remove(v_pages,v_page);
        delete from public.project_pages where id=v_page;
      elsif v_name = 'movePage' then
        if jsonb_typeof(v_op->'orderKey') is distinct from 'string' or not public.kcd_order_key_valid(v_op->>'orderKey') then perform public.kcd__fail('KCD_INVALID','Invalid page order key',v_i); end if;
        if v_page_row.order_key is distinct from v_op->>'orderKey' then
          update public.project_pages set order_key=v_op->>'orderKey',updated_at=now() where id=v_page;
          v_pages:=v_pages || v_page;
        end if;
      else
        if (v_op ? 'title' and (jsonb_typeof(v_op->'title') is distinct from 'string' or length(btrim(v_op->>'title')) not between 1 and 120)) or (v_op ? 'slug' and (jsonb_typeof(v_op->'slug') is distinct from 'string' or (v_op->>'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_op->>'slug') not between 1 and 60)) then perform public.kcd__fail('KCD_INVALID','Invalid page title or slug',v_i); end if;
        if (v_op ? 'title' and v_page_row.title is distinct from v_op->>'title') or (v_op ? 'slug' and v_page_row.slug is distinct from v_op->>'slug') then
          update public.project_pages set title=coalesce(v_op->>'title',title),slug=coalesce(v_op->>'slug',slug),updated_at=now() where id=v_page;
          v_pages:=v_pages || v_page;
        end if;
      end if;
    elsif v_name in ('insertNode', 'insertSubtree') then
      if v_name = 'insertNode' then
        if jsonb_typeof(v_op -> 'node') is distinct from 'object' then perform public.kcd__fail('KCD_INVALID', 'Element must be an object', v_i); end if;
        v_n := jsonb_build_array((v_op -> 'node') || jsonb_build_object('pageId', v_op -> 'pageId', 'parentId', v_op -> 'parentId', 'orderKey', v_op -> 'orderKey'));
      else
        v_n := v_op -> 'nodes';
        if jsonb_typeof(v_n) is distinct from 'array' or jsonb_array_length(v_n) = 0 then
          perform public.kcd__fail('KCD_INVALID', 'insertSubtree needs at least one element', v_i);
        end if;
      end if;
      v_batch := '{}';
      for v_idx in 0 .. jsonb_array_length(v_n) - 1 loop
        v_op := v_n -> v_idx;
        if jsonb_typeof(v_op) is distinct from 'object' then perform public.kcd__fail('KCD_INVALID', 'Element must be an object', v_i); end if;
        if not public.kcd__is_uuid(v_op -> 'id', true) then perform public.kcd__fail('KCD_INVALID', 'New element ids must be UUID v4', v_i); end if;
        v_id := (v_op ->> 'id')::uuid;
        if exists (select 1 from public.project_pages where id = v_id) or exists (select 1 from public.project_sections where id = v_id) or v_removed ? v_id::text
           or exists (select 1 from public.creative_op_journal where project_id = p_project_id and status = 'committed' and removed_nodes ? v_id::text) then
          perform public.kcd__fail('KCD_INVALID', format('Element id %s is already in use', v_id), v_i);
        end if;
        if jsonb_typeof(v_op -> 'parentId') = 'null' or v_op -> 'parentId' is null then v_parent := null;
        elsif public.kcd__is_uuid(v_op -> 'parentId', false) then v_parent := (v_op ->> 'parentId')::uuid;
        else perform public.kcd__fail('KCD_INVALID', 'parentId must be a UUID or null', v_i);
        end if;
        if v_name = 'insertSubtree' and v_parent is not null and not (v_parent = any (v_batch))
           and exists (select 1 from jsonb_array_elements(v_n) m where m ->> 'id' = v_parent::text) then
          perform public.kcd__fail('KCD_INVALID', 'insertSubtree must list parents before their children', v_i);
        end if;
        if not public.kcd__is_uuid(v_op -> 'pageId', false) then perform public.kcd__fail('KCD_INVALID', 'pageId must be a UUID', v_i); end if;
        v_page := (v_op ->> 'pageId')::uuid;
        v_type := v_op ->> 'type';
        select * into v_rules from public.kcd_node_types where type = v_type;
        if not found then perform public.kcd__fail('KCD_INVALID', format('Unknown element type "%s"', v_type), v_i); end if;
        if (v_op ->> 'typeVersion') is distinct from v_rules.version::text then
          perform public.kcd__fail('KCD_INVALID', format('"%s" must be created at version %s', v_type, v_rules.version), v_i);
        end if;
        if not public.kcd_order_key_valid(v_op ->> 'orderKey') or jsonb_typeof(v_op -> 'orderKey') <> 'string' then
          perform public.kcd__fail('KCD_INVALID', 'Invalid order key', v_i);
        end if;
        perform public.kcd__check_placement(p_project_id, v_page, v_parent, v_type, v_i);
        insert into public.project_sections (id, page_id, parent_id, section_type, sort_order, props, order_key, node_version, type_version)
        values (v_id, v_page, v_parent, v_rules.storage_type, 0, public.kcd__stored_props(v_op, v_i), v_op ->> 'orderKey', 1, v_rules.version);
        v_inserted := v_inserted || v_id;
        v_batch := v_batch || v_id;
        v_slots := v_slots || public.kcd__slot(v_page, v_parent);
      end loop;

    elsif v_name = 'removeNode' then
      if not public.kcd__is_uuid(v_op -> 'id', false) then perform public.kcd__fail('KCD_INVALID', 'Element id is required', v_i); end if;
      v_node := public.kcd__node(p_project_id, (v_op ->> 'id')::uuid);
      if v_node.id is null then perform public.kcd__fail('KCD_INVALID', format('Element %s does not exist', v_op ->> 'id'), v_i); end if;
      for v_kids in
        with recursive sub as (
          select id, node_version from public.project_sections where id = v_node.id
          union all
          select s.id, s.node_version from public.project_sections s join sub on s.parent_id = sub.id
        ) select * from sub
      loop
        if v_kids.id = any (v_inserted) then v_inserted := array_remove(v_inserted, v_kids.id);
        elsif v_restored ? v_kids.id::text then v_restored := v_restored - v_kids.id::text;
        else v_removed := v_removed || jsonb_build_object(v_kids.id::text, v_kids.node_version);
        end if;
        v_touched := array_remove(v_touched, v_kids.id);
      end loop;
      delete from public.project_sections where id = v_node.id;
      v_slots := v_slots || public.kcd__slot(v_node.page_id, v_node.parent_id);

    elsif v_name = 'restoreSubtree' then
      v_n := v_op -> 'nodes';
      if jsonb_typeof(v_n) is distinct from 'array' or jsonb_array_length(v_n) = 0 then
        perform public.kcd__fail('KCD_INVALID', 'restoreSubtree needs at least one element', v_i);
      end if;
      v_batch := '{}';
      v_top := null;
      for v_idx in 0 .. jsonb_array_length(v_n) - 1 loop
        v_op := v_n -> v_idx;
        if jsonb_typeof(v_op) is distinct from 'object' or not public.kcd__is_uuid(v_op -> 'id', false) then
          perform public.kcd__fail('KCD_INVALID', 'Restored elements need their original ids', v_i);
        end if;
        v_id := (v_op ->> 'id')::uuid;
        if exists (select 1 from public.project_pages where id = v_id) or exists (select 1 from public.project_sections where id = v_id) then perform public.kcd__fail('KCD_INVALID', format('Element %s already exists', v_id), v_i); end if;
        if jsonb_typeof(v_op -> 'version') is distinct from 'number' or (v_op ->> 'version')::numeric < 1
           or (v_op ->> 'version')::numeric <> floor((v_op ->> 'version')::numeric) then
          perform public.kcd__fail('KCD_INVALID', 'Restored elements need their recorded version', v_i);
        end if;
        if jsonb_typeof(v_op -> 'orderKey') is distinct from 'string' or not public.kcd_order_key_valid(v_op ->> 'orderKey') then
          perform public.kcd__fail('KCD_INVALID', 'Invalid order key', v_i);
        end if;
        if not public.kcd__is_uuid(v_op -> 'pageId', false) then perform public.kcd__fail('KCD_INVALID', 'pageId must be a UUID', v_i); end if;
        v_page := (v_op ->> 'pageId')::uuid;
        v_parent := case when public.kcd__is_uuid(v_op -> 'parentId', false) then (v_op ->> 'parentId')::uuid else null end;
        if v_op -> 'parentId' is not null and jsonb_typeof(v_op -> 'parentId') <> 'null' and v_parent is null then
          perform public.kcd__fail('KCD_INVALID', 'parentId must be a UUID or null', v_i);
        end if;
        v_type := v_op ->> 'type';
        select * into v_rules from public.kcd_node_types where type = v_type;
        if not found then perform public.kcd__fail('KCD_INVALID', format('Unknown element type "%s"', v_type), v_i); end if;
        if v_parent is not null and v_parent = any (v_batch) then
          if (select page_id from public.project_sections where id = v_parent) <> v_page then
            perform public.kcd__fail('KCD_INVALID', 'An element and its parent must be on the same page', v_i);
          end if;
        else
          if v_top is not null then perform public.kcd__fail('KCD_INVALID', 'restoreSubtree restores exactly one subtree, parents first', v_i); end if;
          v_top := v_id;
          perform public.kcd__check_placement(p_project_id, v_page, v_parent, v_type, v_i);
        end if;
        -- Only ids removed in THIS document may come back: in this transaction, or as recorded
        -- by the journal at their removed version.
        if v_removed ? v_id::text then
          v_ver := (v_removed ->> v_id::text)::bigint;
          v_removed := v_removed - v_id::text;
          v_touched := v_touched || v_id;
        else
          select (removed_nodes ->> v_id::text)::bigint into v_ver
          from public.creative_op_journal
          where project_id = p_project_id and status = 'committed' and removed_nodes ? v_id::text
          order by id desc limit 1;
          if v_ver is null then
            perform public.kcd__fail('KCD_INVALID', format('Element %s was not removed from this document', v_id), v_i);
          end if;
          if v_ver <> (v_op ->> 'version')::bigint then
            perform public.kcd__fail('KCD_INVALID', format('Element %s must be restored at its removed version %s', v_id, v_ver), v_i);
          end if;
          v_ver := v_ver + 1;
          v_restored := v_restored || jsonb_build_object(v_id::text, v_ver);
        end if;
        insert into public.project_sections (id, page_id, parent_id, section_type, sort_order, props, order_key, node_version, type_version)
        values (v_id, v_page, v_parent, v_rules.storage_type, 0, public.kcd__stored_props(v_op - 'version', v_i), v_op ->> 'orderKey', v_ver,
                coalesce((v_op ->> 'typeVersion')::int, v_rules.version));
        v_batch := v_batch || v_id;
        v_slots := v_slots || public.kcd__slot(v_page, v_parent);
      end loop;

    elsif v_name = 'setDeviceComposition' then
      if (v_op ->> 'device') not in ('tablet', 'mobile') or v_op ->> 'device' is null then perform public.kcd__fail('KCD_INVALID', 'Unknown device', v_i); end if;
      if not public.kcd__is_uuid(v_op -> 'pageId', false)
         or not exists (select 1 from public.project_pages where id = (v_op ->> 'pageId')::uuid and project_id = p_project_id) then
        perform public.kcd__fail('KCD_INVALID', format('Page %s does not exist', v_op ->> 'pageId'), v_i);
      end if;
      v_page := (v_op ->> 'pageId')::uuid;
      v_comp := v_op -> 'composition';
      select coalesce(device_layouts, '{}'::jsonb) - (v_op ->> 'device') into v_layouts from public.project_pages where id = v_page;
      if v_comp is not null and jsonb_typeof(v_comp) <> 'null' then
        v_comp := public.kcd__composition(v_comp, v_i);
        if v_comp <> '{}'::jsonb then v_layouts := v_layouts || jsonb_build_object(v_op ->> 'device', v_comp); end if;
      end if;
      update public.project_pages set device_layouts = nullif(v_layouts, '{}'::jsonb), updated_at = now() where id = v_page;
      if not (v_page = any (v_pages)) then v_pages := v_pages || v_page; end if;

    elsif v_name in ('moveNode', 'setProp', 'unsetProp', 'setOverride', 'clearOverride', 'setA11y', 'setVisibility', 'setLocked', 'setResponsiveState', 'setMotion', 'setInteraction') then
      if not public.kcd__is_uuid(v_op -> 'id', false) then perform public.kcd__fail('KCD_INVALID', 'Element id is required', v_i); end if;
      v_node := public.kcd__node(p_project_id, (v_op ->> 'id')::uuid);
      if v_node.id is null then perform public.kcd__fail('KCD_INVALID', format('Element %s does not exist', v_op ->> 'id'), v_i); end if;
      v_type := public.kcd_node_type(v_node.section_type, v_node.parent_id);
      select * into v_rules from public.kcd_node_types where type = v_type;
      v_props := v_node.props;

      if v_name = 'moveNode' then
        if v_op -> 'parentId' is null or jsonb_typeof(v_op -> 'parentId') = 'null' then v_parent := null;
        elsif public.kcd__is_uuid(v_op -> 'parentId', false) then v_parent := (v_op ->> 'parentId')::uuid;
        else perform public.kcd__fail('KCD_INVALID', 'parentId must be a UUID or null', v_i);
        end if;
        if jsonb_typeof(v_op -> 'orderKey') is distinct from 'string' or not public.kcd_order_key_valid(v_op ->> 'orderKey') then
          perform public.kcd__fail('KCD_INVALID', 'Invalid order key', v_i);
        end if;
        v_cur := v_parent;
        while v_cur is not null loop
          if v_cur = v_node.id then perform public.kcd__fail('KCD_INVALID', 'An element cannot be moved inside itself', v_i); end if;
          select parent_id into v_cur from public.project_sections where id = v_cur;
        end loop;
        perform public.kcd__check_placement(p_project_id, v_node.page_id, v_parent, v_type, v_i);
        if v_node.parent_id is not distinct from v_parent and v_node.order_key = v_op ->> 'orderKey' then continue; end if;
        update public.project_sections set parent_id = v_parent, order_key = v_op ->> 'orderKey', updated_at = now() where id = v_node.id;
        v_slots := v_slots || public.kcd__slot(v_node.page_id, v_node.parent_id) || public.kcd__slot(v_node.page_id, v_parent);

      elsif v_name in ('setProp', 'unsetProp') then
        v_segs := public.kcd__parse_path(v_op -> 'path', v_i);
        if v_name = 'setProp' then
          if not (v_op ? 'value') then perform public.kcd__fail('KCD_INVALID', 'setProp needs a value (use unsetProp to clear)', v_i); end if;
          v_props := public.kcd__write_path(v_props, v_segs, v_op -> 'value', false, v_i);
        else
          if public.kcd__read_path(v_props, v_segs) is null then continue; end if;
          v_props := public.kcd__write_path(v_props, v_segs, null, true, v_i);
        end if;

      elsif v_name = 'setOverride' then
        if (v_op ->> 'device') is null or (v_op ->> 'device') not in ('tablet', 'mobile') then perform public.kcd__fail('KCD_INVALID', 'Unknown device', v_i); end if;
        v_key := v_op ->> 'key';
        if jsonb_typeof(v_op -> 'key') is distinct from 'string' or v_key = '' or v_key in ('deviceOverrides', '_motion', '_a11y', '_visibility', '_interaction', '_dataBinding', '_locked', '__proto__', 'prototype', 'constructor') then
          perform public.kcd__fail('KCD_INVALID', 'Invalid override key', v_i);
        end if;
        if not (v_op ? 'value') then perform public.kcd__fail('KCD_INVALID', 'setOverride needs a value (use clearOverride to clear)', v_i); end if;
        if not (v_key = any (v_rules.overridable)) then
          perform public.kcd__fail('KCD_INVALID', format('"%s" cannot be set per device', v_key), v_i);
        end if;
        v_props := public.kcd__write_path(v_props, array['deviceOverrides', v_op ->> 'device', v_key], v_op -> 'value', false, v_i);

      elsif v_name = 'clearOverride' then
        if (v_op ->> 'device') is null or (v_op ->> 'device') not in ('tablet', 'mobile') then perform public.kcd__fail('KCD_INVALID', 'Unknown device', v_i); end if;
        v_bucket := public.kcd__read_path(v_props, array['deviceOverrides', v_op ->> 'device']);
        if v_bucket is null or jsonb_typeof(v_bucket) <> 'object' or v_bucket = '{}'::jsonb then continue; end if;
        if v_op ? 'key' and jsonb_typeof(v_op -> 'key') <> 'null' then
          if not (v_bucket ? (v_op ->> 'key')) then continue; end if;
          v_bucket := v_bucket - (v_op ->> 'key');
        else
          v_bucket := '{}'::jsonb;
        end if;
        if v_bucket = '{}'::jsonb then
          v_props := jsonb_set(v_props, '{deviceOverrides}', (v_props -> 'deviceOverrides') - (v_op ->> 'device'));
        else
          v_props := jsonb_set(v_props, array['deviceOverrides', v_op ->> 'device'], v_bucket);
        end if;
        if v_props -> 'deviceOverrides' = '{}'::jsonb then v_props := v_props - 'deviceOverrides'; end if;

      elsif v_name = 'setResponsiveState' then
        v_n := v_op -> 'value';
        if v_n is null or jsonb_typeof(v_n) = 'null' then
          v_props := v_props #- '{deviceOverrides,_state}';
          if v_props -> 'deviceOverrides' = '{}'::jsonb then v_props := v_props - 'deviceOverrides'; end if;
        else
          if jsonb_typeof(v_n) <> 'object'
             or jsonb_typeof(v_n -> 'mode') is distinct from 'string'
             or (v_n ->> 'mode') not in ('auto', 'custom', 'needs-review')
             or (v_n - 'mode' - 'baseHash') <> '{}'::jsonb
             or (v_n ? 'baseHash' and (jsonb_typeof(v_n -> 'baseHash') <> 'string' or length(v_n ->> 'baseHash') > 32)) then
            perform public.kcd__fail('KCD_INVALID', 'Invalid responsive state', v_i);
          end if;
          v_props := public.kcd__write_path(v_props, array['deviceOverrides', '_state'], v_n, false, v_i);
        end if;

      elsif v_name in ('setMotion','setInteraction') then
        if v_type not in ('section','group','text','image') then perform public.kcd__fail('KCD_INVALID','Native effects require a native element',v_i); end if;
        perform public.kcd__native_effect(v_op->'value',v_name='setInteraction',v_i);
        v_key:=case when v_name='setMotion' then '_motion' else '_interaction' end;
        if v_op->'value' is null or jsonb_typeof(v_op->'value')='null' then v_props:=v_props-v_key;
        else v_props:=v_props||jsonb_build_object(v_key,v_op->'value'); end if;

      else -- setA11y / setVisibility / setLocked: null removes the field
        v_key := case v_name when 'setA11y' then '_a11y' when 'setVisibility' then '_visibility' when 'setMotion' then '_motion' when 'setInteraction' then '_interaction' else '_locked' end;
        if v_op -> 'value' is null or jsonb_typeof(v_op -> 'value') = 'null' then
          v_props := v_props - v_key;
        else
          if v_name = 'setLocked' and jsonb_typeof(v_op -> 'value') <> 'boolean' then perform public.kcd__fail('KCD_INVALID', 'locked must be true or false', v_i); end if;
          if v_name <> 'setLocked' and jsonb_typeof(v_op -> 'value') <> 'object' then perform public.kcd__fail('KCD_INVALID', format('%s value must be an object', v_name), v_i); end if;
          v_props := v_props || jsonb_build_object(v_key, v_op -> 'value');
        end if;
      end if;

      if v_name <> 'moveNode' then
        -- Server-only enrichment after TypeScript validates the original intent and applies
        -- the frozen legacy save boundary. Direct owner RPCs have the S4 content-validation
        -- exposure (owners can already write their own props); structure stays SQL-owned.
        if v_op ? 'normalizedProps' then
          if v_type not like 'legacy-section:%' or jsonb_typeof(v_op -> 'normalizedProps') <> 'object' then
            perform public.kcd__fail('KCD_INVALID', 'Normalized props require a legacy section object', v_i);
          end if;
          v_props := v_op -> 'normalizedProps';
        end if;
        if octet_length(v_props::text) > 320 * 1024 then perform public.kcd__fail('KCD_LIMIT', format('Element %s is too large', v_node.id), v_i); end if;
        update public.project_sections set props = v_props, updated_at = now() where id = v_node.id;
      end if;
      if not (v_node.id = any (v_inserted)) and not (v_restored ? v_node.id::text) and not (v_node.id = any (v_touched)) then
        v_touched := v_touched || v_node.id;
      end if;

    else
      perform public.kcd__fail('KCD_INVALID', format('Unknown operation "%s"', v_name), v_i);
    end if;
  end loop;

  -- Siblings: unique positions, child limits, rebalance (core finishSlots), in slot order.
  select coalesce(array_agg(distinct s order by s), '{}') into v_slots from unnest(v_slots) s;
  foreach v_slot in array v_slots loop
    v_page := split_part(v_slot, '|', 1)::uuid;
    v_parent := nullif(split_part(v_slot, '|', 2), '')::uuid;
    if v_parent is not null and not exists (select 1 from public.project_sections where id = v_parent) then continue; end if;
    if exists (select 1 from public.project_sections where page_id = v_page and parent_id is not distinct from v_parent
               group by order_key having count(*) > 1) then
      perform public.kcd__fail('KCD_INVALID', 'Two elements share the same position');
    end if;
    if v_parent is not null then
      select * into v_rules from public.kcd_node_types
      where type = (select public.kcd_node_type(section_type, parent_id) from public.project_sections where id = v_parent);
      if v_rules.max_children is not null and
         (select count(*) from public.project_sections where parent_id = v_parent) > v_rules.max_children then
        perform public.kcd__fail('KCD_INVALID', format('"%s" can hold at most %s elements', v_rules.type, v_rules.max_children));
      end if;
    end if;
    if exists (select 1 from public.project_sections where page_id = v_page and parent_id is not distinct from v_parent and length(order_key) > 24) then
      v_new := public.kcd_evenly_spaced_keys((select count(*)::int from public.project_sections where page_id = v_page and parent_id is not distinct from v_parent));
      v_idx := 0;
      for v_kids in
        select id, order_key from public.project_sections
        where page_id = v_page and parent_id is not distinct from v_parent
        order by order_key collate "C", id
      loop
        v_idx := v_idx + 1;
        if v_kids.order_key = v_new[v_idx] then continue; end if;
        update public.project_sections set order_key = v_new[v_idx], updated_at = now() where id = v_kids.id;
        v_keys := v_keys || jsonb_build_object(v_kids.id::text, v_new[v_idx]);
        if not (v_kids.id = any (v_inserted)) and not (v_restored ? v_kids.id::text) and not (v_kids.id = any (v_touched)) then
          v_touched := v_touched || v_kids.id;
        end if;
      end loop;
      v_rebal := v_rebal || coalesce(v_parent, v_page)::text;
    end if;
    -- 3B readers use sort_order for page roots: keep it dense in KCD order.
    if v_parent is null then
      update public.project_sections s set sort_order = r.rn - 1
      from (select id, row_number() over (order by order_key collate "C", id) as rn
            from public.project_sections where page_id = v_page and parent_id is null) r
      where s.id = r.id and s.sort_order <> r.rn - 1;
    end if;
  end loop;

  -- Versions: +1 once per touched existing node / page; inserted = 1; restored as recorded + 1.
  update public.project_sections set node_version = node_version + 1 where id = any (v_touched);
  select coalesce(jsonb_object_agg(id::text, node_version), '{}') into v_versions from public.project_sections where id = any (v_touched);
  v_versions := v_versions || coalesce((select jsonb_object_agg(i::text, 1) from unnest(v_inserted) i), '{}') || v_restored;
  update public.project_pages set layout_version = layout_version + 1 where id = any (v_pages) and not(id=any(v_new_pages)) and not(v_restored_pages ? id::text);
  v_versions := v_versions || coalesce((select jsonb_object_agg(id::text, layout_version) from public.project_pages where id = any (v_pages)), '{}');
  v_versions := v_versions || coalesce((select jsonb_object_agg(i::text,1) from unnest(v_new_pages) i),'{}') || v_restored_pages;
  update public.project_pages p set sort_order=r.rn-1 from (select id,row_number() over(order by order_key collate "C",id) rn from public.project_pages where project_id=p_project_id) r where p.id=r.id and p.sort_order <> r.rn-1;
  update public.projects set updated_at = now() where id = p_project_id;

  set constraints public.project_sections_sibling_order_key immediate;
  set constraints public.project_pages_order_key_unique immediate;
  set constraints public.project_pages_project_id_slug_key immediate;
  perform set_config('kcd.applying', 'off', true);
  return jsonb_build_object(
    'versions', v_versions,
    'removedPages', coalesce((select jsonb_agg(k order by k) from jsonb_object_keys(v_removed_pages) k),'[]'),
    'removedPageVersions', v_removed_pages,
    'removed', coalesce((select jsonb_agg(k order by k) from jsonb_object_keys(v_removed) k), '[]'),
    'removedNodes', v_removed,
    'rebalanced', to_jsonb(v_rebal),
    'orderKeys', v_keys
  );
end $$;



create or replace function public.kcd_operation_protocol() returns integer language sql stable security invoker set search_path=public,pg_temp as $$select 4$$;
notify pgrst,'reload schema';
commit;
