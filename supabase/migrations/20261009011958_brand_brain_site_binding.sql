-- Private direction, separate from authored KCD operations/public snapshots.
create unique index if not exists projects_id_owner_unique on public.projects(id,owner_id);
create unique index if not exists brand_kits_id_owner_unique on public.business_brand_kits(id,owner_id);
create table public.project_brand_brains (
  project_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid,
  revision bigint not null default 1 check(revision>0 and revision<=9007199254740991),
  foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete cascade,
  foreign key(profile_id,owner_id) references public.business_brand_kits(id,owner_id) on delete set null (profile_id)
);
create index project_brand_brains_profile_idx on public.project_brand_brains(profile_id,owner_id);
alter table public.project_brand_brains enable row level security;
revoke all on public.project_brand_brains from public,anon,authenticated;
grant select,insert,update on public.project_brand_brains to authenticated;
create policy brain_binding_read on public.project_brand_brains for select to authenticated using(owner_id=(select auth.uid()));
create policy brain_binding_insert on public.project_brand_brains for insert to authenticated with check(owner_id=(select auth.uid()));
create policy brain_binding_update on public.project_brand_brains for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create function public.advance_brand_binding_revision() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then new.revision:=1;
  else
    if new.project_id<>old.project_id or new.owner_id<>old.owner_id then raise exception 'Binding identity is immutable' using errcode='22023';end if;
    new.revision:=old.revision+1;
  end if;
  return new;
end$$;
create trigger brand_binding_revision before insert or update on public.project_brand_brains for each row execute function public.advance_brand_binding_revision();
revoke all on function public.advance_brand_binding_revision() from public,anon;
create function public.save_project_brand_brain(p_project uuid,p_profile uuid,p_expected bigint) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_row public.project_brand_brains%rowtype;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501';end if;
  if p_expected is null or p_expected<0 or p_expected>=9007199254740991 then raise exception 'Invalid revision' using errcode='22023';end if;
  -- This project lock serializes first inserts and all RPC writes for the site.
  perform 1 from public.projects where id=p_project and owner_id=v_user for update;
  if not found then raise exception 'Site not found' using errcode='P0002';end if;
  if p_profile is not null then
    perform 1 from public.business_brand_kits where id=p_profile and owner_id=v_user for key share;
    if not found then raise exception 'Profile not found' using errcode='P0002';end if;
  end if;
  select * into v_row from public.project_brand_brains where project_id=p_project for update;
  if coalesce(v_row.revision,0)<>p_expected then raise exception 'Site direction changed' using errcode='40001';end if;
  if v_row.project_id is null then
    insert into public.project_brand_brains(project_id,owner_id,profile_id) values(p_project,v_user,p_profile) returning * into v_row;
  else
    update public.project_brand_brains set profile_id=p_profile where project_id=p_project returning * into v_row;
  end if;
  return to_jsonb(v_row);
end$$;
revoke all on function public.save_project_brand_brain(uuid,uuid,bigint) from public,anon;
grant execute on function public.save_project_brand_brain(uuid,uuid,bigint) to authenticated;
