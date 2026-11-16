-- Private naming research, distinct from government registration or trademark clearance.
create table public.business_name_shortlists(
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 name text not null check(char_length(trim(name)) between 2 and 120),country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 goods_services text not null check(char_length(trim(goods_services)) between 2 and 1000),
 created_at timestamptz not null default clock_timestamp()
);
create index business_name_shortlists_user_idx on public.business_name_shortlists(user_id,created_at desc);
alter table public.business_name_shortlists enable row level security;
revoke all on public.business_name_shortlists from public,anon,authenticated;
grant select,insert,delete on public.business_name_shortlists to authenticated;
create policy naming_own_read on public.business_name_shortlists for select to authenticated using(user_id=(select auth.uid()));
create policy naming_own_add on public.business_name_shortlists for insert to authenticated with check(user_id=(select auth.uid()));
create policy naming_own_remove on public.business_name_shortlists for delete to authenticated using(user_id=(select auth.uid()));
