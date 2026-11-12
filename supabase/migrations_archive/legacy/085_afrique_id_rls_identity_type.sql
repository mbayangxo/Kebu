-- 085: Fix RLS update policy for African ID so identity_type can be changed
-- The original "Users request Afrique ID verification" policy required eligibility_status = 'pending'
-- on the resulting row, which blocked the PATCH /api/me/afrique-id handler from updating
-- identity_type (indigenous | visitor) for users whose status is 'unverified', 'rejected', etc.
-- Users were seeing "Could not save ID type." silently.
--
-- New policy: users can update their own row to any status that isn't admin-controlled
-- (verified / suspended / manual_review). Application routes enforce the actual allowed
-- transitions — this layer only prevents self-verification and self-suspension.

drop policy if exists "Users request Afrique ID verification" on public.afrique_ids;
drop policy if exists "Users update own Afrique ID" on public.afrique_ids;

create policy "Users update own Afrique ID"
  on public.afrique_ids for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and eligibility_status not in ('verified', 'suspended', 'manual_review')
  );
