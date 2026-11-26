-- Run in Kebu-qa as a migration administrator. All fixtures roll back.
begin;
insert into auth.users(id,email) values
('33400000-0000-4000-8000-000000000021','yanmay-checkout-owner@example.com'),
('33400000-0000-4000-8000-000000000022','yanmay-checkout-employee@example.com');
insert into public.businesses(id,public_kebu_id,legal_name,country_code,category,description,created_by)
values ('33400000-0000-4000-8000-000000000023','KEBU-US-26-QA0523','QA','US','Food','QA','33400000-0000-4000-8000-000000000021');
insert into public.business_members(business_id,user_id,role) values
('33400000-0000-4000-8000-000000000023','33400000-0000-4000-8000-000000000021','founder'),
('33400000-0000-4000-8000-000000000023','33400000-0000-4000-8000-000000000022','employee')
on conflict (business_id,user_id) do update set role=excluded.role;
insert into public.retail_locations(id,business_id,code,name,address,timezone) values
('33400000-0000-4000-8000-000000000024','33400000-0000-4000-8000-000000000023','QA','QA','QA','UTC');
insert into public.projects(id,owner_id,business_id,title) values
('33400000-0000-4000-8000-000000000025','33400000-0000-4000-8000-000000000021','33400000-0000-4000-8000-000000000023','QA Catalog');
insert into public.project_products(id,project_id,name) values
('33400000-0000-4000-8000-000000000026','33400000-0000-4000-8000-000000000025','QA Product');
insert into public.retail_recipe_versions(id,business_id,product_id,version,instructions) values
('33400000-0000-4000-8000-000000000027','33400000-0000-4000-8000-000000000023','33400000-0000-4000-8000-000000000026',1,'QA recipe');
insert into public.retail_devices(business_id,location_id,label,kind,credential_hash)
select '33400000-0000-4000-8000-000000000023','33400000-0000-4000-8000-000000000024',kind,kind,repeat(hash,64)
from (values ('register','a'),('kiosk','b'),('kitchen','c')) as fixtures(kind,hash);
set local role authenticated;
select set_config('request.jwt.claim.sub','33400000-0000-4000-8000-000000000021',true);
select public.retail_set_menu_item('33400000-0000-4000-8000-000000000024','33400000-0000-4000-8000-000000000027',500,875);
do $$ begin
  if (select count(*) from public.retail_order_menu('33400000-0000-4000-8000-000000000023',repeat('a',64),'register')) <> 1
  then raise exception 'Register menu unavailable'; end if;
end $$;
select set_config('request.jwt.claim.sub','33400000-0000-4000-8000-000000000022',true);
do $$ begin
  begin
    perform public.retail_order_menu('33400000-0000-4000-8000-000000000023',repeat('a',64),'register');
    raise exception 'Register usable without a store assignment';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
declare
  tenant constant uuid := '33400000-0000-4000-8000-000000000023';
  request_id constant uuid := '33400000-0000-4000-8000-000000000028';
  cart jsonb;
  quote jsonb;
begin
  select jsonb_object_agg(id,2) into cart from public.retail_order_menu(tenant,repeat('b',64),'kiosk');
  quote := public.retail_create_checkout(tenant,repeat('b',64),'kiosk',request_id,cart);
  if quote->>'subtotal_cents' is distinct from '1000' or quote->>'tax_cents' is distinct from '88'
    or quote->>'total_cents' is distinct from '1088' then raise exception 'Incorrect checkout totals: %',quote; end if;
  if public.retail_create_checkout(tenant,repeat('b',64),'kiosk',request_id,cart) is distinct from quote
    then raise exception 'Identical retry returned a different quote'; end if;
  begin
    perform public.retail_create_checkout(tenant,repeat('b',64),'kiosk',request_id,'{"33400000-0000-4000-8000-000000000029":2}');
    raise exception 'Changed retry unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','33400000-0000-4000-8000-000000000021',true);
do $$ begin
  if exists(select 1 from public.retail_kitchen_queue('33400000-0000-4000-8000-000000000023',repeat('c',64)))
  then raise exception 'Unpaid quote routed to kitchen'; end if;
end $$;
reset role;
-- This settlement is a SQL fixture only, not provider acceptance.
insert into public.retail_settlements(checkout_id,provider,provider_reference,paid_cents,currency)
values ('33400000-0000-4000-8000-000000000028','qa-fixture','yanmay-checkout-test',1088,'USD');
set local role authenticated;
do $$
declare
  tenant constant uuid := '33400000-0000-4000-8000-000000000023';
  ticket constant uuid := '33400000-0000-4000-8000-000000000028';
begin
  if (select state from public.retail_kitchen_queue(tenant,repeat('c',64))) is distinct from 'new'
  then raise exception 'Settled checkout did not reach kitchen'; end if;
  if not public.retail_advance_kitchen(tenant,repeat('c',64),ticket,'new')
    or public.retail_advance_kitchen(tenant,repeat('c',64),ticket,'new')
    or not public.retail_advance_kitchen(tenant,repeat('c',64),ticket,'preparing')
  then raise exception 'Kitchen transitions were not enforced'; end if;
  if exists(select 1 from public.retail_kitchen_queue(tenant,repeat('c',64)))
  then raise exception 'Ready ticket was left in the active queue'; end if;
end $$;
rollback;
