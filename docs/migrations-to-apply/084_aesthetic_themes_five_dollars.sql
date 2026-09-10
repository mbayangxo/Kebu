-- Mirror for paste-into-Supabase workflow.
-- Catalog aesthetics: $5 each.

update public.site_templates
set
  requires_purchase = true,
  price_usd_cents = 500
where coalesce(price_usd_cents, 0) = 0
   or requires_purchase is distinct from true;
