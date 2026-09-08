-- 068 — Shop payment ledger (all rails → one event stream for analytics / future Joko scoring)
-- Apply after 067. Paste in Supabase SQL Editor.
-- Currency today: XOF (and labels). Future pan-African settlement unit: Cauris (ALK layer) — not live clearing yet.

create table if not exists public.shop_payment_ledger_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  order_id uuid references public.shop_orders(id) on delete set null,
  rail text not null
    check (rail in (
      'joko', 'wave', 'paystack', 'paypal', 'orange_money',
      'whatsapp', 'cod', 'mobile_money', 'card', 'manual', 'unknown'
    )),
  event_type text not null
    check (event_type in (
      'intent', 'checkout_started', 'awaiting', 'paid', 'failed', 'refunded', 'cancelled'
    )),
  amount_xof integer check (amount_xof is null or amount_xof >= 0),
  -- Settlement currency: XOF today; CAURIS when ALK clears.
  currency text not null default 'XOF'
    check (char_length(currency) between 3 and 12),
  provider text not null default ''
    check (char_length(provider) <= 40),
  provider_reference text not null default ''
    check (char_length(provider_reference) <= 200),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shop_payment_ledger_project_idx
  on public.shop_payment_ledger_events (project_id, created_at desc);

create index if not exists shop_payment_ledger_order_idx
  on public.shop_payment_ledger_events (order_id, created_at desc)
  where order_id is not null;

create index if not exists shop_payment_ledger_rail_idx
  on public.shop_payment_ledger_events (project_id, rail, event_type);

alter table public.shop_payment_ledger_events enable row level security;

drop policy if exists "Owners read shop_payment_ledger_events" on public.shop_payment_ledger_events;
create policy "Owners read shop_payment_ledger_events"
  on public.shop_payment_ledger_events for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- Inserts from service role / order APIs only (no client inserts).
notify pgrst, 'reload schema';
