-- Closes a real concurrency race in chargeBoardClickCpc (lib/reach/wallet.ts):
-- the old code read reach_wallets.balance_cauris and reach_campaigns.spent_cauris
-- (the latter passed in by the caller from an earlier, separate SELECT), computed
-- the new values in application code, then wrote them back with plain UPDATEs --
-- a classic read-then-write race. Two concurrent board_click events for the same
-- campaign (trivially triggerable: this is a public, unauthenticated endpoint)
-- both read the same stale spent_cauris/balance_cauris, both compute the same
-- "next" values, and the second UPDATE clobbers the first -- the wallet is only
-- ever decremented once instead of twice, and spent_cauris never properly
-- accumulates, so a campaign can be charged far beyond its own budget_cap_cauris
-- under concurrent clicks even though each individual charge was logged to
-- reach_wallet_ledger (the ledger is correct; wallet/campaign state silently
-- drifts away from it).
--
-- This function makes the whole charge one atomic, serializable operation:
-- `for update` on the campaign row serializes concurrent charges against the
-- same campaign (the real remaining budget is re-read after the lock is
-- acquired, not trusted from an earlier SELECT); the wallet UPDATE's own WHERE
-- clause re-checks balance_cauris >= charge atomically against whatever the
-- column actually holds at write time, so a concurrent charge against a
-- different campaign but the same wallet can never push the balance negative
-- or silently clobber another charge.
create or replace function public.charge_board_click_cpc(
  p_owner_id uuid,
  p_campaign_id uuid,
  p_bid_cpc numeric
)
returns table (charged numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining numeric;
  v_charge numeric;
  v_new_balance numeric;
begin
  if p_bid_cpc is null or p_bid_cpc <= 0 then
    raise exception 'invalid_bid';
  end if;

  select greatest(budget_cap_cauris - spent_cauris, 0) into v_remaining
  from public.reach_campaigns
  where id = p_campaign_id and owner_id = p_owner_id
  for update;

  if v_remaining is null then
    raise exception 'campaign_not_found';
  end if;

  v_charge := round(least(p_bid_cpc, v_remaining)::numeric, 2);
  if v_charge <= 0 then
    raise exception 'budget_exhausted';
  end if;

  update public.reach_wallets
  set balance_cauris = balance_cauris - v_charge, updated_at = now()
  where owner_id = p_owner_id and balance_cauris >= v_charge
  returning balance_cauris into v_new_balance;

  if v_new_balance is null then
    raise exception 'insufficient_balance';
  end if;

  update public.reach_campaigns
  set spent_cauris = spent_cauris + v_charge
  where id = p_campaign_id and owner_id = p_owner_id;

  insert into public.reach_wallet_ledger (owner_id, amount_cauris, reason, campaign_id, meta)
  values (p_owner_id, -v_charge, 'board_click_cpc', p_campaign_id, jsonb_build_object('bid_cpc', p_bid_cpc));

  return query select v_charge;
end;
$$;

revoke execute on function public.charge_board_click_cpc(uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.charge_board_click_cpc(uuid, uuid, numeric) to service_role;
