-- 089_shop_companies: B2B company accounts linked to a shop project
create table if not exists shop_companies (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  industry        text,
  country         text,
  city            text,
  phone           text,
  email           text,
  website         text,
  tax_id          text,
  credit_limit_xof numeric(14,2) not null default 0,
  payment_terms   text default 'immediate'
                    check (payment_terms in ('immediate','net7','net14','net30','net60')),
  note            text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- link orders to companies (optional)
alter table shop_orders
  add column if not exists company_id uuid references shop_companies(id) on delete set null;

create index if not exists shop_companies_project_idx on shop_companies(project_id);
create index if not exists shop_companies_name_idx    on shop_companies(project_id, name);
create index if not exists shop_orders_company_idx    on shop_orders(company_id) where company_id is not null;

alter table shop_companies enable row level security;

create policy "shop_companies_select" on shop_companies
  for select using (
    exists (
      select 1 from projects p
      where p.id = shop_companies.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_companies_insert" on shop_companies
  for insert with check (
    exists (
      select 1 from projects p
      where p.id = shop_companies.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_companies_update" on shop_companies
  for update using (
    exists (
      select 1 from projects p
      where p.id = shop_companies.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_companies_delete" on shop_companies
  for delete using (
    exists (
      select 1 from projects p
      where p.id = shop_companies.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );
