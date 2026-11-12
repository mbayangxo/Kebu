-- Shop seller internal balance + payout requests.
--
-- Money model (confirmed by reading every checkout/adapter code path, not assumed):
-- every Shop payment rail except WhatsApp/manual and cash-on-delivery routes through
-- a Kebu-platform-controlled provider account (lib/payments/registry.ts: one Paystack,
-- one Wave, one PayPal, one Orange Money, one Joko credential set for the whole app).
-- Those rails' money lands in Kebu's own account, not the seller's — so Kebu owes the
-- seller an internal balance for it. WhatsApp/manual and COD never touch a Kebu account
-- (buyer and seller settle directly) and are deliberately excluded from this balance.
--
-- shop_payment_ledger_events already records a 'paid' row, inside the SAME transaction
-- as the order's payment_status update, for every provider-confirmed payment (see
-- complete_shop_payment / complete_verified_wave_payment / markShopOrderPaid). That table
-- is the source of truth here — this migration does not introduce a second, independently
-- mutable balance column that could drift from it. Balance is always computed fresh from
-- the ledger + payout request history, never stored.

create table if not exists public.shop_payout_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  amount_xof integer not null check (amount_xof > 0 and amount_xof <= 2000000000),
  method text not null check (method in ('wave', 'orange_money', 'bank_transfer', 'manual')),
  destination_phone text not null check (char_length(trim(destination_phone)) between 8 and 24),
  destination_account_name text not null check (char_length(trim(destination_account_name)) between 1 and 120),
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'paid', 'failed', 'cancelled')),
  provider_reference text check (provider_reference is null or char_length(provider_reference) <= 200),
  failure_reason text check (failure_reason is null or char_length(failure_reason) <= 500),
  note text check (note is null or char_length(note) <= 500),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null
);

create index if not exists shop_payout_requests_project_idx
  on public.shop_payout_requests (project_id, requested_at desc);

create index if not exists shop_payout_requests_status_idx
  on public.shop_payout_requests (status, requested_at)
  where status in ('requested', 'processing');

alter table public.shop_payout_requests enable row level security;

-- Mirrors the existing shop_orders policy shape exactly (migrations_archive/legacy/039_shop_orders.sql):
-- direct project owners get real RLS read access; business-team access goes through the
-- service-role path (assertShopProjectAccess → dbForProjectAccess), same as every other
-- shop table in this codebase. No INSERT/UPDATE policy — only the SECURITY DEFINER RPCs
-- below, and the service role, can write these rows. A seller can never insert an
-- arbitrary payout row, update its own status, or fabricate a provider_reference.
drop policy if exists "Owners read shop_payout_requests" on public.shop_payout_requests;
create policy "Owners read shop_payout_requests"
  on public.shop_payout_requests for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_payout_requests.project_id and p.owner_id = auth.uid()
    )
  );

revoke all on public.shop_payout_requests from public, anon, authenticated;
grant select on public.shop_payout_requests to authenticated;
grant all on public.shop_payout_requests to service_role;

-- Kebu-controlled rails only — never WhatsApp/manual/COD money the app never custodies.
create or replace function public.shop_kebu_controlled_rails()
returns text[]
language sql
immutable
as $$
  select array['paystack', 'wave', 'orange_money', 'paypal', 'joko']::text[];
$$;

-- Read-only balance snapshot. Computed fresh every call from the ledger (never cached),
-- so it can never silently drift from what was actually collected and actually withdrawn.
create or replace function public.shop_seller_balance(p_project_id uuid)
returns table(collected_xof bigint, requested_or_paid_xof bigint, available_xof bigint)
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
  committed as (
    select coalesce(sum(amount_xof), 0)::bigint as total
    from public.shop_payout_requests
    where project_id = p_project_id
      and status in ('requested', 'processing', 'paid')
  )
  select
    collected.total,
    committed.total,
    greatest(0, collected.total - committed.total)
  from collected, committed;
$$;

-- Service-role only: this function trusts p_project_id with no internal ownership check
-- (by design, same trust boundary as complete_shop_payment) — the calling API route must
-- have already run assertShopProjectAccess. Granting this to `authenticated` would let
-- any signed-in user read any other seller's revenue by calling the RPC directly with a
-- project_id they don't own.
revoke all on function public.shop_seller_balance(uuid) from public, anon, authenticated;
grant execute on function public.shop_seller_balance(uuid) to service_role;

-- Atomic request: locks the project (pg_advisory_xact_lock, scoped to this transaction)
-- so two concurrent requests from the same seller can never both read the same stale
-- available balance and both insert — the second call re-reads balance after the first
-- commits/aborts. Caller (the API route) must already have verified the requester's
-- access to p_project_id via assertShopProjectAccess before invoking this — same trust
-- boundary as complete_shop_payment, which is also service-role-only.
create or replace function public.request_shop_payout(
  p_project_id uuid,
  p_requested_by uuid,
  p_amount_xof integer,
  p_method text,
  p_destination_phone text,
  p_destination_account_name text
)
returns public.shop_payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance record;
  v_row public.shop_payout_requests%rowtype;
begin
  if p_amount_xof is null or p_amount_xof <= 0 then
    raise exception 'Payout amount must be greater than zero.';
  end if;
  if p_method not in ('wave', 'orange_money', 'bank_transfer', 'manual') then
    raise exception 'Unsupported payout method.';
  end if;
  if nullif(btrim(p_destination_phone), '') is null then
    raise exception 'A destination phone/account is required.';
  end if;

  -- Serialize concurrent payout requests for this project within this transaction only.
  perform pg_advisory_xact_lock(hashtext('shop_payout:' || p_project_id::text));

  select * into v_balance from public.shop_seller_balance(p_project_id);

  if p_amount_xof > v_balance.available_xof then
    raise exception 'Requested amount (% XOF) exceeds available balance (% XOF).',
      p_amount_xof, v_balance.available_xof;
  end if;

  insert into public.shop_payout_requests (
    project_id, requested_by, amount_xof, method, destination_phone, destination_account_name
  ) values (
    p_project_id, p_requested_by, p_amount_xof, p_method,
    btrim(p_destination_phone), btrim(p_destination_account_name)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.request_shop_payout(uuid, uuid, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.request_shop_payout(uuid, uuid, integer, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
