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
