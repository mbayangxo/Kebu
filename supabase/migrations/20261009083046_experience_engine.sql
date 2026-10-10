-- Private immutable proposals; owner-only reads and server-only creation.
create table public.project_experience_proposals (
  id uuid primary key,
  project_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('reference','plan')),
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=262144),
  created_at timestamptz not null default now(),
  foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete cascade
);
create index experience_proposals_owner_project_idx on public.project_experience_proposals(owner_id,project_id,created_at desc);
alter table public.project_experience_proposals enable row level security;
revoke all on public.project_experience_proposals from public,anon,authenticated,service_role;
grant select on public.project_experience_proposals to authenticated;
grant select,insert on public.project_experience_proposals to service_role;
create policy experience_proposals_read on public.project_experience_proposals for select to authenticated using(owner_id=(select auth.uid()));

-- Reserve before calling the provider. Failed attempts also use one allowance.
-- Keep legacy INSERT; forbid browser removal/backdating of reserved usage events.
revoke update,delete,truncate on public.account_ai_usage_events from public,anon,authenticated;
create function public.reserve_experience_generation(p_owner uuid,p_project uuid,p_id uuid,p_limit integer,p_kind text) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_count bigint;
begin
  if p_limit is null or p_limit<0 or p_kind is null or p_kind not in ('reference','plan') then raise exception 'Invalid reservation' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,391));
  if not exists(select 1 from public.projects where id=p_project and owner_id=p_owner) then raise exception 'Site not found' using errcode='42501';end if;
  if exists(select 1 from public.account_ai_usage_events where id=p_id) then return false;end if;
  select count(*) into v_count from public.account_ai_usage_events where owner_id=p_owner and created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  if p_limit>0 and v_count>=p_limit then return false;end if;
  insert into public.account_ai_usage_events(id,owner_id,project_id,action,meta) values(p_id,p_owner,p_project,'website_ai_generate',jsonb_build_object('gateway','experience-v1','kind',p_kind,'state','reserved-attempt'));
  return true;
end$$;
revoke all on function public.reserve_experience_generation(uuid,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.reserve_experience_generation(uuid,uuid,uuid,integer,text) to service_role;

-- Source checks and canonical native application share the existing project writer lock.
create function public.apply_experience_plan(p_project_id uuid,p_tx jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_proposal public.project_experience_proposals;v_source jsonb;v_versions jsonb;v_dna bigint;v_binding bigint;v_profile uuid;v_brain bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
  perform 1 from public.projects where id=p_project_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Site not found' using errcode='42501';end if;
  select * into v_proposal from public.project_experience_proposals where id=(p_tx->>'txId')::uuid and project_id=p_project_id and owner_id=auth.uid() and kind='plan';
  if not found or v_proposal.payload->'transaction' is distinct from p_tx then raise exception 'Review a saved proposal first' using errcode='22023';end if;
  if exists(select 1 from public.creative_op_journal where tx_id=(p_tx->>'txId')::uuid and project_id=p_project_id and status='committed') then return public.apply_node_ops(p_project_id,p_tx);end if;
  select revision into v_dna from public.project_experience_dna where project_id=p_project_id for share;
  select revision,profile_id into v_binding,v_profile from public.project_brand_brains where project_id=p_project_id for share;
  if v_profile is not null then select brain_revision into v_brain from public.business_brand_kits where id=v_profile and owner_id=auth.uid() for share;end if;
  v_source:=v_proposal.payload->'source';
  if coalesce(v_dna,0)<>(v_source->>'dnaRevision')::bigint or coalesce(v_binding,0)<>(v_source->>'bindingRevision')::bigint or v_profile is distinct from (v_source->>'profileId')::uuid or coalesce(v_brain,0)<>(v_source->>'profileRevision')::bigint then raise exception 'Saved direction changed. Generate and review a fresh plan.' using errcode='40001';end if;
  select coalesce(jsonb_object_agg(id::text,version),'{}'::jsonb) into v_versions from (
    select id,layout_version as version from public.project_pages where project_id=p_project_id
    union all select s.id,s.node_version from public.project_sections s join public.project_pages p on p.id=s.page_id where p.project_id=p_project_id
  ) versions;
  if v_versions is distinct from v_source->'versions' then raise exception 'Site changed. Generate and review a fresh plan.' using errcode='40001';end if;
  return public.apply_node_ops(p_project_id,p_tx);
end$$;
revoke all on function public.apply_experience_plan(uuid,jsonb) from public,anon;
grant execute on function public.apply_experience_plan(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
