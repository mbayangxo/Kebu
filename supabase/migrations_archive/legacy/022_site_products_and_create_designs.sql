-- Per-site products (Builder store catalog) + Kebu Create design assets

create table if not exists public.project_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
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

create index if not exists project_products_project_idx on public.project_products (project_id, sort_order);
create index if not exists project_products_business_idx on public.project_products (business_id) where business_id is not null;

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

-- Kebu Create — posters, social graphics, flyers (separate from Builder websites)

create table if not exists public.create_designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  design_type text not null default 'poster'
    check (design_type in ('poster', 'social_square', 'flyer')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  canvas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists create_designs_owner_idx on public.create_designs (owner_id, updated_at desc);
create index if not exists create_designs_business_idx on public.create_designs (business_id) where business_id is not null;

alter table public.create_designs enable row level security;

drop policy if exists "Owners manage create_designs" on public.create_designs;
create policy "Owners manage create_designs"
  on public.create_designs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists create_designs_set_updated_at on public.create_designs;
create trigger create_designs_set_updated_at
  before update on public.create_designs
  for each row execute function public.set_updated_at();
