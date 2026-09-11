-- 090_shop_review_requests: post-purchase review request log per shop order
create table if not exists public.shop_review_requests (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  order_id         uuid not null references public.shop_orders(id) on delete cascade,
  customer_name    text,
  customer_phone   text,
  customer_email   text,
  channel          text not null default 'whatsapp'
                     check (channel in ('whatsapp','email','both')),
  discount_code    text,
  discount_percent numeric(5,2),
  status           text not null default 'sent'
                     check (status in ('sent','opened','reviewed','bounced')),
  note             text,
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists shop_review_requests_project_idx on public.shop_review_requests(project_id);
create index if not exists shop_review_requests_order_idx   on public.shop_review_requests(order_id);
create index if not exists shop_review_requests_sent_idx    on public.shop_review_requests(project_id, sent_at desc);

alter table public.shop_review_requests enable row level security;

drop policy if exists "Owners manage shop_review_requests" on public.shop_review_requests;
create policy "Owners manage shop_review_requests"
  on public.shop_review_requests for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = shop_review_requests.project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = shop_review_requests.project_id and p.owner_id = auth.uid()
    )
  );
