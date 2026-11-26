-- 089_shop_companies: B2B company accounts linked to a shop project
create table if not exists public.shop_companies (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  name             text not null,
  industry         text,
  country          text,
  city             text,
  phone            text,
  email            text,
  website          text,
  tax_id           text,
  credit_limit_xof numeric(14,2) not null default 0,
  payment_terms    text default 'immediate'
                     check (payment_terms in ('immediate','net7','net14','net30','net60')),
  note             text,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- link orders to companies (optional)
alter table public.shop_orders
  add column if not exists company_id uuid references public.shop_companies(id) on delete set null;

create index if not exists shop_companies_project_idx on public.shop_companies(project_id);
create index if not exists shop_companies_name_idx    on public.shop_companies(project_id, name);
create index if not exists shop_orders_company_idx    on public.shop_orders(company_id) where company_id is not null;

alter table public.shop_companies enable row level security;

drop policy if exists "Owners manage shop_companies" on public.shop_companies;
create policy "Owners manage shop_companies"
  on public.shop_companies for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_companies.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_companies.project_id and p.owner_id = auth.uid()
    )
  );
