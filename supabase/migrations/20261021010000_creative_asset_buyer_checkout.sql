-- Real buyer checkout for paid Creative Assets — the same Joko checkout
-- pattern already proven end-to-end by aesthetic_library/marketplace_templates
-- (lib/create/aesthetics-marketplace.ts, app/api/webhooks/joko/route.ts).
-- A priced asset could already be listed (20261020040000 gated that on a
-- real payout destination) but acquireCreativeAsset() flatly refused any
-- purchase with price_cents > 0 — "Paid assets are not available yet." This
-- migration adds the pending/paid lifecycle so a buyer can actually pay.

alter table public.creative_asset_library
  drop constraint if exists creative_asset_library_owner_id_asset_id_key;

alter table public.creative_asset_library
  drop constraint if exists creative_asset_library_status_check;

alter table public.creative_asset_library
  add constraint creative_asset_library_status_check
    check (status in ('owned', 'pending', 'failed'));

alter table public.creative_asset_library
  add column if not exists amount_cents integer not null default 0 check (amount_cents >= 0),
  add column if not exists joko_reference text,
  add column if not exists joko_payment_id text,
  add column if not exists updated_at timestamptz not null default now();

-- A free acquire still gets at most one row per user+asset. A paid purchase
-- may retry (a failed/abandoned Joko session should not block a second
-- attempt), so the "one owned copy" rule is enforced only for status='owned',
-- mirroring aesthetic_library's exact precedent.
create unique index if not exists idx_creative_asset_library_owned_once
  on public.creative_asset_library (owner_id, asset_id)
  where status = 'owned';

drop trigger if exists creative_asset_library_set_updated_at on public.creative_asset_library;
create trigger creative_asset_library_set_updated_at
  before update on public.creative_asset_library
  for each row execute function public.set_updated_at();

-- A pending purchase can't be cancelled by deleting the row out from under an
-- in-flight payment — same rule as aesthetic_library.
drop policy if exists "Owners delete creative asset library" on public.creative_asset_library;
create policy "Owners delete creative asset library"
  on public.creative_asset_library for delete
  using (owner_id = auth.uid() and status <> 'pending');

-- The owner's own checkout-initiation step needs to record the Joko payment
-- id (or mark its own attempt failed) on the pending row it just inserted.
-- Deliberately NOT mirroring aesthetic_library's owner UPDATE policy as-is:
-- that policy's WITH CHECK only verifies owner_id, with no status
-- restriction, which lets the owner's own row UPDATE set status='owned'
-- directly via PostgREST without ever paying. Blocking "-> owned" here
-- closes that path for this table; only service_role (the Joko webhook,
-- which bypasses RLS) can ever mark a row owned.
drop policy if exists "Owners update creative asset library" on public.creative_asset_library;
create policy "Owners update creative asset library"
  on public.creative_asset_library for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status <> 'owned');

grant update on public.creative_asset_library to authenticated, service_role;
