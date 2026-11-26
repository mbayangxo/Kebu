-- Forward-only fix for the already-applied generation approval RPC.
-- This preserves the historical migration and replaces only the existing RPC.
create or replace function public.control_creative_generation(p_id uuid,p_action text,p_revision integer default null,p_direction jsonb default null) returns public.creative_generation_runs
language plpgsql security definer set search_path='' as $$
declare r public.creative_generation_runs;
begin
 select * into r from public.creative_generation_runs where id=p_id and actor_id=auth.uid() for update;
 if not found or not private.can_generate_target(r.target_kind,r.target_id,auth.uid()) then raise exception 'Run unavailable' using errcode='42501';end if;
 if p_action='cancel' then
   if r.state not in ('accepted','cancelled') then update public.creative_generation_runs set state='cancelled',lease_token=null,lease_until=null,revision=revision+1,updated_at=now() where id=p_id returning * into r;end if;
 elsif p_action='approve' then
   if r.state<>'awaiting_approval' or r.revision is distinct from p_revision then raise exception 'Direction changed' using errcode='40001';end if;
   -- This function is directly callable by any authenticated client via
   -- PostgREST (grant below), bypassing the Next.js route's directionSchema
   -- validation entirely -- so the shape stored here must be checked at
   -- this boundary too, not just "is an object under 10KB". Without this,
   -- a malformed p_direction is stored verbatim and later crashes
   -- generation-workbench.tsx, which renders direction.palette.map(...),
   -- direction.contentReview.map(...) and direction.summary unconditionally.
   -- jsonb_typeof(missing_key) is SQL NULL, and `NULL <> 'string'` is NULL
   -- (not TRUE) under three-valued logic -- plpgsql's IF treats a NULL
   -- condition as false, so a plain <> comparison here would silently
   -- accept a direction missing every required key. IS DISTINCT FROM is
   -- NULL-safe and was verified directly against Postgres for exactly that
   -- case before landing.
   if p_direction is null or jsonb_typeof(p_direction) is distinct from 'object' or octet_length(p_direction::text)>64000 then raise exception 'Invalid direction';end if;
   if exists(select 1 from jsonb_object_keys(p_direction) k where k not in ('summary','typography','composition','motion','palette','contentReview'))
     or jsonb_typeof(p_direction->'summary') is distinct from 'string'
     or jsonb_typeof(p_direction->'typography') is distinct from 'string'
     or jsonb_typeof(p_direction->'composition') is distinct from 'string'
     or jsonb_typeof(p_direction->'motion') is distinct from 'string'
     or jsonb_typeof(p_direction->'palette') is distinct from 'array'
     or jsonb_typeof(p_direction->'contentReview') is distinct from 'array'
   then raise exception 'Invalid direction';end if;
   -- Container checks above must finish before using array-only operations.
   -- Preserve the same field/count bounds enforced by directionSchema.
   if char_length(p_direction->>'summary') not between 1 and 2000
     or char_length(p_direction->>'typography') not between 1 and 1000
     or char_length(p_direction->>'composition') not between 1 and 1500
     or char_length(p_direction->>'motion')>1000
     or jsonb_array_length(p_direction->'palette') not between 1 and 8
     or jsonb_array_length(p_direction->'contentReview')>12
     or exists(select 1 from jsonb_array_elements(p_direction->'palette') v where jsonb_typeof(v) is distinct from 'string' or v#>>'{}' !~ '^#[0-9a-fA-F]{6}$')
     or exists(select 1 from jsonb_array_elements(p_direction->'contentReview') v where jsonb_typeof(v) is distinct from 'string' or char_length(v#>>'{}')>500)
   then raise exception 'Invalid direction';end if;
   update public.creative_generation_runs set state='queued',phase='generating',data=jsonb_set(data,'{direction}',p_direction),revision=revision+1,updated_at=now() where id=p_id returning * into r;
 else raise exception 'Invalid action';end if;
 return r;
end$$;
revoke all on function public.control_creative_generation(uuid,text,integer,jsonb) from public,anon;
grant execute on function public.control_creative_generation(uuid,text,integer,jsonb) to authenticated;
