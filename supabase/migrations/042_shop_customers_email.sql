-- Shop customers: optional email on orders + order → email list source.
-- Apply in Supabase SQL Editor (after 039/041). Bootstraps email tables if 025 was never applied.

alter table public.shop_orders
  add column if not exists customer_email text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_orders_customer_email_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_customer_email_check
      check (
        customer_email is null
        or char_length(trim(customer_email)) between 3 and 254
      );
  end if;
end $$;

create index if not exists shop_orders_customer_email_idx
  on public.shop_orders (project_id, customer_email)
  where customer_email is not null;

-- Bootstrap subscribers if missing (025 never applied)
create table if not exists public.business_email_subscribers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  email text not null check (char_length(trim(email)) between 3 and 254),
  name text check (name is null or char_length(trim(name)) between 1 and 120),
  source text not null default 'site'
    check (source in ('site', 'manual', 'import', 'order')),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create index if not exists business_email_subscribers_business_idx
  on public.business_email_subscribers (business_id, created_at desc);

alter table public.business_email_subscribers enable row level security;

-- Allow source = order on older DBs
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'business_email_subscribers'
  ) then
    alter table public.business_email_subscribers
      drop constraint if exists business_email_subscribers_source_check;
    alter table public.business_email_subscribers
      add constraint business_email_subscribers_source_check
      check (source in ('site', 'manual', 'import', 'order'));
  end if;
end $$;

notify pgrst, 'reload schema';
