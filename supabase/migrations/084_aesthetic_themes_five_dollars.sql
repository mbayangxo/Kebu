-- Catalog aesthetics: sell each theme at $5 (500 USD cents).
-- Does not change already-paid library ownership rows.

update public.site_templates
set
  requires_purchase = true,
  price_usd_cents = 500
where coalesce(price_usd_cents, 0) = 0
   or requires_purchase is distinct from true;

-- Developer marketplace listings that were free default stay free until the seller sets a price.
-- New sells from the UI default to $5 (see aesthetics-store-client).
