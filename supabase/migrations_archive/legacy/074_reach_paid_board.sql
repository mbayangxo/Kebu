-- Kebu Reach S10b: paid board placement · CPC bids · wallet · real impressions
-- Depends on: 072_reach_campaigns · auth.users · set_updated_at()

-- Campaign paid-board fields
alter table public.reach_campaigns
  add column if not exists board_enabled boolean not null default false;

alter table public.reach_campaigns
  add column if not exists bid_cpc_cauris numeric(12, 2) not null default 0
    check (bid_cpc_cauris >= 0 and bid_cpc_cauris <= 100000);

alter table public.reach_campaigns
  add column if not exists budget_cap_cauris numeric(12, 2) not null default 0
    check (budget_cap_cauris >= 0 and budget_cap_cauris <= 10000000);

alter table public.reach_campaigns
  add column if not exists spent_cauris numeric(12, 2) not null default 0
    check (spent_cauris >= 0);

alter table public.reach_campaigns
  add column if not exists creative_headline text
    check (creative_headline is null or char_length(trim(creative_headline)) <= 120);

alter table public.reach_campaigns
  add column if not exists creative_image_url text
    check (creative_image_url is null or char_length(trim(creative_image_url)) <= 500);

create index if not exists reach_campaigns_board_auction_idx
  on public.reach_campaigns (status, board_enabled, bid_cpc_cauris desc)
  where board_enabled = true and status = 'active';

-- Expand event types: impression + board_click (paid surface)
alter table public.reach_campaign_events
  drop constraint if exists reach_campaign_events_event_type_check;

alter table public.reach_campaign_events
  add constraint reach_campaign_events_event_type_check
  check (event_type in ('open', 'click', 'share', 'impression', 'board_click'));

-- Advertiser Reach wallet (platform credits until Joko ad-billing slice)
create table if not exists public.reach_wallets (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  balance_cauris numeric(12, 2) not null default 0
    check (balance_cauris >= 0 and balance_cauris <= 10000000),
  updated_at timestamptz not null default now()
);

create table if not exists public.reach_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  amount_cauris numeric(12, 2) not null,
  reason text not null check (char_length(trim(reason)) between 1 and 120),
  campaign_id uuid references public.reach_campaigns(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reach_wallet_ledger_owner_idx
  on public.reach_wallet_ledger (owner_id, created_at desc);

alter table public.reach_wallets enable row level security;
alter table public.reach_wallet_ledger enable row level security;

drop policy if exists "Owners manage reach wallets" on public.reach_wallets;
create policy "Owners read reach wallets"
  on public.reach_wallets for select
  using (owner_id = auth.uid());

drop policy if exists "Owners read reach wallet ledger" on public.reach_wallet_ledger;
create policy "Owners read reach wallet ledger"
  on public.reach_wallet_ledger for select
  using (owner_id = auth.uid());

-- Inserts to ledger/wallet mutations for spend go through service role API.

grant select on public.reach_wallets to authenticated;
grant select on public.reach_wallet_ledger to authenticated;
grant all on public.reach_wallets to service_role;
grant all on public.reach_wallet_ledger to service_role;

drop trigger if exists reach_wallets_set_updated_at on public.reach_wallets;
create trigger reach_wallets_set_updated_at
  before update on public.reach_wallets
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
