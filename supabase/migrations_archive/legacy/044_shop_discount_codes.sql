-- Shop discount codes (% off) + optional campaign link.
-- Apply after shop orders (039+) and email campaigns (025).

create table if not exists public.shop_discount_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  code text not null,
  percent_off integer not null check (percent_off >= 1 and percent_off <= 90),
  is_active boolean not null default true,
  max_uses integer check (max_uses is null or max_uses >= 1),
  uses_count integer not null default 0 check (uses_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  campaign_id uuid references public.business_email_campaigns(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index if not exists shop_discount_codes_project_idx
  on public.shop_discount_codes (project_id, is_active);

alter table public.shop_orders
  add column if not exists discount_code text,
  add column if not exists discount_percent integer
    check (discount_percent is null or (discount_percent >= 1 and discount_percent <= 90)),
  add column if not exists amount_xof_before_discount integer
    check (amount_xof_before_discount is null or amount_xof_before_discount >= 0);

alter table public.business_email_campaigns
  add column if not exists discount_code_id uuid
    references public.shop_discount_codes(id) on delete set null;

alter table public.shop_discount_codes enable row level security;

drop policy if exists "Owners manage shop discount codes" on public.shop_discount_codes;
create policy "Owners manage shop discount codes"
  on public.shop_discount_codes for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_discount_codes.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_discount_codes.project_id
        and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_discount_codes_set_updated_at on public.shop_discount_codes;
create trigger shop_discount_codes_set_updated_at
  before update on public.shop_discount_codes
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
