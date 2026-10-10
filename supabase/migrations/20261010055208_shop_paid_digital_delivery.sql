-- A purchased file is immutable even when the catalog changes later.
alter table public.shop_order_items add column if not exists digital_delivery jsonb;
alter table public.shop_digital_downloads
  add column if not exists delivery_version integer not null default 0,
  add column if not exists recipient_email text,
  add column if not exists shop_name text,
  add column if not exists product_name text,
  add column if not exists notification_started_at timestamptz,
  add column if not exists notification_lease_until timestamptz,
  add column if not exists notification_lease_id uuid,
  add column if not exists notification_sent_at timestamptz;
-- Refuse existing duplicates rather than destroy historical receipts.
create unique index if not exists shop_digital_downloads_purchase_key
  on public.shop_digital_downloads(order_id,product_id);
create index if not exists shop_digital_downloads_mail_pending_idx
  on public.shop_digital_downloads(created_at)
  where delivery_version=1 and notification_sent_at is null;
revoke all on public.shop_digital_downloads from anon,authenticated;
grant select,insert,update,delete on public.shop_digital_downloads to service_role;

create or replace function public.snapshot_shop_digital_item() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.project_products%rowtype;
begin
  -- Never accept a browser-supplied snapshot or a file from another project.
  new.digital_delivery:=null;
  select * into p from public.project_products where id=new.product_id and project_id=new.project_id;
  if found and p.is_digital then
    if p.digital_file_path is null or p.digital_file_path not like
      new.project_id::text||'/'||new.product_id::text||'/%' then
      raise exception 'Digital product file is unavailable.';
    end if;
    new.digital_delivery:=jsonb_build_object('filePath',p.digital_file_path,
      'fileName',coalesce(p.digital_file_name,'download'),
      'maxDownloads',p.digital_dl_limit,'expiresHours',p.digital_expires_hours);
  end if;
  return new;
end $$;
revoke all on function public.snapshot_shop_digital_item() from public,anon,authenticated,service_role;
create trigger snapshot_shop_digital_item before insert on public.shop_order_items
  for each row execute function public.snapshot_shop_digital_item();

create or replace function public.issue_paid_shop_digital_delivery() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.payment_status<>'paid' or new.status='cancelled' or new.is_demo then return new; end if;
  insert into public.shop_digital_downloads(order_id,project_id,product_id,token,
    file_path,file_name,expires_at,max_downloads,delivery_version,recipient_email,shop_name,product_name)
  select new.id,new.project_id,i.product_id,
    replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),
    i.digital_delivery->>'filePath',i.digital_delivery->>'fileName',
    now()+make_interval(hours=>(i.digital_delivery->>'expiresHours')::int),
    (i.digital_delivery->>'maxDownloads')::int,1,
    case when new.is_gift then new.recipient_email else new.customer_email end,
    coalesce(p.title,'Kebu'),i.product_name
  from (select distinct on (product_id) * from public.shop_order_items
    where order_id=new.id and project_id=new.project_id and digital_delivery is not null
    order by product_id,sort_order,id) i
  join public.projects p on p.id=new.project_id
  on conflict(order_id,product_id) do nothing;
  return new;
end $$;
revoke all on function public.issue_paid_shop_digital_delivery() from public,anon,authenticated,service_role;
create trigger issue_paid_shop_digital_delivery after update of payment_status on public.shop_orders
  for each row execute function public.issue_paid_shop_digital_delivery();

create or replace function public.resolve_paid_shop_download(p_token text) returns jsonb
language sql security definer set search_path=public,pg_temp as $$
  select to_jsonb(d) from public.shop_digital_downloads d
  join public.shop_orders o on o.id=d.order_id and o.project_id=d.project_id
  where p_token ~ '^[0-9a-f]{64}$' and d.token=p_token and d.delivery_version=1
    and o.payment_status='paid' and o.status<>'cancelled' and not o.is_demo
    and d.expires_at>now() and d.download_count<d.max_downloads;
$$;
revoke all on function public.resolve_paid_shop_download(text) from public,anon,authenticated;
grant execute on function public.resolve_paid_shop_download(text) to service_role;

create or replace function public.consume_paid_shop_download(p_token text) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare oid uuid; o public.shop_orders%rowtype; consumed uuid;
begin
  if p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  select order_id into oid from public.shop_digital_downloads where token=p_token;
  if not found then return false; end if;
  -- Same order-first lock order as refunds and paid delivery.
  select * into o from public.shop_orders where id=oid for update;
  if not found or o.payment_status<>'paid' or o.status='cancelled' or o.is_demo then return false; end if;
  update public.shop_digital_downloads set download_count=download_count+1
    where token=p_token and order_id=o.id and project_id=o.project_id and delivery_version=1
      and expires_at>now() and download_count<max_downloads returning id into consumed;
  return consumed is not null;
end $$;
revoke all on function public.consume_paid_shop_download(text) from public,anon,authenticated;
grant execute on function public.consume_paid_shop_download(text) to service_role;

create or replace function public.claim_shop_digital_emails(p_limit int default 25) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if p_limit<1 or p_limit>25 then raise exception 'Invalid email batch size.'; end if;
  with candidates as (
    select d.id from public.shop_digital_downloads d
    join public.shop_orders o on o.id=d.order_id and o.project_id=d.project_id
    where d.delivery_version=1 and d.notification_sent_at is null
      and d.recipient_email ~* '^[^@]+@[^@]+\.[^@]+$'
      and o.payment_status='paid' and o.status<>'cancelled' and not o.is_demo
      and d.expires_at>now()
      and (d.notification_lease_until is null or d.notification_lease_until<now())
      and (d.notification_started_at is null or d.notification_started_at>now()-interval '23 hours')
    order by d.created_at,d.id limit p_limit for update of d skip locked
  ), claimed as (
    update public.shop_digital_downloads d
      set notification_started_at=coalesce(notification_started_at,now()),
        notification_lease_until=now()+interval '5 minutes',notification_lease_id=gen_random_uuid()
      from candidates c where d.id=c.id returning d.*
  ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
  return result;
end $$;
revoke all on function public.claim_shop_digital_emails(int) from public,anon,authenticated;
grant execute on function public.claim_shop_digital_emails(int) to service_role;

-- Provision private storage without silently changing an existing public bucket.
do $$ begin
  if exists(select 1 from storage.buckets where id='digital-files' and public) then
    raise exception 'Digital files bucket must be private before delivery is enabled.';
  end if;
end $$;
insert into storage.buckets(id,name,public) values('digital-files','digital-files',false)
  on conflict(id) do nothing;
