-- Only trusted payment reconciliation can insert a settlement. Unpaid checkouts
-- never appear in the kitchen queue. Provider integrations are separate.
create table public.retail_settlements (
  checkout_id uuid primary key references public.retail_checkouts(id) on delete restrict,
  provider text not null check (length(trim(provider)) between 1 and 80),
  provider_reference text not null check (length(trim(provider_reference)) between 1 and 255),
  paid_cents bigint not null check (paid_cents > 0),
  currency text not null check (currency = 'USD'),
  settled_at timestamptz not null default now(),
  kitchen_state text not null default 'new' check (kitchen_state in ('new','preparing','ready')),
  unique(provider,provider_reference)
);
alter table public.retail_settlements enable row level security;
revoke all on public.retail_settlements from public,anon,authenticated;
grant select, insert (checkout_id,provider,provider_reference,paid_cents,currency) on public.retail_settlements to service_role;

create function public.retail_kitchen_location(tenant uuid, fingerprint text)
returns uuid language sql stable security definer set search_path='' as $$
  select d.location_id from public.retail_devices d
  join public.retail_locations l on l.id=d.location_id and l.active
  join public.business_members m on m.business_id=d.business_id
  where d.business_id=tenant and d.credential_hash=fingerprint and d.revoked_at is null and d.kind='kitchen'
    and m.user_id=(select auth.uid()) and m.status='active'
    and (m.role in ('founder','administrator') or exists (
      select 1 from public.retail_staff_assignments a where a.location_id=d.location_id and a.user_id=m.user_id and a.capability='kitchen'
    ))
$$;
revoke all on function public.retail_kitchen_location(uuid,text) from public,anon,authenticated;

create function public.retail_kitchen_queue(tenant uuid, fingerprint text)
returns table(id uuid, lines jsonb, state text, settled_at timestamptz)
language sql stable security definer set search_path='' as $$
  select c.id,c.lines,s.kitchen_state,s.settled_at
  from public.retail_checkouts c join public.retail_settlements s on s.checkout_id=c.id
  where c.business_id=tenant and c.location_id=public.retail_kitchen_location(tenant,fingerprint)
    and s.paid_cents=c.total_cents and s.currency='USD' and s.kitchen_state <> 'ready'
  order by s.settled_at,c.id
  limit 100
$$;
revoke all on function public.retail_kitchen_queue(uuid,text) from public,anon;
grant execute on function public.retail_kitchen_queue(uuid,text) to authenticated;

create function public.retail_advance_kitchen(tenant uuid, fingerprint text, ticket uuid, expected_state text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if expected_state not in ('new','preparing') then return false; end if;
  update public.retail_settlements s set kitchen_state=case expected_state when 'new' then 'preparing' else 'ready' end
  from public.retail_checkouts c
  where s.checkout_id=ticket and c.id=s.checkout_id and c.business_id=tenant
    and c.location_id=public.retail_kitchen_location(tenant,fingerprint)
    and s.paid_cents=c.total_cents and s.currency='USD' and s.kitchen_state=expected_state;
  return found;
end $$;
revoke all on function public.retail_advance_kitchen(uuid,text,uuid,text) from public,anon;
grant execute on function public.retail_advance_kitchen(uuid,text,uuid,text) to authenticated;
