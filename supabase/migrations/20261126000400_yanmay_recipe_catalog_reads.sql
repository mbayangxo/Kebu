create function public.retail_recipe_catalog(target_business uuid)
returns table(product_id uuid, name text, version integer, instructions text)
language sql stable security definer set search_path = ''
as $$
  select p.id,p.name,r.version,r.instructions
  from public.project_products p
  join public.projects j on j.id=p.project_id
  left join public.retail_recipe_versions r on r.business_id=j.business_id and r.product_id=p.id
  where j.business_id=target_business and exists (
    select 1 from public.business_members m where m.business_id=target_business
      and m.user_id=(select auth.uid()) and m.status='active' and m.role in ('founder','administrator')
  )
  order by p.name,p.id,r.version desc
$$;
revoke all on function public.retail_recipe_catalog(uuid) from public, anon;
grant execute on function public.retail_recipe_catalog(uuid) to authenticated;
