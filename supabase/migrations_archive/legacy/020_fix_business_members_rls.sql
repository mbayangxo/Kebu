-- Fix recursive RLS on business_members that can block membership reads (signup / portfolio / business list).

drop policy if exists "Users select own memberships" on public.business_members;
create policy "Users select own memberships"
  on public.business_members for select
  using (user_id = auth.uid());
