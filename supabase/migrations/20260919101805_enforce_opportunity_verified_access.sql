-- Opportunity OS access is derived from server-reviewed Afrique ID status.
-- Clients can read their entitlement projection but cannot self-grant it.

drop policy if exists "Users upsert own entitlements" on public.account_entitlements;
drop policy if exists "Users update own entitlements" on public.account_entitlements;
revoke insert, update, delete on public.account_entitlements from authenticated;

drop policy if exists "Anyone can read opportunities" on public.opportunities;
drop policy if exists "Only service role can insert/update opportunities" on public.opportunities;
drop policy if exists "Only service role can update opportunities" on public.opportunities;

revoke all on public.opportunities from anon;
revoke insert, update, delete on public.opportunities from authenticated;
grant select on public.opportunities to authenticated;

create policy "Verified indigenous users read opportunities"
  on public.opportunities
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.afrique_ids aid
      where aid.user_id = (select auth.uid())
        and aid.eligibility_status = 'verified'
        and aid.identity_type = 'indigenous'
    )
  );

drop policy if exists "Users can manage their own saved opportunities" on public.saved_opportunities;
create policy "Verified users manage own saved opportunities"
  on public.saved_opportunities
  for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.afrique_ids aid
      where aid.user_id = (select auth.uid())
        and aid.eligibility_status = 'verified'
        and aid.identity_type = 'indigenous'
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.afrique_ids aid
      where aid.user_id = (select auth.uid())
        and aid.eligibility_status = 'verified'
        and aid.identity_type = 'indigenous'
    )
  );
