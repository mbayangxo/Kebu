-- 090_shop_review_requests: post-purchase review request log per shop order
create table if not exists shop_review_requests (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  order_id        uuid not null references shop_orders(id) on delete cascade,
  customer_name   text,
  customer_phone  text,
  customer_email  text,
  channel         text not null default 'whatsapp'
                    check (channel in ('whatsapp','email','both')),
  discount_code   text,
  discount_percent numeric(5,2),
  status          text not null default 'sent'
                    check (status in ('sent','opened','reviewed','bounced')),
  note            text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists shop_review_requests_project_idx on shop_review_requests(project_id);
create index if not exists shop_review_requests_order_idx   on shop_review_requests(order_id);
create index if not exists shop_review_requests_sent_idx    on shop_review_requests(project_id, sent_at desc);

alter table shop_review_requests enable row level security;

create policy "shop_review_requests_select" on shop_review_requests
  for select using (
    exists (
      select 1 from projects p
      where p.id = shop_review_requests.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_review_requests_insert" on shop_review_requests
  for insert with check (
    exists (
      select 1 from projects p
      where p.id = shop_review_requests.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );

create policy "shop_review_requests_update" on shop_review_requests
  for update using (
    exists (
      select 1 from projects p
      where p.id = shop_review_requests.project_id
        and (p.user_id = auth.uid() or exists (
          select 1 from project_collaborators pc where pc.project_id = p.id and pc.user_id = auth.uid()
        ))
    )
  );
