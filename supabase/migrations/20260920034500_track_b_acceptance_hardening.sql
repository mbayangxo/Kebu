-- Track B acceptance hardening applied after legacy 087-101 reconciliation.
-- SECURITY DEFINER access is intentionally used by RLS; prevent authenticated callers probing another user's role.
create or replace function public.project_access_role(p_project_id uuid, p_user_id uuid default auth.uid())
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when p_user_id is null then null
    when p_user_id <> auth.uid() and coalesce(auth.role(), '') <> 'service_role' then null
    when exists (select 1 from public.projects p where p.id=p_project_id and p.owner_id=p_user_id) then 'owner'
    else (select pm.role from public.project_members pm where pm.project_id=p_project_id and pm.user_id=p_user_id limit 1)
  end
$$;
create index if not exists platform_events_actor_user_idx on public.platform_events(actor_user_id) where actor_user_id is not null;
create index if not exists platform_usage_project_idx on public.platform_usage_daily(project_id);
create index if not exists project_members_invited_by_idx on public.project_members(invited_by) where invited_by is not null;
create index if not exists user_notifications_project_idx on public.user_notifications(project_id) where project_id is not null;
create index if not exists email_flows_created_by_idx on public.email_flows(created_by);
create index if not exists email_flow_enrollments_subscriber_idx on public.email_flow_enrollments(subscriber_id) where subscriber_id is not null;
create index if not exists shop_expenses_created_by_idx on public.shop_expenses(created_by) where created_by is not null;
create index if not exists shop_purchase_orders_created_by_idx on public.shop_purchase_orders(created_by) where created_by is not null;
create index if not exists shop_companies_created_by_idx on public.shop_companies(created_by) where created_by is not null;
drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications" on public.user_notifications for select using (user_id=(select auth.uid()));
drop policy if exists "Users mark own notifications read" on public.user_notifications;
create policy "Users mark own notifications read" on public.user_notifications for update using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "Members read memberships" on public.project_members;
create policy "Members read memberships" on public.project_members for select using (user_id=(select auth.uid()) or public.can_access_project(project_id,'admin'));
drop policy if exists "Owners manage shop_expenses" on public.shop_expenses;
create policy "Owners manage shop_expenses" on public.shop_expenses for all using (exists(select 1 from public.projects p where p.id=shop_expenses.project_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.projects p where p.id=shop_expenses.project_id and p.owner_id=(select auth.uid())));
drop policy if exists "Owners manage shop_purchase_orders" on public.shop_purchase_orders;
create policy "Owners manage shop_purchase_orders" on public.shop_purchase_orders for all using (exists(select 1 from public.projects p where p.id=shop_purchase_orders.project_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.projects p where p.id=shop_purchase_orders.project_id and p.owner_id=(select auth.uid())));
drop policy if exists "Owners manage shop_purchase_order_items" on public.shop_purchase_order_items;
create policy "Owners manage shop_purchase_order_items" on public.shop_purchase_order_items for all using (exists(select 1 from public.shop_purchase_orders po join public.projects p on p.id=po.project_id where po.id=shop_purchase_order_items.purchase_order_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.shop_purchase_orders po join public.projects p on p.id=po.project_id where po.id=shop_purchase_order_items.purchase_order_id and p.owner_id=(select auth.uid())));
drop policy if exists "Owners manage shop_companies" on public.shop_companies;
create policy "Owners manage shop_companies" on public.shop_companies for all using (exists(select 1 from public.projects p where p.id=shop_companies.project_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.projects p where p.id=shop_companies.project_id and p.owner_id=(select auth.uid())));
drop policy if exists "Owners manage shop_review_requests" on public.shop_review_requests;
create policy "Owners manage shop_review_requests" on public.shop_review_requests for all using (exists(select 1 from public.projects p where p.id=shop_review_requests.project_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.projects p where p.id=shop_review_requests.project_id and p.owner_id=(select auth.uid())));
drop policy if exists "Business members manage email_flows" on public.email_flows;
create policy "Business members manage email_flows" on public.email_flows for all using (exists(select 1 from public.business_members bm where bm.business_id=email_flows.business_id and bm.user_id=(select auth.uid())));
drop policy if exists "Business members manage email_flow_steps" on public.email_flow_steps;
create policy "Business members manage email_flow_steps" on public.email_flow_steps for all using (exists(select 1 from public.email_flows f join public.business_members bm on bm.business_id=f.business_id where f.id=email_flow_steps.flow_id and bm.user_id=(select auth.uid())));
drop policy if exists "Business members manage email_flow_enrollments" on public.email_flow_enrollments;
create policy "Business members manage email_flow_enrollments" on public.email_flow_enrollments for all using (exists(select 1 from public.business_members bm where bm.business_id=email_flow_enrollments.business_id and bm.user_id=(select auth.uid())));
