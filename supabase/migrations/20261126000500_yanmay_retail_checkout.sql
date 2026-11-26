create table public.retail_menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  location_id uuid not null,
  recipe_id uuid not null references public.retail_recipe_versions(id) on delete cascade,
  unit_cents integer not null check (unit_cents between 1 and 1000000),
  tax_bps integer not null check (tax_bps between 0 and 10000),
  unique (location_id,recipe_id),
  foreign key (business_id,location_id) references public.retail_locations(business_id,id) on delete cascade
);
create table public.retail_checkouts (
  id uuid primary key,
  business_id uuid not null,
  location_id uuid not null,
  device_id uuid not null references public.retail_devices(id) on delete cascade,
  quantities jsonb not null,
  lines jsonb not null,
  subtotal_cents bigint not null,
  tax_cents bigint not null,
  total_cents bigint generated always as (subtotal_cents + tax_cents) stored,
  created_at timestamptz not null default now(),
  foreign key (business_id,location_id) references public.retail_locations(business_id,id) on delete cascade
);
alter table public.retail_menu_items enable row level security;
alter table public.retail_checkouts enable row level security;
revoke all on public.retail_menu_items, public.retail_checkouts from public, anon, authenticated;
grant select on public.retail_menu_items to authenticated;
create policy retail_menu_admin_read on public.retail_menu_items for select to authenticated using (exists (
  select 1 from public.business_members m where m.business_id=retail_menu_items.business_id
    and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','administrator')
));

create function public.retail_set_menu_item(store uuid, recipe uuid, price integer, rate integer)
returns void language plpgsql security definer set search_path='' as $$
declare tenant uuid;
begin
  select l.business_id into tenant from public.retail_locations l where l.id=store and l.active;
  if not exists (select 1 from public.business_members m where m.business_id=tenant
    and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','administrator'))
  then raise exception 'Menu access denied' using errcode='42501'; end if;
  if not exists (
    select 1 from public.retail_recipe_versions r join public.project_products p on p.id=r.product_id
    join public.projects j on j.id=p.project_id
    where r.id=recipe and r.business_id=tenant and j.business_id=tenant and p.is_active
  ) then raise exception 'Recipe unavailable for store' using errcode='22023'; end if;
  insert into public.retail_menu_items(business_id,location_id,recipe_id,unit_cents,tax_bps)
  values(tenant,store,recipe,price,rate)
  on conflict(location_id,recipe_id) do update set unit_cents=excluded.unit_cents,tax_bps=excluded.tax_bps;
end $$;
revoke all on function public.retail_set_menu_item(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.retail_set_menu_item(uuid,uuid,integer,integer) to authenticated;

create function public.retail_checkout_device(tenant uuid, fingerprint text, mode text)
returns public.retail_devices language plpgsql stable security definer set search_path='' as $$
declare device public.retail_devices;
begin
  select d.* into device from public.retail_devices d join public.retail_locations l on l.id=d.location_id
  where d.business_id=tenant and d.credential_hash=fingerprint and d.revoked_at is null and l.active and d.kind=mode;
  if not found or mode not in ('register','kiosk') then raise exception 'Device access denied' using errcode='42501'; end if;
  if mode='register' and not exists (
    select 1 from public.business_members m where m.business_id=tenant and m.user_id=(select auth.uid()) and m.status='active'
    and (m.role in ('founder','administrator') or exists (
      select 1 from public.retail_staff_assignments a where a.location_id=device.location_id and a.user_id=m.user_id and a.capability='register'
    ))
  ) then raise exception 'Register access denied' using errcode='42501'; end if;
  return device;
end $$;
revoke all on function public.retail_checkout_device(uuid,text,text) from public,anon,authenticated;

create function public.retail_order_menu(tenant uuid, fingerprint text, mode text)
returns table(id uuid, name text, version integer, unit_cents integer)
language sql stable security definer set search_path='' as $$
  select i.id,p.name,r.version,i.unit_cents
  from public.retail_checkout_device(tenant,fingerprint,mode) d
  join public.retail_menu_items i on i.location_id=d.location_id
  join public.retail_recipe_versions r on r.id=i.recipe_id
  join public.project_products p on p.id=r.product_id and p.is_active
  join public.projects j on j.id=p.project_id and j.business_id=tenant
  order by p.name,r.version
$$;
revoke all on function public.retail_order_menu(uuid,text,text) from public;
grant execute on function public.retail_order_menu(uuid,text,text) to anon,authenticated;

create function public.retail_create_checkout(tenant uuid, fingerprint text, mode text, request_id uuid, quantities jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  device public.retail_devices;
  saved public.retail_checkouts;
  snapshot jsonb;
  subtotal bigint;
  tax bigint;
begin
  device := public.retail_checkout_device(tenant,fingerprint,mode);
  if jsonb_typeof(quantities) is distinct from 'object' then
    raise exception 'Invalid cart' using errcode='22023';
  end if;
  if (select count(*) from jsonb_each(quantities)) not between 1 and 30 or exists (
    select 1 from jsonb_each(quantities) e where e.key !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or jsonb_typeof(e.value) <> 'number' or e.value::text !~ '^[1-9][0-9]?$'
  ) then raise exception 'Invalid cart' using errcode='22023'; end if;

  select * into saved from public.retail_checkouts where id=request_id;
  if not found then
    select jsonb_agg(jsonb_build_object('menu_item_id',i.id,'name',p.name,'recipe_version_id',r.id,
      'unit_cents',i.unit_cents,'tax_bps',i.tax_bps,'quantity',q.value::int) order by i.id),
      sum(i.unit_cents::bigint*q.value::int),
      sum((i.unit_cents::bigint*q.value::int*i.tax_bps+5000)/10000)
    into snapshot,subtotal,tax
    from jsonb_each_text(quantities) q
    join public.retail_menu_items i on i.id=q.key::uuid and i.location_id=device.location_id
    join public.retail_recipe_versions r on r.id=i.recipe_id
    join public.project_products p on p.id=r.product_id and p.is_active
    join public.projects j on j.id=p.project_id and j.business_id=tenant;
    if snapshot is null or jsonb_array_length(snapshot) <> (select count(*) from jsonb_each(quantities))
    then raise exception 'Cart contains unavailable item' using errcode='22023'; end if;

    insert into public.retail_checkouts(id,business_id,location_id,device_id,quantities,lines,subtotal_cents,tax_cents)
    values(request_id,tenant,device.location_id,device.id,quantities,snapshot,subtotal,tax)
    on conflict(id) do nothing;
    select * into saved from public.retail_checkouts where id=request_id;
  end if;
  if saved.device_id is distinct from device.id or saved.quantities is distinct from quantities
  then raise exception 'Checkout request conflict' using errcode='22023'; end if;
  return jsonb_build_object('id',saved.id,'subtotal_cents',saved.subtotal_cents,'tax_cents',saved.tax_cents,'total_cents',saved.total_cents);
end $$;
revoke all on function public.retail_create_checkout(uuid,text,text,uuid,jsonb) from public;
grant execute on function public.retail_create_checkout(uuid,text,text,uuid,jsonb) to anon,authenticated;

create function public.retail_menu_recipes(tenant uuid)
returns table(id uuid, name text, version integer)
language sql stable security definer set search_path='' as $$
  select r.id,p.name,r.version from public.retail_recipe_versions r
  join public.project_products p on p.id=r.product_id and p.is_active
  join public.projects j on j.id=p.project_id and j.business_id=tenant
  where r.business_id=tenant and exists (
    select 1 from public.business_members m where m.business_id=tenant and m.user_id=(select auth.uid())
      and m.status='active' and m.role in ('founder','administrator')
  )
  order by p.name,r.version desc
$$;
revoke all on function public.retail_menu_recipes(uuid) from public,anon;
grant execute on function public.retail_menu_recipes(uuid) to authenticated;
