-- Prevent account owners from assigning server-controlled Afrique ID fields
-- during initial row creation. Verification remains an administrative action.

drop policy if exists "Users insert own Afrique ID" on public.afrique_ids;

create policy "Users insert own unverified Afrique ID"
  on public.afrique_ids
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and eligibility_status = 'unverified'
    and verified_at is null
  );

