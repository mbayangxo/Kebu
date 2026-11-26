create table public.retail_recipe_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.project_products(id) on delete set null,
  version integer not null check (version > 0),
  instructions text not null check (length(trim(instructions)) between 1 and 12000),
  created_at timestamptz not null default now(),
  unique(business_id,product_id,version)
);
create index retail_recipe_versions_business_idx on public.retail_recipe_versions(business_id);
alter table public.retail_recipe_versions enable row level security;
revoke all on public.retail_recipe_versions from public, anon, authenticated;

create function public.retail_publish_recipe(target_business uuid, target_product uuid, recipe_instructions text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare next_version integer;
begin
  if not exists (
    select 1 from public.business_members m where m.business_id=target_business
      and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','administrator')
  ) then raise exception 'Retail recipe access denied' using errcode='42501'; end if;

  perform 1 from public.project_products p join public.projects j on j.id=p.project_id
  where p.id=target_product and j.business_id=target_business
  for update of p for share of j;
  if not found then raise exception 'Catalog product unavailable' using errcode='22023'; end if;

  select coalesce(max(r.version),0)+1 into next_version from public.retail_recipe_versions r
  where r.business_id=target_business and r.product_id=target_product;
  insert into public.retail_recipe_versions (business_id,product_id,version,instructions)
    values (target_business,target_product,next_version,recipe_instructions);
  return next_version;
end
$$;
revoke all on function public.retail_publish_recipe(uuid,uuid,text) from public, anon;
grant execute on function public.retail_publish_recipe(uuid,uuid,text) to authenticated;
