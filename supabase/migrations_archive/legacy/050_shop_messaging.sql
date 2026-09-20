-- Customer ↔ merchant store messaging (per shop project).
-- Apply after 048/049. Not email; in-app thread only.

create table if not exists public.shop_message_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  customer_user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '' check (char_length(subject) <= 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, customer_user_id)
);

create index if not exists shop_message_threads_project_idx
  on public.shop_message_threads (project_id, last_message_at desc);

create index if not exists shop_message_threads_customer_idx
  on public.shop_message_threads (customer_user_id, last_message_at desc);

create table if not exists public.shop_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.shop_message_threads(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'merchant')),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists shop_messages_thread_idx
  on public.shop_messages (thread_id, created_at asc);

alter table public.shop_message_threads enable row level security;
alter table public.shop_messages enable row level security;

drop policy if exists "Customers manage own message threads" on public.shop_message_threads;
create policy "Customers manage own message threads"
  on public.shop_message_threads for all
  using (customer_user_id = auth.uid())
  with check (customer_user_id = auth.uid());

drop policy if exists "Owners manage shop message threads" on public.shop_message_threads;
create policy "Owners manage shop message threads"
  on public.shop_message_threads for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_message_threads.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_message_threads.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Customers read/write own shop messages" on public.shop_messages;
create policy "Customers read/write own shop messages"
  on public.shop_messages for all
  using (
    exists (
      select 1 from public.shop_message_threads t
      where t.id = shop_messages.thread_id and t.customer_user_id = auth.uid()
    )
  )
  with check (
    sender_user_id = auth.uid()
    and sender_role = 'customer'
    and exists (
      select 1 from public.shop_message_threads t
      where t.id = shop_messages.thread_id and t.customer_user_id = auth.uid()
    )
  );

drop policy if exists "Owners read/write shop messages" on public.shop_messages;
create policy "Owners read/write shop messages"
  on public.shop_messages for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_messages.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    sender_user_id = auth.uid()
    and sender_role = 'merchant'
    and exists (
      select 1 from public.projects p
      where p.id = shop_messages.project_id and p.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
