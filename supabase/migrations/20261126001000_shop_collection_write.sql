-- Keep a collection and its ordered product selection in one transaction.
alter policy "Owners manage project_collection_items"
  on public.project_collection_items
  with check (
    exists (
      select 1
      from public.project_product_collections c
      join public.projects p on p.id = c.project_id
      join public.project_products product on product.project_id = p.id
      where c.id = project_collection_items.collection_id
        and product.id = project_collection_items.product_id
        and p.owner_id = (select auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.save_shop_collection(p_project uuid, p_collection uuid, p_fields jsonb, p_products uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  shop public.projects%rowtype;
  saved public.project_product_collections%rowtype;
  product_ids jsonb;
begin
  select * into shop from public.projects
  where id = p_project and owner_id = (select auth.uid());
  if not found then
    raise sqlstate 'PT404' using message = 'Project not found.';
  end if;

  if p_products is not null and (
    cardinality(p_products) > 48
    or cardinality(p_products) <> (
      select count(distinct product.id)
      from public.project_products product
      where product.project_id = p_project and product.id = any(p_products)
    )
  ) then
    raise sqlstate 'PT400' using message = 'Select distinct products from this shop.';
  end if;

  if p_collection is null then
    insert into public.project_product_collections (
      project_id, business_id, name, slug, description, image_url, sort_order, is_active
    ) values (
      p_project, shop.business_id, p_fields->>'name', p_fields->>'slug',
      coalesce(p_fields->>'description', ''), coalesce(p_fields->>'imageUrl', ''),
      coalesce(
        (p_fields->>'sortOrder')::integer,
        (select coalesce(max(c.sort_order), 0) + 1 from public.project_product_collections c where c.project_id = p_project)
      ),
      coalesce((p_fields->>'isActive')::boolean, true)
    ) returning * into saved;
  else
    update public.project_product_collections c set
      name = coalesce(p_fields->>'name', c.name),
      slug = coalesce(p_fields->>'slug', c.slug),
      description = coalesce(p_fields->>'description', c.description),
      image_url = coalesce(p_fields->>'imageUrl', c.image_url),
      sort_order = coalesce((p_fields->>'sortOrder')::integer, c.sort_order),
      is_active = coalesce((p_fields->>'isActive')::boolean, c.is_active)
    where c.id = p_collection and c.project_id = p_project
    returning * into saved;
    if not found then
      raise sqlstate 'PT404' using message = 'Collection not found.';
    end if;
  end if;

  if p_products is not null then
    delete from public.project_collection_items where collection_id = saved.id;
    insert into public.project_collection_items (collection_id, product_id, sort_order)
    select saved.id, selected.id, (selected.position - 1)::integer
    from unnest(p_products) with ordinality as selected(id, position);
  end if;

  select coalesce(jsonb_agg(i.product_id order by i.sort_order), '[]'::jsonb)
  into product_ids from public.project_collection_items i where i.collection_id = saved.id;
  return to_jsonb(saved) || jsonb_build_object('productIds', product_ids);
end;
$function$;
revoke execute on function public.save_shop_collection(uuid, uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.save_shop_collection(uuid, uuid, jsonb, uuid[]) to authenticated;
