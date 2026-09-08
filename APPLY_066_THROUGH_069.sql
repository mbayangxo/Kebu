-- =============================================================================
-- Kebu — ONE FILE: migrations AFTER 065 (066 → 069)
-- Paste into Supabase → SQL Editor → Run once
--
-- Prerequisites: you already applied through 065 (APPLY_NEW_059_THROUGH_065.sql)
-- Safe-ish to re-run: IF NOT EXISTS / DROP IF EXISTS
-- Order: 066 → 067 → 068 → 069
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 066 — Remaining slices (blog, refunds, gift cards, reviews, subscriptions)
-- Source: supabase/migrations/066_remaining_slices.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- W15 blog · W16 (done) · shop refunds/COD/gift cards/reviews/subscriptions · AN1 funnel events
-- Apply after 065.

-- ── W15: Blog posts ─────────────────────────────────────────────────────────

create table if not exists public.project_blog_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slug text not null check (char_length(trim(slug)) between 1 and 80),
  title text not null check (char_length(trim(title)) between 1 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  body text not null default '' check (char_length(body) <= 50000),
  cover_url text not null default '' check (char_length(cover_url) <= 500),
  author_name text not null default '' check (char_length(author_name) <= 80),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index if not exists project_blog_posts_project_idx
  on public.project_blog_posts (project_id, status, published_at desc nulls last);

alter table public.project_blog_posts enable row level security;

drop policy if exists "Owners manage project_blog_posts" on public.project_blog_posts;
create policy "Owners manage project_blog_posts"
  on public.project_blog_posts for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_blog_posts.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_blog_posts.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Public reads published blog posts" on public.project_blog_posts;
create policy "Public reads published blog posts"
  on public.project_blog_posts for select
  using (status = 'published');

drop trigger if exists project_blog_posts_set_updated_at on public.project_blog_posts;
create trigger project_blog_posts_set_updated_at
  before update on public.project_blog_posts
  for each row execute function public.set_updated_at();

-- ── Shop: refunds (extend payment_status) ───────────────────────────────────

alter table public.shop_orders drop constraint if exists shop_orders_payment_status_check;
alter table public.shop_orders
  add constraint shop_orders_payment_status_check
  check (payment_status in ('unpaid', 'awaiting_payment', 'paid', 'failed', 'refunded'));

alter table public.shop_orders
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_note text;

-- ── C6: Gift cards ──────────────────────────────────────────────────────────

create table if not exists public.shop_gift_cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null check (char_length(trim(code)) between 6 and 32),
  initial_balance_xof integer not null check (initial_balance_xof > 0 and initial_balance_xof <= 100000000),
  balance_xof integer not null check (balance_xof >= 0),
  currency text not null default 'XOF',
  status text not null default 'active' check (status in ('active', 'depleted', 'disabled')),
  recipient_email text,
  note text not null default '' check (char_length(note) <= 200),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create index if not exists shop_gift_cards_project_idx
  on public.shop_gift_cards (project_id, status);

alter table public.shop_gift_cards enable row level security;

drop policy if exists "Owners manage shop_gift_cards" on public.shop_gift_cards;
create policy "Owners manage shop_gift_cards"
  on public.shop_gift_cards for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_gift_cards.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_gift_cards.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_gift_cards_set_updated_at on public.shop_gift_cards;
create trigger shop_gift_cards_set_updated_at
  before update on public.shop_gift_cards
  for each row execute function public.set_updated_at();

alter table public.shop_orders
  add column if not exists gift_card_code text,
  add column if not exists gift_card_amount_xof integer check (gift_card_amount_xof is null or gift_card_amount_xof >= 0);

-- ── C7: Product reviews ─────────────────────────────────────────────────────

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null references public.project_products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  reviewer_name text not null check (char_length(trim(reviewer_name)) between 1 and 80),
  reviewer_email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_reviews_product_idx
  on public.product_reviews (product_id, status, created_at desc);

alter table public.product_reviews enable row level security;

drop policy if exists "Owners manage product_reviews" on public.product_reviews;
create policy "Owners manage product_reviews"
  on public.product_reviews for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = product_reviews.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = product_reviews.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Public reads approved reviews" on public.product_reviews;
create policy "Public reads approved reviews"
  on public.product_reviews for select
  using (status = 'approved');

drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();

-- ── C8: Product subscriptions ───────────────────────────────────────────────

alter table public.project_products
  add column if not exists is_subscription boolean not null default false,
  add column if not exists subscription_interval text check (
    subscription_interval is null
    or subscription_interval in ('weekly', 'monthly', 'quarterly', 'yearly')
  );

create table if not exists public.shop_subscriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null references public.project_products(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  interval text not null check (interval in ('weekly', 'monthly', 'quarterly', 'yearly')),
  price_xof integer not null check (price_xof >= 0),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  next_billing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_subscriptions_project_idx
  on public.shop_subscriptions (project_id, status);

alter table public.shop_subscriptions enable row level security;

drop policy if exists "Owners manage shop_subscriptions" on public.shop_subscriptions;
create policy "Owners manage shop_subscriptions"
  on public.shop_subscriptions for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_subscriptions.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_subscriptions.project_id and p.owner_id = auth.uid()
    )
  );

drop trigger if exists shop_subscriptions_set_updated_at on public.shop_subscriptions;
create trigger shop_subscriptions_set_updated_at
  before update on public.shop_subscriptions
  for each row execute function public.set_updated_at();

-- ── Builder: blog-list section type ─────────────────────────────────────────

alter table public.project_sections drop constraint if exists project_sections_section_type_check;
alter table public.project_sections
  add constraint project_sections_section_type_check
  check (
    section_type in (
      'navigation', 'hero', 'text', 'image', 'gallery', 'video', 'audio', 'map', 'events',
      'features', 'testimonials', 'faq', 'products', 'contact', 'newsletter', 'email-popup',
      'whatsapp', 'heading', 'paragraph', 'button', 'free-text', 'footer', 'form', 'blog-list',
      'maylecor-home', 'maylecor-music', 'legally-blonde-hero',
      'kdirection-home', 'kdirection-page'
    )
  );

alter table public.project_sections validate constraint project_sections_section_type_check;

insert into public.builder_schema_meta (key, value)
values ('website_builder_version', '66')
on conflict (key) do update set value = excluded.value, updated_at = now();

notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- 067 — Shop owner ops (alerts, channels, push subscriptions)
-- Source: docs/migrations-to-apply/067_shop_owner_ops.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 067 — Shop owner ops: notifications, analytics event types, order channels, visitor meta
-- Apply after 066. Paste in Supabase SQL Editor.

-- Expand site analytics event types (shop funnel + pageview)
do $$
begin
  alter table public.site_analytics_events drop constraint if exists site_analytics_events_event_type_check;
exception when undefined_object then null;
end $$;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (
    event_type in (
      'pageview', 'vital', 'error', 'perf',
      'product_view', 'add_to_cart', 'checkout_start', 'purchase'
    )
  );

-- Order acquisition channels (where the order came from)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'shop_orders_channel_check'
  ) then
    alter table public.shop_orders drop constraint shop_orders_channel_check;
  end if;
end $$;

alter table public.shop_orders
  add constraint shop_orders_channel_check
  check (
    channel in (
      'whatsapp', 'demo', 'web', 'share', 'social', 'qr', 'wave', 'joko'
    )
  );

alter table public.shop_orders
  add column if not exists source_detail text not null default ''
  check (char_length(source_detail) <= 120);

-- In-app + push-ready owner notifications (one row per alert)
create table if not exists public.shop_owner_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'order'
    check (kind in ('order', 'message', 'stock', 'system')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 500),
  href text not null default '' check (char_length(href) <= 300),
  order_id uuid references public.shop_orders(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shop_owner_notifications_owner_idx
  on public.shop_owner_notifications (owner_id, created_at desc);

create index if not exists shop_owner_notifications_project_idx
  on public.shop_owner_notifications (project_id, created_at desc);

alter table public.shop_owner_notifications enable row level security;

drop policy if exists "Owners manage shop_owner_notifications" on public.shop_owner_notifications;
create policy "Owners manage shop_owner_notifications"
  on public.shop_owner_notifications for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Browser push subscriptions (Web Push) — optional until VAPID keys set
create table if not exists public.shop_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 10 and 2000),
  p256dh text not null default '' check (char_length(p256dh) <= 500),
  auth text not null default '' check (char_length(auth) <= 200),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists shop_push_subscriptions_user_idx
  on public.shop_push_subscriptions (user_id);

alter table public.shop_push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.shop_push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.shop_push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.shop_owner_notifications is
  'Per-store owner alerts (orders etc). Browser Notification API + optional Web Push.';
comment on table public.shop_push_subscriptions is
  'Web Push endpoints. Requires VAPID keys on server to deliver.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 068 — Shop payment ledger (Joko + adapters → one event stream)
-- Source: docs/migrations-to-apply/068_shop_payment_ledger.sql
-- ─────────────────────────────────────────────────────────────────────────────

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
-- 069 — Cross-border shipping quote fields on shop_orders (SN→GH corridor v1)
-- Apply after 068.

alter table public.shop_orders
  add column if not exists buyer_country_code char(2),
  add column if not exists shipping_amount_xof integer
    check (shipping_amount_xof is null or shipping_amount_xof >= 0),
  add column if not exists shipping_eta_min_days integer
    check (shipping_eta_min_days is null or shipping_eta_min_days >= 0),
  add column if not exists shipping_eta_max_days integer
    check (shipping_eta_max_days is null or shipping_eta_max_days >= 0),
  add column if not exists shipping_corridor text not null default ''
    check (char_length(shipping_corridor) <= 16),
  add column if not exists shipping_trust_label text
    check (shipping_trust_label is null or shipping_trust_label in ('estimate', 'partner_rate')),
  add column if not exists shipping_quote_version text not null default ''
    check (char_length(shipping_quote_version) <= 40);

comment on column public.shop_orders.shipping_trust_label is
  'estimate = Kebu corridor table; partner_rate = live partner API (not yet).';

notify pgrst, 'reload schema';
