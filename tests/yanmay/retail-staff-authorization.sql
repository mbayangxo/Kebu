begin;
insert into auth.users(id,email) values ('33400000-0000-4000-8000-000000000001','yanmay-s03-owner@example.com'),('33400000-0000-4000-8000-000000000002','yanmay-s03-employee@example.com');
insert into public.businesses(id,public_kebu_id,legal_name,country_code,category,description,created_by) values ('33400000-0000-4000-8000-000000000003','KEBU-US-26-QA0334','QA','US','Food','QA','33400000-0000-4000-8000-000000000001');
insert into public.business_members(business_id,user_id,role) values ('33400000-0000-4000-8000-000000000003','33400000-0000-4000-8000-000000000001','founder'),('33400000-0000-4000-8000-000000000003','33400000-0000-4000-8000-000000000002','employee') on conflict (business_id,user_id) do update set role=excluded.role;
insert into public.retail_locations(id,business_id,code,name,address,timezone) select ('33400000-0000-4000-8000-00000000000'||i)::uuid,'33400000-0000-4000-8000-000000000003','QA-'||i,'QA','QA','UTC' from generate_series(4,5) i;
set local role authenticated;
select set_config('request.jwt.claim.sub','33400000-0000-4000-8000-000000000001',true);
insert into public.retail_staff_assignments values ('33400000-0000-4000-8000-000000000003','33400000-0000-4000-8000-000000000004','33400000-0000-4000-8000-000000000002','register');
select set_config('request.jwt.claim.sub','33400000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.retail_locations where business_id='33400000-0000-4000-8000-000000000003') <> 1 then raise exception 'Store isolation failed'; end if;
  begin
    insert into public.retail_staff_assignments values ('33400000-0000-4000-8000-000000000003','33400000-0000-4000-8000-000000000005','33400000-0000-4000-8000-000000000002','register');
    raise exception 'Self assignment succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update public.business_members set status='removed' where user_id='33400000-0000-4000-8000-000000000002';
set local role authenticated;
do $$ begin
  if exists (select 1 from public.retail_locations where business_id='33400000-0000-4000-8000-000000000003') then raise exception 'Revocation failed'; end if;
end $$;
rollback;
