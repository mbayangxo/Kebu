-- 087_shop_expenses: merchant expense tracking per project
create table if not exists public.shop_expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  description  text not null,
  category     text not null default 'other',
  amount_xof   numeric(12,2) not null default 0,
  currency     text not null default 'XOF',
  date         date not null default current_date,
  note         text,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists shop_expenses_project_id_idx on public.shop_expenses(project_id);
create index if not exists shop_expenses_date_idx       on public.shop_expenses(project_id, date desc);

alter table public.shop_expenses enable row level security;

drop policy if exists "Owners manage shop_expenses" on public.shop_expenses;
create policy "Owners manage shop_expenses"
  on public.shop_expenses for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_expenses.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_expenses.project_id and p.owner_id = auth.uid()
    )
  );
