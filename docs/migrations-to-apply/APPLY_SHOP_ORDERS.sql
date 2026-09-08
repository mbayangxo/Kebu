-- =============================================================================
-- Kebu shop — ONE paste for Supabase SQL Editor → Run once
-- Creates catalog (project_products) if missing, then shop_orders, email lists,
-- discounts, UPC, cart + abandoned, stock, shopper accounts (048–050), payment providers (051).
-- Safe to re-run.
--
-- PREREQUISITE (will fail fast if missing):
--   public.projects, public.businesses, public.set_updated_at()
-- Foundation: paste supabase/migrations/APPLY_ALL_PHASE_ONE.sql first
--   (or at least 004_create_projects.sql + APPLY_MIGRATIONS_005_007.sql).
-- =============================================================================

do $$
begin
  if to_regclass('public.projects') is null then
    raise exception
      'public.projects is missing. Apply foundation first: supabase/migrations/APPLY_ALL_PHASE_ONE.sql (or 004_create_projects.sql), then re-run APPLY_SHOP_ORDERS.sql.';
  end if;
  if to_regclass('public.businesses') is null then
    raise exception
      'public.businesses is missing. Apply foundation first: supabase/migrations/APPLY_MIGRATIONS_005_007.sql (or APPLY_ALL_PHASE_ONE.sql), then re-run APPLY_SHOP_ORDERS.sql.';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception
      'public.set_updated_at() is missing. Apply foundation (APPLY_ALL_PHASE_ONE.sql includes it), then re-run APPLY_SHOP_ORDERS.sql.';
  end if;
end $$;

-- >>> 022 project_products (catalog)

create table if not exists public.project_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  price_label text not null default '' check (char_length(price_label) <= 60),
  image_url text not null default '' check (char_length(image_url) <= 500),
  whatsapp_order_message text not null default '' check (char_length(whatsapp_order_message) <= 300),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional FK to businesses when that table exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'businesses'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'project_products'
      and constraint_name = 'project_products_business_id_fkey'
  ) then
    alter table public.project_products
      add constraint project_products_business_id_fkey
      foreign key (business_id) references public.businesses(id) on delete set null;
  end if;
end $$;

create index if not exists project_products_project_idx
  on public.project_products (project_id, sort_order);
create index if not exists project_products_business_idx
  on public.project_products (business_id)
  where business_id is not null;

alter table public.project_products enable row level security;

drop policy if exists "Owners manage project_products" on public.project_products;
create policy "Owners manage project_products"
  on public.project_products for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_products.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_products.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists project_products_set_updated_at on public.project_products;
create trigger project_products_set_updated_at
  before update on public.project_products
  for each row execute function public.set_updated_at();

-- >>> 039 shop_orders

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid references public.project_products(id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) between 1 and 120),
  price_label text not null default '' check (char_length(price_label) <= 60),
  quantity integer not null default 1 check (quantity between 1 and 20),
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 80),
  customer_phone text not null check (char_length(trim(customer_phone)) between 8 and 24),
  customer_note text not null default '' check (char_length(customer_note) <= 400),
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'fulfilled', 'cancelled')),
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_project_idx
  on public.shop_orders (project_id, created_at desc);

create index if not exists shop_orders_product_idx
  on public.shop_orders (product_id)
  where product_id is not null;

alter table public.shop_orders enable row level security;

drop policy if exists "Owners read shop_orders" on public.shop_orders;
create policy "Owners read shop_orders"
  on public.shop_orders for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_orders.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update shop_orders" on public.shop_orders;
create policy "Owners update shop_orders"
  on public.shop_orders for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_orders.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_orders.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_orders_set_updated_at on public.shop_orders;
create trigger shop_orders_set_updated_at
  before update on public.shop_orders
  for each row execute function public.set_updated_at();

-- >>> 041 payment preference (card / PayPal / COD / …)
alter table public.shop_orders
  add column if not exists payment_preference text not null default 'whatsapp';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_orders_payment_preference_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_payment_preference_check
      check (
        payment_preference in (
          'whatsapp',
          'cod',
          'mobile_money',
          'card',
          'paypal',
          'joko'
        )
      );
  end if;
end $$;

-- Shop customers: optional email on orders + order → email list source.
-- Apply in Supabase SQL Editor (after 039/041 + 025).

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

-- >>> 025 email lists (bootstrap if missing — Customers + order email + abandoned recovery)
-- Safe when APPLY_ALL was never run. Requires public.businesses. Does not require create_designs.

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'businesses'
  ) then
    raise exception 'public.businesses is missing. Apply Kebu Phase One / businesses migration first, then re-run APPLY_SHOP_ORDERS.sql.';
  end if;
end $$;

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

create table if not exists public.business_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  body_html text not null default '' check (char_length(body_html) <= 50000),
  body_text text not null default '' check (char_length(body_text) <= 20000),
  from_name text not null default '' check (char_length(from_name) <= 120),
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  recipient_count integer not null default 0 check (recipient_count >= 0),
  sent_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_email_campaigns_business_idx
  on public.business_email_campaigns (business_id, created_at desc);

-- Optional Create poster link when that table exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'create_designs'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_email_campaigns'
      and column_name = 'create_design_id'
  ) then
    alter table public.business_email_campaigns
      add column create_design_id uuid references public.create_designs(id) on delete set null;
  end if;
end $$;

create table if not exists public.business_email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.business_email_campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.business_email_subscribers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  unique (campaign_id, subscriber_id)
);

alter table public.business_email_subscribers enable row level security;
alter table public.business_email_campaigns enable row level security;
alter table public.business_email_campaign_recipients enable row level security;

-- Widen source check on older DBs that only allow site/manual/import
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

-- Owner/manager policies (skip if business_members missing)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'business_members'
  ) then
    drop policy if exists "Managers manage subscribers" on public.business_email_subscribers;
    create policy "Managers manage subscribers"
      on public.business_email_subscribers for all
      using (
        exists (
          select 1 from public.business_members m
          where m.business_id = business_email_subscribers.business_id
            and m.user_id = auth.uid() and m.status = 'active'
            and m.role in ('founder', 'administrator', 'store_manager')
        )
      )
      with check (
        exists (
          select 1 from public.business_members m
          where m.business_id = business_email_subscribers.business_id
            and m.user_id = auth.uid() and m.status = 'active'
            and m.role in ('founder', 'administrator', 'store_manager')
        )
      );

    drop policy if exists "Managers manage campaigns" on public.business_email_campaigns;
    create policy "Managers manage campaigns"
      on public.business_email_campaigns for all
      using (
        exists (
          select 1 from public.business_members m
          where m.business_id = business_email_campaigns.business_id
            and m.user_id = auth.uid() and m.status = 'active'
            and m.role in ('founder', 'administrator', 'store_manager')
        )
      )
      with check (
        exists (
          select 1 from public.business_members m
          where m.business_id = business_email_campaigns.business_id
            and m.user_id = auth.uid() and m.status = 'active'
            and m.role in ('founder', 'administrator', 'store_manager')
        )
      );

    drop policy if exists "Managers read campaign recipients" on public.business_email_campaign_recipients;
    create policy "Managers read campaign recipients"
      on public.business_email_campaign_recipients for select
      using (
        exists (
          select 1 from public.business_email_campaigns c
          join public.business_members m on m.business_id = c.business_id
          where c.id = business_email_campaign_recipients.campaign_id
            and m.user_id = auth.uid() and m.status = 'active'
            and m.role in ('founder', 'administrator', 'store_manager')
        )
      );
  end if;
end $$;

drop trigger if exists business_email_campaigns_set_updated_at on public.business_email_campaigns;
create trigger business_email_campaigns_set_updated_at
  before update on public.business_email_campaigns
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- >>> 043 JOKO product pay-in + numeric XOF
alter table public.project_products
  add column if not exists price_xof integer
  check (price_xof is null or price_xof >= 0);

alter table public.shop_orders
  add column if not exists payment_status text not null default 'unpaid';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shop_orders_payment_status_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_payment_status_check
      check (
        payment_status in ('unpaid', 'awaiting_payment', 'paid', 'failed')
      );
  end if;
end $$;

alter table public.shop_orders
  add column if not exists joko_reference text,
  add column if not exists joko_payment_id text,
  add column if not exists amount_xof integer
  check (amount_xof is null or amount_xof >= 0);

create index if not exists shop_orders_joko_reference_idx
  on public.shop_orders (joko_reference)
  where joko_reference is not null;

notify pgrst, 'reload schema';
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
  campaign_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'business_email_campaigns'
  ) and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'shop_discount_codes'
      and constraint_name = 'shop_discount_codes_campaign_id_fkey'
  ) then
    alter table public.shop_discount_codes
      add constraint shop_discount_codes_campaign_id_fkey
      foreign key (campaign_id) references public.business_email_campaigns(id) on delete set null;
  end if;
end $$;

create index if not exists shop_discount_codes_project_idx
  on public.shop_discount_codes (project_id, is_active);

alter table public.shop_orders
  add column if not exists discount_code text,
  add column if not exists discount_percent integer
    check (discount_percent is null or (discount_percent >= 1 and discount_percent <= 90)),
  add column if not exists amount_xof_before_discount integer
    check (amount_xof_before_discount is null or amount_xof_before_discount >= 0);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'business_email_campaigns'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_email_campaigns'
      and column_name = 'discount_code_id'
  ) then
    alter table public.business_email_campaigns
      add column discount_code_id uuid
        references public.shop_discount_codes(id) on delete set null;
  end if;
end $$;

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

-- >>> 045 product UPC/SKU + order numbers
-- Product UPC/SKU + human-readable shop order numbers.
-- Apply after APPLY_SHOP_ORDERS.sql (039–044).

alter table public.project_products
  add column if not exists upc text,
  add column if not exists sku text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_products_upc_len'
  ) then
    alter table public.project_products
      add constraint project_products_upc_len
      check (upc is null or char_length(trim(upc)) between 4 and 32);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_products_sku_len'
  ) then
    alter table public.project_products
      add constraint project_products_sku_len
      check (sku is null or char_length(trim(sku)) between 1 and 40);
  end if;
end $$;

create unique index if not exists project_products_project_upc_uidx
  on public.project_products (project_id, upc)
  where upc is not null;

create unique index if not exists project_products_project_sku_uidx
  on public.project_products (project_id, sku)
  where sku is not null;

alter table public.shop_orders
  add column if not exists order_number text,
  add column if not exists product_upc text,
  add column if not exists product_sku text;

create unique index if not exists shop_orders_project_order_number_uidx
  on public.shop_orders (project_id, order_number)
  where order_number is not null;

create table if not exists public.shop_order_counters (
  project_id uuid primary key references public.projects(id) on delete cascade,
  next_n integer not null default 1 check (next_n >= 1),
  updated_at timestamptz not null default now()
);

alter table public.shop_order_counters enable row level security;

drop policy if exists "Owners read shop_order_counters" on public.shop_order_counters;
create policy "Owners read shop_order_counters"
  on public.shop_order_counters for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_order_counters.project_id and p.owner_id = auth.uid()
    )
  );

-- Service role allocates counters on public place-order; owners may not insert.
-- No insert/update policies for authenticated — allocation via service client only.

notify pgrst, 'reload schema';

-- >>> 046 multi-item cart + order lines + drafts
-- Multi-line shop orders (cart checkout) + cart drafts for recovery.
-- Apply after 045.

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid references public.project_products(id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) between 1 and 120),
  product_upc text,
  product_sku text,
  price_label text not null default '' check (char_length(price_label) <= 60),
  price_xof integer check (price_xof is null or price_xof >= 0),
  quantity integer not null default 1 check (quantity between 1 and 20),
  line_amount_xof integer check (line_amount_xof is null or line_amount_xof >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shop_order_items_order_idx
  on public.shop_order_items (order_id, sort_order);

create index if not exists shop_order_items_project_idx
  on public.shop_order_items (project_id);

alter table public.shop_order_items enable row level security;

drop policy if exists "Owners read shop_order_items" on public.shop_order_items;
create policy "Owners read shop_order_items"
  on public.shop_order_items for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_order_items.project_id and p.owner_id = auth.uid()
    )
  );

-- Abandoned / in-progress carts (email optional until checkout).
create table if not exists public.shop_cart_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subdomain text not null,
  session_key text not null,
  customer_email text,
  customer_name text,
  customer_phone text,
  items jsonb not null default '[]'::jsonb,
  discount_code text,
  status text not null default 'open'
    check (status in ('open', 'recovered', 'converted', 'expired')),
  last_seen_at timestamptz not null default now(),
  converted_order_id uuid references public.shop_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, session_key)
);

create index if not exists shop_cart_drafts_project_status_idx
  on public.shop_cart_drafts (project_id, status, last_seen_at desc);

alter table public.shop_cart_drafts enable row level security;

drop policy if exists "Owners read shop_cart_drafts" on public.shop_cart_drafts;
create policy "Owners read shop_cart_drafts"
  on public.shop_cart_drafts for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_cart_drafts.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update shop_cart_drafts" on public.shop_cart_drafts;
create policy "Owners update shop_cart_drafts"
  on public.shop_cart_drafts for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_cart_drafts.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_cart_drafts.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_cart_drafts_set_updated_at on public.shop_cart_drafts;
create trigger shop_cart_drafts_set_updated_at
  before update on public.shop_cart_drafts
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';

-- >>> 047 product stock
-- Product stock tracking (optional per product).
-- track_stock=false → unlimited. track_stock=true → stock_qty is authoritative.
-- Apply after 046.

alter table public.project_products
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_qty integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'project_products_stock_qty_nonneg'
  ) then
    alter table public.project_products
      add constraint project_products_stock_qty_nonneg
      check (stock_qty is null or stock_qty >= 0);
  end if;
end $$;

-- When tracking starts without a qty, treat as 0 (sold out until merchant sets).
update public.project_products
set stock_qty = 0
where track_stock = true and stock_qty is null;

notify pgrst, 'reload schema';

-- >>> 048 shopper accounts + purchase history
-- Shopper accounts: link orders to Kebu auth users + per-site customer profile.
-- Apply after APPLY_SHOP_ORDERS.sql (039–047).

alter table public.shop_orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists shop_orders_customer_user_idx
  on public.shop_orders (project_id, customer_user_id, created_at desc)
  where customer_user_id is not null;

-- Customer can read their own orders (never write paid status from browser).
drop policy if exists "Customers read own shop_orders" on public.shop_orders;
create policy "Customers read own shop_orders"
  on public.shop_orders for select
  using (customer_user_id = auth.uid());

drop policy if exists "Customers read own shop_order_items" on public.shop_order_items;
create policy "Customers read own shop_order_items"
  on public.shop_order_items for select
  using (
    exists (
      select 1 from public.shop_orders o
      where o.id = shop_order_items.order_id
        and o.customer_user_id = auth.uid()
    )
  );

-- Optional display profile per shop (one Kebu account can shop many stores).
create table if not exists public.shop_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  phone text not null default '' check (char_length(phone) <= 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index if not exists shop_customer_profiles_user_idx
  on public.shop_customer_profiles (user_id);

create index if not exists shop_customer_profiles_project_idx
  on public.shop_customer_profiles (project_id);

alter table public.shop_customer_profiles enable row level security;

drop policy if exists "Customers manage own shop profiles" on public.shop_customer_profiles;
create policy "Customers manage own shop profiles"
  on public.shop_customer_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Owners read shop customer profiles" on public.shop_customer_profiles;
create policy "Owners read shop customer profiles"
  on public.shop_customer_profiles for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_customer_profiles.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_customer_profiles_set_updated_at on public.shop_customer_profiles;
create trigger shop_customer_profiles_set_updated_at
  before update on public.shop_customer_profiles
  for each row execute function public.set_updated_at();

-- Attach user id on open cart drafts when shopper is signed in (service role writes).
alter table public.shop_cart_drafts
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists shop_cart_drafts_user_idx
  on public.shop_cart_drafts (project_id, customer_user_id)
  where customer_user_id is not null;

notify pgrst, 'reload schema';

-- >>> 049 shopper wishlist
-- Shopper wishlist (signed-in customers only).
-- Apply after 048.

create table if not exists public.shop_wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null references public.project_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, project_id, product_id)
);

create index if not exists shop_wishlists_user_project_idx
  on public.shop_wishlists (user_id, project_id, created_at desc);

create index if not exists shop_wishlists_project_idx
  on public.shop_wishlists (project_id);

alter table public.shop_wishlists enable row level security;

drop policy if exists "Customers manage own wishlist" on public.shop_wishlists;
create policy "Customers manage own wishlist"
  on public.shop_wishlists for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Owners can see how many wishlists (read-only), not for spam.
drop policy if exists "Owners read shop wishlists" on public.shop_wishlists;
create policy "Owners read shop wishlists"
  on public.shop_wishlists for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_wishlists.project_id and p.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';

-- >>> 050 shop messaging
-- Customer ↔ merchant store messaging (per shop project).
-- Apply after 048/049. Not email; in-app thread only.

create table if not exists public.shop_message_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '' check (char_length(subject) <= 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, customer_user_id)
);

create index if not exists shop_message_threads_project_idx
  on public.shop_message_threads (project_id, last_message_at desc);

create index if not exists shop_message_threads_customer_idx
  on public.shop_message_threads (customer_user_id, last_message_at desc);

create table if not exists public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.shop_message_threads(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'merchant')),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists shop_messages_thread_idx
  on public.shop_messages (thread_id, created_at asc);

alter table public.shop_message_threads enable row level security;
alter table public.shop_messages enable row level security;

drop policy if exists "Customers manage own message threads" on public.shop_message_threads;
create policy "Customers manage own message threads"
  on public.shop_message_threads for all
  using (customer_user_id = auth.uid())
  with check (customer_user_id = auth.uid());

drop policy if exists "Owners manage shop message threads" on public.shop_message_threads;
create policy "Owners manage shop message threads"
  on public.shop_message_threads for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_message_threads.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_message_threads.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Customers read/write own shop messages" on public.shop_messages;
create policy "Customers read/write own shop messages"
  on public.shop_messages for all
  using (
    exists (
      select 1 from public.shop_message_threads t
      where t.id = shop_messages.thread_id and t.customer_user_id = auth.uid()
    )
  )
  with check (
    sender_user_id = auth.uid()
    and sender_role = 'customer'
    and exists (
      select 1 from public.shop_message_threads t
      where t.id = shop_messages.thread_id and t.customer_user_id = auth.uid()
    )
  );

drop policy if exists "Owners read/write shop messages" on public.shop_messages;
create policy "Owners read/write shop messages"
  on public.shop_messages for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_messages.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    sender_user_id = auth.uid()
    and sender_role = 'merchant'
    and exists (
      select 1 from public.projects p
      where p.id = shop_messages.project_id and p.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';

-- >>> 051 shop payment providers (PayPal / Paystack / Wave / …)
alter table public.shop_orders
  add column if not exists payment_provider text,
  add column if not exists provider_reference text,
  add column if not exists provider_payment_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_payment_provider_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_payment_provider_check
      check (
        payment_provider is null
        or payment_provider in (
          'joko', 'paypal', 'paystack', 'wave', 'orange_money', 'manual'
        )
      );
  end if;
end $$;

create unique index if not exists shop_orders_provider_reference_uidx
  on public.shop_orders (payment_provider, provider_reference)
  where provider_reference is not null and payment_provider is not null;

create index if not exists shop_orders_provider_reference_lookup_idx
  on public.shop_orders (provider_reference)
  where provider_reference is not null;

update public.shop_orders
set
  payment_provider = coalesce(payment_provider, 'joko'),
  provider_reference = coalesce(provider_reference, joko_reference),
  provider_payment_id = coalesce(provider_payment_id, joko_payment_id)
where joko_reference is not null
  and payment_provider is null;

notify pgrst, 'reload schema';
-- 054 shop fulfillment + per-store customer profiles
-- Apply after APPLY_SHOP_ORDERS.sql (through 051). Safe to re-run.

-- >>> Fulfillment columns on shop_orders
alter table public.shop_orders
  add column if not exists tracking_number text,
  add column if not exists carrier text,
  add column if not exists tracking_url text,
  add column if not exists fulfilled_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists customer_notified_at timestamptz,
  add column if not exists customer_notify_via text;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'shop_orders_status_check'
  ) then
    alter table public.shop_orders drop constraint shop_orders_status_check;
  end if;
  alter table public.shop_orders
    add constraint shop_orders_status_check
    check (status in ('pending', 'contacted', 'fulfilled', 'cancelled', 'archived'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_carrier_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_carrier_check
      check (
        carrier is null
        or carrier in (
          'dhl', 'fedex', 'ups', 'usps', 'chronopost', 'colissimo', 'laposte',
          'dpd', 'gls', 'aramex', 'jt', 'yango', 'local', 'other', 'pickup'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_customer_notify_via_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_customer_notify_via_check
      check (
        customer_notify_via is null
        or customer_notify_via in ('email', 'whatsapp', 'both', 'none')
      );
  end if;
end $$;

alter table public.shop_orders
  drop constraint if exists shop_orders_tracking_number_len;
alter table public.shop_orders
  add constraint shop_orders_tracking_number_len
  check (tracking_number is null or char_length(trim(tracking_number)) between 1 and 80);

create index if not exists shop_orders_fulfillment_idx
  on public.shop_orders (project_id, status, created_at desc);

-- >>> Per-store customer profiles (build on every order)
create table if not exists public.shop_customers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_key text not null check (char_length(trim(customer_key)) between 3 and 120),
  name text not null default 'Customer' check (char_length(trim(name)) between 1 and 80),
  phone text check (phone is null or char_length(trim(phone)) between 8 and 24),
  email text check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$'),
  order_count integer not null default 0 check (order_count >= 0),
  lifetime_amount_xof numeric(14, 2) not null default 0 check (lifetime_amount_xof >= 0),
  average_order_amount_xof numeric(14, 2) not null default 0 check (average_order_amount_xof >= 0),
  liked_products jsonb not null default '[]'::jsonb,
  first_order_at timestamptz,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, customer_key)
);

create index if not exists shop_customers_project_idx
  on public.shop_customers (project_id, last_order_at desc nulls last);

create index if not exists shop_customers_email_idx
  on public.shop_customers (project_id, email)
  where email is not null;

create index if not exists shop_customers_phone_idx
  on public.shop_customers (project_id, phone)
  where phone is not null;

alter table public.shop_customers enable row level security;

drop policy if exists "Owners read shop_customers" on public.shop_customers;
create policy "Owners read shop_customers"
  on public.shop_customers for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_customers.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners write shop_customers" on public.shop_customers;
create policy "Owners write shop_customers"
  on public.shop_customers for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_customers.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_customers.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_customers_set_updated_at on public.shop_customers;
create trigger shop_customers_set_updated_at
  before update on public.shop_customers
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
-- 055 team invites + agency roles + shop demo orders channel
-- Apply after 054. Safe to re-run.

-- >>> Expand business_members roles (agency managers / creatives)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'business_members_role_check'
  ) then
    alter table public.business_members drop constraint business_members_role_check;
  end if;
  alter table public.business_members
    add constraint business_members_role_check
    check (role in (
      'founder', 'cofounder', 'beneficial_owner', 'director', 'administrator',
      'finance_manager', 'store_manager', 'manager', 'creative', 'developer',
      'designer', 'employee', 'accountant', 'legal_representative', 'viewer'
    ));
exception
  when duplicate_object then null;
end $$;

-- >>> Team invites (email + role + token; accept creates membership)
create table if not exists public.business_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  role text not null
    check (role in (
      'cofounder', 'administrator', 'finance_manager', 'store_manager',
      'manager', 'creative', 'developer', 'designer', 'employee',
      'accountant', 'legal_representative', 'viewer'
    )),
  token text not null check (char_length(trim(token)) between 24 and 80),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  message text not null default '' check (char_length(message) <= 400),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_invites_token_uidx
  on public.business_invites (token);

create unique index if not exists business_invites_pending_email_uidx
  on public.business_invites (business_id, lower(email))
  where status = 'pending';

create index if not exists business_invites_business_idx
  on public.business_invites (business_id, created_at desc);

alter table public.business_invites enable row level security;

drop policy if exists "Managers read business invites" on public.business_invites;
create policy "Managers read business invites"
  on public.business_invites for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  );

drop policy if exists "Managers write business invites" on public.business_invites;
create policy "Managers write business invites"
  on public.business_invites for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  );

drop trigger if exists business_invites_set_updated_at on public.business_invites;
create trigger business_invites_set_updated_at
  before update on public.business_invites
  for each row execute function public.set_updated_at();

-- >>> Shop demo orders (merchant practice — not real customers)
alter table public.shop_orders
  add column if not exists is_demo boolean not null default false;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'shop_orders_channel_check'
  ) then
    alter table public.shop_orders drop constraint shop_orders_channel_check;
  end if;
  alter table public.shop_orders
    add constraint shop_orders_channel_check
    check (channel in ('whatsapp', 'demo', 'web'));
exception
  when duplicate_object then null;
end $$;

create index if not exists shop_orders_demo_idx
  on public.shop_orders (project_id, is_demo)
  where is_demo = true;

notify pgrst, 'reload schema';
-- 059 shop gift / buy-for-someone
-- Apply after APPLY_SHOP_ORDERS (through 055). Safe to re-run.
-- Buyer pays; recipient gets delivery contact + optional public gift link.

do $$
begin
  if to_regclass('public.shop_orders') is null then
    raise exception
      'public.shop_orders is missing. Apply APPLY_SHOP_ORDERS.sql first (needs public.projects), then re-run 059.';
  end if;
end $$;

alter table public.shop_orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists recipient_name text,
  add column if not exists recipient_phone text,
  add column if not exists recipient_email text,
  add column if not exists gift_message text,
  add column if not exists gift_public_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_name_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_name_len
      check (
        recipient_name is null
        or char_length(trim(recipient_name)) between 1 and 80
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_phone_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_phone_len
      check (
        recipient_phone is null
        or char_length(trim(recipient_phone)) between 8 and 24
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_recipient_email_check'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_recipient_email_check
      check (
        recipient_email is null
        or recipient_email ~* '^[^@]+@[^@]+\.[^@]+$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_message_len'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_message_len
      check (
        gift_message is null
        or char_length(gift_message) <= 400
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_gift_requires_recipient'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_gift_requires_recipient
      check (
        is_gift = false
        or (
          recipient_name is not null
          and char_length(trim(recipient_name)) between 1 and 80
          and recipient_phone is not null
          and char_length(trim(recipient_phone)) between 8 and 24
        )
      );
  end if;
end $$;

create unique index if not exists shop_orders_gift_public_id_uidx
  on public.shop_orders (gift_public_id)
  where gift_public_id is not null;

create index if not exists shop_orders_gift_idx
  on public.shop_orders (project_id, is_gift)
  where is_gift = true;

notify pgrst, 'reload schema';
