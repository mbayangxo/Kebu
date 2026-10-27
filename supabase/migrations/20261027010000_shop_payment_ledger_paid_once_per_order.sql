-- Closes a real duplicate-webhook race: markShopOrderPaid (JOKO) and
-- markShopOrderPaidByProviderRef (PayPal / any provider routed through it)
-- check shop_orders.payment_status === 'paid' and then separately insert a
-- 'paid' row into shop_payment_ledger_events -- a plain SELECT-then-INSERT,
-- not one atomic transaction. Two overlapping webhook deliveries for the
-- same order can both read "not yet paid" before either commits, so both
-- proceed to insert a 'paid' ledger row: a duplicate financial record, even
-- though commit_shop_checkout() itself is already safely idempotent (it
-- re-checks status='committed' under a row lock) so stock/discount usage is
-- never double-counted. Paystack and Wave don't have this gap -- their
-- complete_shop_payment()/complete_verified_wave_payment() RPCs do the
-- already-paid check and the ledger insert inside one SECURITY DEFINER
-- function, verified safe under real concurrent-backend races in
-- tests/payments/wave-settlement.native.local.test.ts.
--
-- A partial unique index is the right fix at this layer: an order
-- transitions to paid exactly once, so at most one 'paid' ledger row can
-- ever exist for a given order_id, enforced by Postgres itself regardless
-- of which application code path races. This does not change
-- shop_payment_ledger_events' table shape (created separately in
-- docs/migrations-to-apply/068_shop_payment_ledger.sql, not yet applied
-- hosted per IMPLEMENTATION_STATUS.md) -- a fresh install picks up the
-- index automatically once 068 runs, since this file only adds an index
-- and is safe to run before or after it.
create unique index if not exists shop_payment_ledger_paid_once_per_order_idx
  on public.shop_payment_ledger_events (order_id)
  where event_type = 'paid' and order_id is not null;
