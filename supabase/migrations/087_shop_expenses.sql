-- 087_shop_expenses: merchant expense tracking per project
create table if not exists shop_expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
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

create index if not exists shop_expenses_project_id_idx on shop_expenses(project_id);
create index if not exists shop_expenses_date_idx       on shop_expenses(project_id, date desc);

alter table shop_expenses enable row level security;

-- owners and collaborators with shop access can manage expenses
create policy "shop_expenses_select" on shop_expenses
  for select using (
    exists (
      select 1 from projects p
      where p.id = shop_expenses.project_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from project_collaborators pc
            where pc.project_id = p.id and pc.user_id = auth.uid()
          )
        )
    )
  );

create policy "shop_expenses_insert" on shop_expenses
  for insert with check (
    exists (
      select 1 from projects p
      where p.id = shop_expenses.project_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from project_collaborators pc
            where pc.project_id = p.id and pc.user_id = auth.uid()
          )
        )
    )
  );

create policy "shop_expenses_update" on shop_expenses
  for update using (
    exists (
      select 1 from projects p
      where p.id = shop_expenses.project_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from project_collaborators pc
            where pc.project_id = p.id and pc.user_id = auth.uid()
          )
        )
    )
  );

create policy "shop_expenses_delete" on shop_expenses
  for delete using (
    exists (
      select 1 from projects p
      where p.id = shop_expenses.project_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from project_collaborators pc
            where pc.project_id = p.id and pc.user_id = auth.uid()
          )
        )
    )
  );
