-- Verified African ID cards are exposed through the controlled public API.
-- Direct table access is limited to the authenticated owner so private columns
-- cannot be enumerated by unrelated signed-in users.

drop policy if exists "Public read verified Afrique ID cards" on public.afrique_ids;
drop policy if exists "Users read own Afrique ID" on public.afrique_ids;

create policy "Users read own Afrique ID"
  on public.afrique_ids
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
  );


