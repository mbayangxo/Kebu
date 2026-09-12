-- D1: Digital product delivery — signed download tokens
-- Merchants mark a product as digital and upload a file.
-- On purchase, a one-time signed token is created and emailed to the buyer.
-- Token → /api/dl/[token] → validates, increments count, redirects to Supabase Storage signed URL.

-- ── Columns on project_products ─────────────────────────────────────────────
alter table public.project_products
  add column if not exists is_digital            boolean      not null default false,
  add column if not exists digital_file_path     text         check (digital_file_path is null or char_length(digital_file_path) <= 500),
  add column if not exists digital_file_name     text         check (digital_file_name is null or char_length(digital_file_name) <= 200),
  add column if not exists digital_dl_limit      integer      not null default 5
                                                                check (digital_dl_limit >= 1 and digital_dl_limit <= 100),
  add column if not exists digital_expires_hours integer      not null default 72
                                                                check (digital_expires_hours >= 1 and digital_expires_hours <= 8760);

-- ── Downloads ────────────────────────────────────────────────────────────────
create table if not exists public.shop_digital_downloads (
  id               uuid        primary key default gen_random_uuid(),
  order_id         uuid        not null references public.shop_orders(id) on delete cascade,
  project_id       uuid        not null,
  product_id       uuid        not null,
  -- Opaque URL-safe token — 32 random bytes hex
  token            text        not null unique check (char_length(token) = 64),
  file_path        text        not null,
  file_name        text        not null default 'download',
  expires_at       timestamptz not null,
  download_count   integer     not null default 0,
  max_downloads    integer     not null default 5,
  created_at       timestamptz not null default now()
);

-- Fast lookup by token (only among non-expired rows — partial avoids stale entries hogging index)
create index if not exists shop_digital_downloads_token_idx
  on public.shop_digital_downloads (token)
  where expires_at > now();

create index if not exists shop_digital_downloads_order_idx
  on public.shop_digital_downloads (order_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.shop_digital_downloads enable row level security;

-- Merchants can see downloads for their own projects
drop policy if exists "Project owner views digital downloads" on public.shop_digital_downloads;
create policy "Project owner views digital downloads"
  on public.shop_digital_downloads for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_digital_downloads.project_id
        and p.owner_id = auth.uid()
    )
  );

-- ── Storage bucket (idempotent) ───────────────────────────────────────────────
-- Private bucket — files require signed URLs to access.
-- Run this after applying the migration:
--   insert into storage.buckets (id, name, public) values ('digital-files', 'digital-files', false)
--   on conflict (id) do nothing;
