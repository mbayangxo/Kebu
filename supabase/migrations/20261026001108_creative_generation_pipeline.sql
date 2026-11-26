-- Source-only migration. Do not apply to hosted environments without the release gate.
create schema if not exists private;
grant usage on schema private to authenticated,service_role;
create table public.creative_generation_runs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  target_kind text not null check(target_kind in ('builder','studio')),
  target_id uuid not null,
  request_key uuid not null,
  state text not null default 'queued' check(state in ('queued','working','awaiting_approval','ready','needs_attention','needs_rebase','cancelled','accepted')),
  phase text not null default 'planning' check(phase in ('planning','generating','checking','reviewing','repairing')),
  revision integer not null default 0,
  lease_token uuid, lease_until timestamptz,
  call_started boolean not null default false,
  data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<=4000000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(actor_id,target_kind,target_id,request_key)
);
create index creative_generation_pending_idx on public.creative_generation_runs(created_at) where state in ('queued','working');
alter table public.creative_generation_runs enable row level security;
revoke all on public.creative_generation_runs from public,anon,authenticated;
grant select on public.creative_generation_runs to authenticated;
grant all on public.creative_generation_runs to service_role;

create function private.can_generate_target(p_kind text,p_id uuid,p_actor uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select p_actor is not null and case when p_kind='builder' then
   exists(select 1 from public.projects where id=p_id and owner_id=p_actor and document_schema_version='kcd-1')
 when p_kind='studio' then exists(select 1 from public.create_designs d where d.id=p_id
   and (d.owner_id=p_actor or exists(select 1 from public.studio_design_collaborators c where c.design_id=d.id and c.user_id=p_actor and c.status='active' and c.role='editor'))
   and (d.business_id is null or exists(select 1 from public.business_members m where m.business_id=d.business_id and m.user_id=p_actor and m.status='active')))
 else false end;
$$;
revoke all on function private.can_generate_target(text,uuid,uuid) from public,anon,authenticated;
grant execute on function private.can_generate_target(text,uuid,uuid) to service_role;
create function private.can_read_generation(p_actor uuid,p_kind text,p_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select p_actor=auth.uid() and private.can_generate_target(p_kind,p_id,auth.uid());
$$;
revoke all on function private.can_read_generation(uuid,text,uuid) from public,anon;
grant execute on function private.can_read_generation(uuid,text,uuid) to authenticated;
create policy generation_read on public.creative_generation_runs for select to authenticated
 using(private.can_read_generation(actor_id,target_kind,target_id));

create function public.create_creative_generation(p_actor uuid,p_kind text,p_target uuid,p_key uuid,p_data jsonb) returns public.creative_generation_runs
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.creative_generation_runs;
begin
 if not private.can_generate_target(p_kind,p_target,p_actor) then raise exception 'Target unavailable' using errcode='42501';end if;
 if p_data->>'maxCalls' is null or (p_data->>'maxCalls')::integer not between 1 and 34 or (p_data->>'calls')::integer<>0 then raise exception 'Invalid budget';end if;
 insert into public.creative_generation_runs(actor_id,target_kind,target_id,request_key,phase,data)
 values(p_actor,p_kind,p_target,p_key,case when p_data->'brief'->>'mode'='inspect' then 'checking' else 'planning' end,p_data)
 on conflict(actor_id,target_kind,target_id,request_key) do nothing;
 select * into r from public.creative_generation_runs where actor_id=p_actor and target_kind=p_kind and target_id=p_target and request_key=p_key;
 if r.data->'brief' is distinct from p_data->'brief' or r.data->'reference' is distinct from p_data->'reference' then raise exception 'Request key already used for a different brief' using errcode='22023';end if;
 return r;
end$$;
revoke all on function public.create_creative_generation(uuid,text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_creative_generation(uuid,text,uuid,uuid,jsonb) to service_role;

create function public.claim_creative_generation(p_id uuid default null) returns public.creative_generation_runs
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.creative_generation_runs;
begin
 -- A provider submission with no durable receipt is ambiguous. Never silently bill it again.
 update public.creative_generation_runs set state=case when call_started then 'needs_attention' else 'queued' end,
   data=jsonb_set(data,'{error}',to_jsonb(case when call_started then 'A provider request was interrupted. Your candidate is kept; start a new reviewed request to continue.' else 'The interrupted check will resume.' end)),
   lease_token=null,lease_until=null,updated_at=now(),revision=revision+1
 where state='working' and lease_until<now() and (p_id is null or id=p_id);
 select * into r from public.creative_generation_runs where state='queued' and (p_id is null or id=p_id) order by created_at for update skip locked limit 1;
 if not found then return null;end if;
 if not private.can_generate_target(r.target_kind,r.target_id,r.actor_id) then
   update public.creative_generation_runs set state='cancelled',data=jsonb_set(data,'{error}','"Editing permission is no longer available."'),updated_at=now(),revision=revision+1 where id=r.id;
   return null;
 end if;
 update public.creative_generation_runs set state='working',lease_token=gen_random_uuid(),lease_until=now()+interval '110 seconds',call_started=false,updated_at=now() where id=r.id returning * into r;
 return r;
end$$;
revoke all on function public.claim_creative_generation(uuid) from public,anon,authenticated;
grant execute on function public.claim_creative_generation(uuid) to service_role;

create function public.begin_creative_generation_call(p_id uuid,p_token uuid,p_limit integer) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.creative_generation_runs;
begin
 select * into r from public.creative_generation_runs where id=p_id for update;
 if not found or r.state<>'working' or r.lease_token is distinct from p_token or r.lease_until<=now() or r.call_started then return false;end if;
 if not private.can_generate_target(r.target_kind,r.target_id,r.actor_id) or (r.data->>'calls')::integer >= (r.data->>'maxCalls')::integer then return false;end if;
 if not public.reserve_account_ai_generation(r.actor_id,case when r.target_kind='builder' then r.target_id else null end,p_token,p_limit,case when r.target_kind='builder' then 'website_ai_generate' else 'studio_generate' end) then return false;end if;
 update public.creative_generation_runs set call_started=true,data=jsonb_set(data,'{calls}',to_jsonb((data->>'calls')::integer+1)),updated_at=now() where id=p_id;
 return true;
end$$;
revoke all on function public.begin_creative_generation_call(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.begin_creative_generation_call(uuid,uuid,integer) to service_role;

create function public.finish_creative_generation_stage(p_id uuid,p_token uuid,p_state text,p_phase text,p_data jsonb) returns public.creative_generation_runs
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.creative_generation_runs;
begin
 select * into r from public.creative_generation_runs where id=p_id for update;
 if not found or r.state<>'working' or r.lease_token is distinct from p_token or r.lease_until<=now() then return null;end if;
 if not private.can_generate_target(r.target_kind,r.target_id,r.actor_id) then
   update public.creative_generation_runs set state='cancelled',lease_token=null,lease_until=null,revision=revision+1,updated_at=now() where id=p_id returning * into r;return r;
 end if;
 if p_data->'base' is distinct from r.data->'base' or p_data->'source' is distinct from r.data->'source' or p_data->'brief' is distinct from r.data->'brief'
 or p_data->'reference' is distinct from r.data->'reference' or p_data->'savedDirection' is distinct from r.data->'savedDirection' or p_data->'profile' is distinct from r.data->'profile'
 or p_data->'calls' is distinct from r.data->'calls' or p_data->'maxCalls' is distinct from r.data->'maxCalls' then raise exception 'Immutable inputs changed' using errcode='22023';end if;
 if p_state not in ('queued','awaiting_approval','ready','needs_attention','needs_rebase') then raise exception 'Invalid completion state';end if;
 update public.creative_generation_runs set state=p_state,phase=p_phase,data=p_data,revision=revision+1,lease_token=null,lease_until=null,call_started=false,updated_at=now() where id=p_id returning * into r;return r;
end$$;
revoke all on function public.finish_creative_generation_stage(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.finish_creative_generation_stage(uuid,uuid,text,text,jsonb) to service_role;

create function public.control_creative_generation(p_id uuid,p_action text,p_revision integer default null,p_direction jsonb default null) returns public.creative_generation_runs
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.creative_generation_runs;
begin
 select * into r from public.creative_generation_runs where id=p_id and actor_id=auth.uid() for update;
 if not found or not private.can_generate_target(r.target_kind,r.target_id,auth.uid()) then raise exception 'Run unavailable' using errcode='42501';end if;
 if p_action='cancel' then
   if r.state not in ('accepted','cancelled') then update public.creative_generation_runs set state='cancelled',lease_token=null,lease_until=null,revision=revision+1,updated_at=now() where id=p_id returning * into r;end if;
 elsif p_action='approve' then
   if r.state<>'awaiting_approval' or r.revision is distinct from p_revision then raise exception 'Direction changed' using errcode='40001';end if;
   if p_direction is null or jsonb_typeof(p_direction)<>'object' or octet_length(p_direction::text)>10000 then raise exception 'Invalid direction';end if;
   update public.creative_generation_runs set state='queued',phase='generating',data=jsonb_set(data,'{direction}',p_direction),revision=revision+1,updated_at=now() where id=p_id returning * into r;
 else raise exception 'Invalid action';end if;
 return r;
end$$;
revoke all on function public.control_creative_generation(uuid,text,integer,jsonb) from public,anon;
grant execute on function public.control_creative_generation(uuid,text,integer,jsonb) to authenticated;

create function public.accept_creative_generation(p_id uuid,p_revision integer) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.creative_generation_runs;d public.create_designs;result jsonb;tx jsonb;
begin
 select * into r from public.creative_generation_runs where id=p_id and actor_id=auth.uid() for update;
 if not found or not private.can_generate_target(r.target_kind,r.target_id,auth.uid()) then raise exception 'Run unavailable' using errcode='42501';end if;
 if r.state='accepted' then return jsonb_build_object('accepted',true,'targetId',r.target_id);end if;
 if r.revision is distinct from p_revision or r.state<>'ready' or r.data->'report'->>'status' is distinct from 'pass' or r.data->'report'->>'visualReview' is distinct from 'passed' or r.data->'brief'->>'mode'='inspect' then raise exception 'Review a passing candidate first' using errcode='40001';end if;
 if r.target_kind='studio' then
   select * into d from public.create_designs where id=r.target_id for update;
   if d.canvas is distinct from r.data->'source'->'canvas' or d.updated_at is distinct from (r.data->'source'->>'updatedAt')::timestamptz then
     update public.creative_generation_runs set state='needs_rebase',revision=revision+1,updated_at=now() where id=p_id;
     return jsonb_build_object('accepted',false,'conflict',true);
   end if;
   insert into public.studio_design_versions(design_id,created_by,canvas,source,label) values(d.id,auth.uid(),d.canvas,'pre_restore','Before reviewed generation');
   update public.create_designs set canvas=r.data->'candidate'->'document',updated_at=now() where id=d.id;
 else
   tx:=r.data->'candidate'->'transaction';
   insert into public.project_experience_proposals(id,project_id,owner_id,kind,payload) values((tx->>'txId')::uuid,r.target_id,auth.uid(),'plan',r.data->'candidate'->'proposal') on conflict(id) do nothing;
   begin
     result:=public.apply_experience_plan(r.target_id,tx);
   exception when serialization_failure then
     update public.creative_generation_runs set state='needs_rebase',revision=revision+1,updated_at=now() where id=p_id;
     return jsonb_build_object('accepted',false,'conflict',true);
   end;
   if result->>'status'<>'committed' then raise exception 'Candidate was not committed' using errcode='40001';end if;
 end if;
 update public.creative_generation_runs set state='accepted',revision=revision+1,updated_at=now() where id=p_id;
 return jsonb_build_object('accepted',true,'targetId',r.target_id);
end$$;
revoke all on function public.accept_creative_generation(uuid,integer) from public,anon;
grant execute on function public.accept_creative_generation(uuid,integer) to authenticated;
notify pgrst,'reload schema';

-- Audit images are private, immutable worker artifacts; viewers use short-lived signed URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('creative-generation-evidence','creative-generation-evidence',false,2000000,array['image/jpeg','image/png']) on conflict(id) do nothing;
create policy creative_generation_evidence_read on storage.objects for select to authenticated using(
 bucket_id='creative-generation-evidence' and exists(select 1 from public.creative_generation_runs r
 where r.id::text=(storage.foldername(name))[2] and r.actor_id::text=(storage.foldername(name))[1]
 and private.can_read_generation(r.actor_id,r.target_kind,r.target_id))
);

create function public.claim_creative_generation_access(p_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.creative_generation_runs r where id=p_id and private.can_generate_target(r.target_kind,r.target_id,r.actor_id));
$$;
revoke all on function public.claim_creative_generation_access(uuid) from public,anon,authenticated;
grant execute on function public.claim_creative_generation_access(uuid) to service_role;
