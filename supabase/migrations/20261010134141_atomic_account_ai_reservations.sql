-- All server model routes share the Experience gateway's per-owner lock.
-- An admitted attempt is charged before provider work, including failed attempts.
create function public.reserve_account_ai_generation(
  p_owner uuid, p_project uuid, p_id uuid, p_limit integer, p_action text
) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_count bigint;
begin
  if p_owner is null or p_id is null or p_limit is null or p_limit<0
     or p_action is null or p_action not in ('website_ai_generate','website_ai_improve','studio_generate') then
    raise exception 'Invalid reservation' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,391));
  if p_project is not null and not exists(select 1 from public.projects where id=p_project and owner_id=p_owner) then
    raise exception 'Site not found' using errcode='42501';
  end if;
  if exists(select 1 from public.account_ai_usage_events where id=p_id) then return false;end if;
  select count(*) into v_count from public.account_ai_usage_events
    where owner_id=p_owner and created_at>=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';
  if p_limit>0 and v_count>=p_limit then return false;end if;
  insert into public.account_ai_usage_events(id,owner_id,project_id,action,meta)
    values(p_id,p_owner,p_project,p_action,jsonb_build_object('gateway','account-v1','state','reserved-attempt'));
  return true;
end$$;
revoke all on function public.reserve_account_ai_generation(uuid,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.reserve_account_ai_generation(uuid,uuid,uuid,integer,text) to service_role;
-- Browser clients may inspect their meter but cannot forge or erase usage.
revoke insert,update,delete,truncate on public.account_ai_usage_events from public,anon,authenticated;
notify pgrst,'reload schema';
