-- P2: Centralized account entitlements (e.g. african_opportunity_access for Kebu Opportunity OS).

create table if not exists public.account_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_key text not null check (char_length(trim(entitlement_key)) between 2 and 80),
  status text not null default 'none' check (
    status in ('none', 'pending', 'verified', 'revoked')
  ),
  source text,
  granted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement_key)
);

create index if not exists account_entitlements_key_status_idx
  on public.account_entitlements (entitlement_key, status);

alter table public.account_entitlements enable row level security;

drop policy if exists "Users read own entitlements" on public.account_entitlements;
create policy "Users read own entitlements"
  on public.account_entitlements for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own entitlements" on public.account_entitlements;
create policy "Users upsert own entitlements"
  on public.account_entitlements for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own entitlements" on public.account_entitlements;
create policy "Users update own entitlements"
  on public.account_entitlements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists account_entitlements_set_updated_at on public.account_entitlements;
create trigger account_entitlements_set_updated_at
  before update on public.account_entitlements
  for each row execute function public.set_updated_at();

grant select, insert, update on public.account_entitlements to authenticated;
