-- Query-informed indexes for live Kebu access paths.
-- Deliberately limited: do not create every advisor-suggested FK index blindly.
create index if not exists website_assets_project_id_idx
  on public.website_assets (project_id);

create index if not exists business_email_subscribers_project_id_idx
  on public.business_email_subscribers (project_id)
  where project_id is not null;

create index if not exists reach_campaigns_project_id_idx
  on public.reach_campaigns (project_id)
  where project_id is not null;

create index if not exists reach_campaigns_business_id_idx
  on public.reach_campaigns (business_id)
  where business_id is not null;

create index if not exists shop_order_items_product_id_idx
  on public.shop_order_items (product_id)
  where product_id is not null;

create index if not exists shop_order_items_variant_id_idx
  on public.shop_order_items (variant_id)
  where variant_id is not null;
