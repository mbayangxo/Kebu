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
