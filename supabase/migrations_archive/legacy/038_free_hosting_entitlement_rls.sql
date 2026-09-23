-- Free hosting entitlement: owners may insert active Free ($0) rows.
-- Migration 010 only allowed status = 'pending', so ensureFreeHostingEntitlement
-- failed under RLS and publish returned 402 for non-exempt users.

drop policy if exists "Owners insert pending site subscriptions" on public.site_subscriptions;
drop policy if exists "Owners insert site subscriptions" on public.site_subscriptions;

create policy "Owners insert site subscriptions"
  on public.site_subscriptions for insert
  with check (
    owner_id = auth.uid()
    and (
      status = 'pending'
      or (
        status = 'active'
        and coalesce(tier, 'free') = 'free'
        and amount_usd_cents = 0
      )
    )
  );

comment on policy "Owners insert site subscriptions" on public.site_subscriptions is
  'Owners start paid JOKO checkouts as pending, or claim Free (active, $0) without a card.';
