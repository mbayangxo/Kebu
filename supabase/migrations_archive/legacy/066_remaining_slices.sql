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
