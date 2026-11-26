-- Business invoices + contracts (agency/services ops — DkLNS and any Kebu business).
-- Public share via opaque public_id. Paid/signed only via owner or client action — never fake.

create table if not exists public.business_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  public_id text not null,
  invoice_number text not null,
  client_name text not null check (char_length(trim(client_name)) between 1 and 160),
  client_email text check (client_email is null or client_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  client_phone text not null default '' check (char_length(client_phone) <= 24),
  currency text not null default 'XOF',
  notes text not null default '' check (char_length(notes) <= 2000),
  amount_xof int not null default 0 check (amount_xof >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'paid', 'void', 'overdue')),
  due_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_invoices_public_id_uidx unique (public_id),
  constraint business_invoices_number_biz_uidx unique (business_id, invoice_number)
);

create index if not exists business_invoices_business_idx
  on public.business_invoices (business_id, created_at desc);

create table if not exists public.business_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.business_invoices(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 400),
  quantity int not null default 1 check (quantity between 1 and 100000),
  unit_amount_xof int not null default 0 check (unit_amount_xof >= 0),
  sort_order int not null default 0
);

create index if not exists business_invoice_lines_invoice_idx
  on public.business_invoice_lines (invoice_id, sort_order);

create table if not exists public.business_contracts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  public_id text not null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  counterparty_name text not null check (char_length(trim(counterparty_name)) between 1 and 160),
  counterparty_email text check (counterparty_email is null or counterparty_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  body_text text not null check (char_length(trim(body_text)) between 1 and 50000),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'void')),
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_name text,
  accepted_ip text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_contracts_public_id_uidx unique (public_id)
);

create index if not exists business_contracts_business_idx
  on public.business_contracts (business_id, created_at desc);

-- Launch / popup strategy checklist per business (agency & product launches)
create table if not exists public.business_launch_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null default 'Launch plan' check (char_length(trim(title)) between 1 and 160),
  status text not null default 'active'
    check (status in ('active', 'done', 'archived')),
  checklist jsonb not null default '[]'::jsonb,
  popup_heading text not null default '',
  popup_body text not null default '',
  popup_cta text not null default 'Join the list',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists business_launch_plans_business_idx
  on public.business_launch_plans (business_id, created_at desc);

alter table public.business_invoices enable row level security;
alter table public.business_invoice_lines enable row level security;
alter table public.business_contracts enable row level security;
alter table public.business_launch_plans enable row level security;

drop policy if exists "Members read invoices" on public.business_invoices;
create policy "Members read invoices"
  on public.business_invoices for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invoices.business_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Managers write invoices" on public.business_invoices;
create policy "Managers write invoices"
  on public.business_invoices for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invoices.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invoices.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Members read invoice lines" on public.business_invoice_lines;
create policy "Members read invoice lines"
  on public.business_invoice_lines for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invoice_lines.business_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Managers write invoice lines" on public.business_invoice_lines;
create policy "Managers write invoice lines"
  on public.business_invoice_lines for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invoice_lines.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invoice_lines.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Members read contracts" on public.business_contracts;
create policy "Members read contracts"
  on public.business_contracts for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_contracts.business_id
        and m.user_id = auth.uid() and m.status = 'active'
    )
  );

drop policy if exists "Managers write contracts" on public.business_contracts;
create policy "Managers write contracts"
  on public.business_contracts for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_contracts.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_contracts.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Members manage launch plans" on public.business_launch_plans;
create policy "Members manage launch plans"
  on public.business_launch_plans for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_launch_plans.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_launch_plans.business_id
        and m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop trigger if exists business_invoices_set_updated_at on public.business_invoices;
create trigger business_invoices_set_updated_at
  before update on public.business_invoices
  for each row execute function public.set_updated_at();

drop trigger if exists business_contracts_set_updated_at on public.business_contracts;
create trigger business_contracts_set_updated_at
  before update on public.business_contracts
  for each row execute function public.set_updated_at();

drop trigger if exists business_launch_plans_set_updated_at on public.business_launch_plans;
create trigger business_launch_plans_set_updated_at
  before update on public.business_launch_plans
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
