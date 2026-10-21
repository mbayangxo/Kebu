-- Buyers may not manufacture paid ownership or payment references through REST.
-- Trusted acquisition routes authenticate the buyer, resolve server-side prices,
-- then insert marketplace/catalog checkout rows with the service-role client.
-- Keep self-uploaded aesthetics and genuinely free published assets available.
drop policy if exists "Owners insert creative asset library" on public.creative_asset_library;
create policy "Owners insert creative asset library"
  on public.creative_asset_library for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'owned' and amount_cents = 0
    and provider_reference is null and provider_payment_id is null and provider is null
    and exists (
      select 1 from public.marketplace_creative_assets a
      where a.id = asset_id and a.status = 'published' and a.price_cents = 0
    )
  );

drop policy if exists "Owners insert aesthetic library" on public.aesthetic_library;
create policy "Owners insert aesthetic library"
  on public.aesthetic_library for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and kind = 'upload' and status = 'owned'
    and amount_usd_cents = 0 and marketplace_id is null and catalog_slug is null
    and provider_reference is null and provider_payment_id is null and provider is null
  );

-- These are immutable ownership/checkout records, not an editable document.
-- Owner DELETE/SELECT policies remain intact. Editing a purchased aesthetic
-- creates/updates the buyer's project theme, not the original library receipt.
drop policy if exists "Owners update creative asset library" on public.creative_asset_library;
drop policy if exists "Owners update aesthetic library" on public.aesthetic_library;
revoke update on public.creative_asset_library, public.aesthetic_library from authenticated, anon;
grant select, insert, update on public.creative_asset_library, public.aesthetic_library to service_role;

-- Ambiguous references must fail the migration rather than arbitrarily granting
-- ownership. Existing duplicate references require explicit operator review.
create unique index if not exists creative_asset_library_payment_reference_unique
  on public.creative_asset_library(provider_reference) where provider_reference is not null;
create unique index if not exists aesthetic_library_payment_reference_unique
  on public.aesthetic_library(provider_reference) where provider_reference is not null;
