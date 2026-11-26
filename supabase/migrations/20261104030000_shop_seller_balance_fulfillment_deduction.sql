-- Integrates Joko Fulfillment commission into the real seller balance.
--
-- Commercial rule, verified not assumed (checked both functions' source tables
-- directly before writing this): the marketplace revenue split in
-- getDeveloperEarningsSummary() (lib/create/developer-payouts.ts) and the Joko
-- Fulfillment commission here apply to two disjoint transaction types and never
-- stack on the same dollar.
--   - Marketplace split taxes ONLY aesthetic_library / creative_asset_library
--     rows (a developer selling a template or Studio asset on Kebu's own
--     marketplace) via marketplace_templates / marketplace_creative_assets.
--   - shop_seller_balance taxes ONLY shop_payment_ledger_events (a seller's own
--     storefront order). A Shop order is never subject to the marketplace split.
-- So on a $100 Shop-order subtotal fulfilled via Joko, the seller's correct net
-- is $85 (100 - 15% Joko commission) — there is no separate marketplace cut to
-- additionally remove from a Shop order. This migration implements exactly that:
-- subtract shop_fulfillment_commission_total(p_project_id) (20261104020000) from
-- the seller's available balance. Postgres cannot ALTER a function's return
-- table shape, so this drops and recreates shop_seller_balance with one added
-- column (fulfillment_commission_xof) for transparency, not just a silent
-- subtraction — a seller/admin reading this balance should be able to see the
-- deduction, not just its result.

drop function if exists public.shop_seller_balance(uuid);

create function public.shop_seller_balance(p_project_id uuid)
returns table(
  collected_xof bigint,
  fulfillment_commission_xof bigint,
  requested_or_paid_xof bigint,
  available_xof bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with collected as (
    select coalesce(sum(amount_xof), 0)::bigint as total
    from public.shop_payment_ledger_events
    where project_id = p_project_id
      and event_type = 'paid'
      and rail = any (public.shop_kebu_controlled_rails())
      and coalesce(currency, 'XOF') = 'XOF'
  ),
  commission as (
    select public.shop_fulfillment_commission_total(p_project_id) as total
  ),
  committed as (
    select coalesce(sum(amount_xof), 0)::bigint as total
    from public.shop_payout_requests
    where project_id = p_project_id
      and status in ('requested', 'processing', 'paid')
  )
  select
    collected.total,
    commission.total,
    committed.total,
    greatest(0, collected.total - commission.total - committed.total)
  from collected, commission, committed;
$$;

-- Same trust boundary as before this migration: service-role only, caller must
-- already have run assertShopProjectAccess. Granting this to `authenticated`
-- would let any signed-in user read any other seller's revenue directly.
revoke all on function public.shop_seller_balance(uuid) from public, anon, authenticated;
grant execute on function public.shop_seller_balance(uuid) to service_role;

notify pgrst, 'reload schema';
