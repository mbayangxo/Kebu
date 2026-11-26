-- Project-specific private intent; this is not a KCD document or public snapshot.
create unique index if not exists projects_id_owner_unique on public.projects(id,owner_id);
create function public.valid_experience_dna(p jsonb) returns boolean
language plpgsql immutable security invoker set search_path=public,pg_temp as $$
declare item jsonb; key text; slugs text[]:='{}';
begin
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>65536 then return false;end if;
  if (select array_agg(k order by k) from jsonb_object_keys(p) k) is distinct from array['audience','experience','goal','pages','references','version','visitorAction'] then return false;end if;
  if p->'version' is distinct from '1'::jsonb then return false;end if;
  foreach key in array array['goal','audience','visitorAction','experience'] loop
    if jsonb_typeof(p->key) is distinct from 'string' then return false;end if;
    if length(p->>key)>(case when key='visitorAction' then 500 else 1500 end) or (key<>'experience' and length(btrim(p->>key))=0) then return false;end if;
  end loop;
  if jsonb_typeof(p->'references') is distinct from 'array' or jsonb_typeof(p->'pages') is distinct from 'array' then return false;end if;
  if jsonb_array_length(p->'references')>12 or jsonb_array_length(p->'pages') not between 1 and 12 then return false;end if;
  for item in select value from jsonb_array_elements(p->'references') loop
    if jsonb_typeof(item) is distinct from 'object' then return false;end if;
    if (select array_agg(k order by k) from jsonb_object_keys(item) k) is distinct from array['label','observations','url'] then return false;end if;
    foreach key in array array['url','label','observations'] loop
      if jsonb_typeof(item->key) is distinct from 'string' or length(btrim(item->>key))=0 or length(item->>key)>(case key when 'url' then 500 when 'label' then 120 else 1500 end) then return false;end if;
    end loop;
    -- References are labels only; neither the database nor compiler fetches URLs.
    if item->>'url' !~ '^https://[^[:space:]"''<>\\]+$' or substring(item->>'url' from '^https://([^/?#]+)') is null or substring(item->>'url' from '^https://([^/?#]+)') like '%@%' then return false;end if;
  end loop;
  for item in select value from jsonb_array_elements(p->'pages') loop
    if jsonb_typeof(item) is distinct from 'object' then return false;end if;
    if (select array_agg(k order by k) from jsonb_object_keys(item) k) is distinct from array['purpose','slug','title'] then return false;end if;
    foreach key in array array['slug','title','purpose'] loop
      if jsonb_typeof(item->key) is distinct from 'string' or length(btrim(item->>key))=0 or length(item->>key)>(case key when 'slug' then 60 when 'title' then 120 else 1000 end) then return false;end if;
    end loop;
    if item->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or item->>'slug'=any(slugs) then return false;end if;
    slugs:=array_append(slugs,item->>'slug');
  end loop;
  return 'home'=any(slugs);
end$$;
revoke all on function public.valid_experience_dna(jsonb) from public,anon;
grant execute on function public.valid_experience_dna(jsonb) to authenticated;

create table public.project_experience_dna (
  project_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  dna jsonb not null check(public.valid_experience_dna(dna)),
  revision bigint not null default 1 check(revision>0 and revision<=9007199254740991),
  foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete cascade
);
alter table public.project_experience_dna enable row level security;
create index project_experience_dna_owner_idx on public.project_experience_dna(owner_id);
revoke all on public.project_experience_dna from public,anon,authenticated;
grant select,insert,update on public.project_experience_dna to authenticated;
create policy experience_read on public.project_experience_dna for select to authenticated using(owner_id=(select auth.uid()));
create policy experience_insert on public.project_experience_dna for insert to authenticated with check(owner_id=(select auth.uid()));
create policy experience_update on public.project_experience_dna for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create function public.advance_experience_revision() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if tg_op='INSERT' then new.revision:=1;
  else
    if new.project_id<>old.project_id or new.owner_id<>old.owner_id then raise exception 'Direction identity is immutable' using errcode='22023';end if;
    new.revision:=old.revision+1;
  end if;
  return new;
end$$;
create trigger experience_revision before insert or update on public.project_experience_dna for each row execute function public.advance_experience_revision();
revoke all on function public.advance_experience_revision() from public,anon;
create function public.save_project_experience_dna(p_project uuid,p_expected bigint,p_dna jsonb) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid();v_row public.project_experience_dna%rowtype;
begin
  if v_user is null then raise exception 'Sign in required' using errcode='42501';end if;
  if p_expected is null or p_expected<0 or p_expected>=9007199254740991 then raise exception 'Invalid revision' using errcode='22023';end if;
  perform 1 from public.projects where id=p_project and owner_id=v_user for update;
  if not found then raise exception 'Site not found' using errcode='P0002';end if;
  select * into v_row from public.project_experience_dna where project_id=p_project for update;
  if coalesce(v_row.revision,0)<>p_expected then raise exception 'Site direction changed' using errcode='40001';end if;
  if v_row.project_id is null then
    insert into public.project_experience_dna(project_id,owner_id,dna) values(p_project,v_user,p_dna) returning * into v_row;
  else
    update public.project_experience_dna set dna=p_dna where project_id=p_project returning * into v_row;
  end if;
  return to_jsonb(v_row);
end$$;
revoke all on function public.save_project_experience_dna(uuid,bigint,jsonb) from public,anon;
grant execute on function public.save_project_experience_dna(uuid,bigint,jsonb) to authenticated;
