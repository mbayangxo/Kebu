-- Restores the absent developer_apps migration and adds reviewed launcher installs.
create table if not exists public.developer_apps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  tagline text,
  category text not null check (category in ('site_template','business_tool','mobile_money','ai_plugin','studio_template','logistics')),
  pricing text not null default 'free' check (pricing in ('free','paid','recurring')),
  price_xof integer,
  status text not null default 'draft',
  installs integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.developer_apps add column if not exists description text not null default '';
alter table public.developer_apps add column if not exists launch_url text;
alter table public.developer_apps add column if not exists privacy_url text;
alter table public.developer_apps add column if not exists support_url text;
alter table public.developer_apps add column if not exists revision integer not null default 1;
alter table public.developer_apps drop constraint if exists developer_apps_status_check;
alter table public.developer_apps add constraint developer_apps_status_check check (status in ('draft','review','published','rejected','suspended'));
create index if not exists developer_apps_owner on public.developer_apps(owner_id, updated_at desc);
create index if not exists developer_apps_catalog on public.developer_apps(updated_at desc) where status='published';

-- Old published flags are not evidence of reviewed launch/privacy/support pages.
-- Preserve records as drafts when they cannot satisfy the new submission contract.
update public.developer_apps set status='draft'
where status in ('review','published') and (pricing<>'free'
  or char_length(trim(description))<20 or launch_url is null or privacy_url is null or support_url is null);

create or replace function public.marketplace_https_url(value text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    value ~ '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?([.][a-z0-9]([a-z0-9-]*[a-z0-9])?)+(/[A-Za-z0-9/_.,~!$&''()*+;=:@%-]*)?$'
    and char_length(value) <= 1000
    and value !~ '^https://([0-9.]+|localhost|[^/]*[.](local|internal|localhost))(/|$)', false);
$$;
revoke execute on function public.marketplace_https_url(text) from public;
grant execute on function public.marketplace_https_url(text) to authenticated, service_role;

create or replace function public.guard_developer_app()
returns trigger language plpgsql set search_path = '' as $$
declare privileged boolean := current_user in ('postgres','service_role');
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.revision <> 1 or new.installs <> 0 then
      raise exception 'New apps must be drafts' using errcode='42501';
    end if;
  else
    if new.id <> old.id or new.owner_id <> old.owner_id or new.created_at <> old.created_at
      or new.installs <> old.installs then raise exception 'Immutable app fields' using errcode='42501'; end if;
    if not privileged then
      if old.status in ('review','published','suspended') then
        if new.status <> 'draft' or old.status='suspended'
          or (to_jsonb(new) - array['status','updated_at']) <> (to_jsonb(old) - array['status','updated_at'])
        then raise exception 'Withdraw before editing; suspended apps require review' using errcode='42501'; end if;
      elsif new.status not in ('draft','review') then
        raise exception 'Only Kebu reviewers can publish' using errcode='42501';
      end if;
    end if;
    if (to_jsonb(new) - array['status','updated_at','revision'])
      <> (to_jsonb(old) - array['status','updated_at','revision']) then
      if old.status not in ('draft','rejected') or new.status <> 'draft' then
        raise exception 'Only drafts can be edited' using errcode='42501'; end if;
      new.revision := old.revision + 1;
    elsif new.revision <> old.revision then
      raise exception 'Revision cannot be assigned' using errcode='42501';
    end if;
  end if;
  if char_length(trim(new.name)) not between 2 and 60
    or new.category not in ('site_template','business_tool','mobile_money','ai_plugin','studio_template','logistics')
    or new.pricing not in ('free','paid','recurring') then
    raise exception 'Invalid app fields' using errcode='23514'; end if;
  if new.pricing<>'free' and (new.price_xof is null or new.price_xof<1) then
    raise exception 'Invalid paid app price' using errcode='23514'; end if;
  if char_length(new.description)>4000 or char_length(coalesce(new.tagline,''))>160 then
    raise exception 'App description too long' using errcode='23514'; end if;
  if new.status in ('review','published') then
    if new.pricing <> 'free' then raise exception 'Paid-app checkout is not enabled' using errcode='23514'; end if;
    if char_length(trim(new.description)) < 20 or not public.marketplace_https_url(new.launch_url)
      or not public.marketplace_https_url(new.privacy_url) or not public.marketplace_https_url(new.support_url)
    then raise exception 'Provide description, launch, privacy and support HTTPS pages' using errcode='23514'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_developer_app() from public;
create trigger guard_developer_app before insert or update on public.developer_apps
for each row execute function public.guard_developer_app();

create table public.developer_app_reviews (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.developer_apps(id) on delete cascade,
  revision integer not null,
  decision text not null check (decision in ('published','rejected','suspended')),
  note text not null check (char_length(trim(note)) between 5 and 1000),
  reviewer text not null,
  created_at timestamptz not null default now()
);
create index developer_app_reviews_app on public.developer_app_reviews(app_id,created_at desc);
create table public.developer_app_installs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  app_id uuid not null references public.developer_apps(id) on delete cascade,
  revision integer not null,
  consent text not null check (consent='launcher-only-v1'),
  app_name text not null,
  installed_at timestamptz not null default now(),
  primary key(user_id,app_id)
);
create index developer_app_installs_app on public.developer_app_installs(app_id);
alter table public.developer_apps enable row level security;
alter table public.developer_app_reviews enable row level security;
alter table public.developer_app_installs enable row level security;
-- Replace any old permissive policies: this migration establishes the canonical access model.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='developer_apps' loop
    execute format('drop policy %I on public.developer_apps',p.policyname);
  end loop;
end $$;
revoke all on public.developer_apps,public.developer_app_reviews,public.developer_app_installs from public,anon,authenticated;
grant select,insert,update on public.developer_apps to authenticated;
grant select on public.developer_app_reviews to authenticated;
grant select,delete on public.developer_app_installs to authenticated;
grant all on public.developer_apps,public.developer_app_reviews,public.developer_app_installs to service_role;
create policy developer_app_read on public.developer_apps for select to authenticated
  using (owner_id=(select auth.uid()) or status='published');
create policy developer_app_create on public.developer_apps for insert to authenticated with check(owner_id=(select auth.uid()) and status='draft');
create policy developer_app_edit on public.developer_apps for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy developer_review_read on public.developer_app_reviews for select to authenticated using(
  exists(select 1 from public.developer_apps a where a.id=app_id and a.owner_id=(select auth.uid())));
create policy developer_install_read on public.developer_app_installs for select to authenticated using(user_id=(select auth.uid()));
create policy developer_install_remove on public.developer_app_installs for delete to authenticated using(user_id=(select auth.uid()));
-- Serializes approval against owner edits/withdrawal. Only service_role can call.
create function public.marketplace_review_app(p_id uuid,p_revision integer,p_decision text,p_note text,p_reviewer text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare app public.developer_apps;
begin
  select * into app from public.developer_apps where id=p_id for update;
  if not found or app.revision<>p_revision then raise exception 'App revision changed; refresh review' using errcode='40001'; end if;
  if not ((app.status='review' and p_decision in ('published','rejected'))
    or (app.status='published' and p_decision='suspended')
    or (app.status='suspended' and p_decision='rejected')) then
    raise exception 'App status changed; refresh review' using errcode='40001'; end if;
  update public.developer_apps set status=p_decision where id=p_id;
  insert into public.developer_app_reviews(app_id,revision,decision,note,reviewer)
    values(p_id,p_revision,p_decision,trim(p_note),p_reviewer);
  return p_id;
end $$;
revoke all on function public.marketplace_review_app(uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.marketplace_review_app(uuid,integer,text,text,text) to service_role;

-- Row lock makes installing an approved version atomic with suspension/withdrawal.
create schema if not exists kebu_marketplace_private;
revoke all on schema kebu_marketplace_private from public;
grant usage on schema kebu_marketplace_private to authenticated;
create function kebu_marketplace_private.install_app(p_id uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare app public.developer_apps;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  select * into app from public.developer_apps where id=p_id for share;
  if not found or app.status<>'published' or app.pricing<>'free' or app.revision<>p_revision then
    raise exception 'App is no longer available in this version' using errcode='40001'; end if;
  delete from public.developer_app_installs where user_id=auth.uid() and app_id=p_id and revision<>p_revision;
  insert into public.developer_app_installs(user_id,app_id,revision,consent,app_name)
    values(auth.uid(),p_id,p_revision,'launcher-only-v1',app.name) on conflict do nothing;
  return p_id;
end $$;
revoke all on function kebu_marketplace_private.install_app(uuid,integer) from public,anon;
grant execute on function kebu_marketplace_private.install_app(uuid,integer) to authenticated;
create function public.marketplace_install_app(p_id uuid,p_revision integer)
returns uuid language sql security invoker set search_path='' as $$
  select kebu_marketplace_private.install_app(p_id,p_revision);
$$;
revoke all on function public.marketplace_install_app(uuid,integer) from public,anon;
grant execute on function public.marketplace_install_app(uuid,integer) to authenticated;
