-- AfriID × Kebu ID registration depth (build-order items 3-5 of
-- docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md).
--
-- Items 1 (seller bind) and 2 (informal_unregistered) are already real and
-- implemented elsewhere (lib/shop/seller-trust.ts; the only country module,
-- SN, already has informal_unregistered) -- verified by reading the live
-- code, not assumed. This migration only adds what's genuinely missing:
-- commerce fields on Kebu ID, AfriID profile depth, optional sensitive
-- fields with explicit consent tracking, and the plumbing to make
-- businesses.verification_level a real, server-computed signal instead of
-- dead schema.

-- ===========================
-- Item 3: commerce fields on Kebu ID
-- ===========================
alter table public.businesses
  add column if not exists delivery_radius_km numeric(6,1)
    check (delivery_radius_km is null or delivery_radius_km >= 0),
  add column if not exists cross_border_willing boolean not null default false,
  add column if not exists years_operating integer
    check (years_operating is null or years_operating >= 0),
  add column if not exists supply_capacity text
    check (supply_capacity is null or char_length(supply_capacity) <= 500);

-- ===========================
-- Item 4: AfriID profile depth (no biometrics yet, per spec)
-- ===========================
alter table public.afrique_ids
  add column if not exists birth_country_code char(2),
  add column if not exists occupation text
    check (occupation is null or char_length(occupation) <= 160),
  add column if not exists skills text[] not null default '{}',
  add column if not exists financial_status text
    check (financial_status is null or financial_status in ('banked', 'mobile_money_only', 'unbanked'));

-- ===========================
-- Item 5: optional sensitive fields, explicit consent only.
-- Ethnic/ancestral group already exists inside heritage_notes (bundled with
-- the verification-request flow) -- next of kin and land declaration are
-- the genuinely new, more sensitive fields, kept separate from that
-- required flow so consent is unambiguous and auditable.
-- ===========================
alter table public.afrique_ids
  add column if not exists next_of_kin jsonb,
  add column if not exists land_declaration jsonb,
  add column if not exists sensitive_fields_consent jsonb not null default '{}'::jsonb;

comment on column public.afrique_ids.next_of_kin is
  'Optional, explicit-consent-only. Never a KA Score/credit input, never public.';
comment on column public.afrique_ids.land_declaration is
  'Optional, explicit-consent-only seed for a future land registry -- NOT a Property Passport. Never a KA Score/credit input, never public.';
comment on column public.afrique_ids.sensitive_fields_consent is
  'Audit trail of explicit opt-in per sensitive field: {"nextOfKin":{"consentedAt":"..."},"landDeclaration":{"consentedAt":"..."}}.';

-- ===========================
-- Kebu ID verification_level: document-review plumbing for level 4.
-- The column and its 1-4 CHECK already exist (migration 005); it has never
-- advanced past 1 anywhere in the live app. This adds only the admin-review
-- columns level 4 needs. The actual recompute runs in
-- lib/kebu-id/verification-level.ts via the service-role admin client
-- (plain .from()/.update() calls, matching this codebase's existing
-- JS-authorization convention rather than a PostgREST `.rpc()` call), and is
-- only ever invoked from trusted server routes -- never exposed to the
-- browser, so a signed-in user has no path to set their own level.
-- ===========================
-- No reviewed_by FK: this codebase's admin portal (lib/admin/admin-session.ts)
-- is a single shared signed cookie, not per-admin auth.users rows, so there
-- is no real user id to reference honestly -- the timestamp alone is the
-- real signal the recompute function needs.
alter table public.businesses
  add column if not exists verification_documents_reviewed_at timestamptz;

-- ===========================
-- Real bug found while verifying this slice (not caused by it): the only
-- UPDATE policy ever defined for public.businesses (archived migration 006)
-- pins `with check (verification_level = 1 and lifecycle_status = 'draft')`
-- -- so a founder/administrator could never actually save ANY field on an
-- already-active business, including every pre-existing editable field
-- (trading_name, description, business_email, ...), not just the new
-- commerce fields this slice adds. Reproduced directly against real
-- Postgres with a verification-level-1 ACTIVE business before this fix: an
-- update changing only trading_name was rejected by RLS. This replaces that
-- policy with one that allows a founder/administrator to update their
-- business regardless of lifecycle_status, while still protecting
-- verification_level and lifecycle_status from client-authenticated writes
-- (via a trigger, since `with check` alone cannot compare against the row's
-- prior value) -- service_role (the admin client used by the recompute
-- function and by lifecycle-transition routes) is exempt, matching the
-- `auth.role()` pattern already used elsewhere in this codebase.
-- ===========================
drop policy if exists "Founders update own draft businesses" on public.businesses;
create policy "Founders update own businesses"
  on public.businesses for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

create or replace function public.protect_business_verification_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.verification_level is distinct from old.verification_level
    or new.lifecycle_status is distinct from old.lifecycle_status
    or new.verification_documents_reviewed_at is distinct from old.verification_documents_reviewed_at
  then
    raise exception 'verification_level, lifecycle_status and document-review fields cannot be changed from the browser.';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_protect_verification_fields on public.businesses;
create trigger businesses_protect_verification_fields
  before update on public.businesses
  for each row execute function public.protect_business_verification_fields();

-- ===========================
-- Same bug, same root cause, found on public.afrique_ids while building
-- this slice's new profile-depth PATCH route (archived migration 085):
-- `with check (... and eligibility_status not in ('verified','suspended',
-- 'manual_review'))` re-validates the NEW row's eligibility_status on every
-- update, not just transitions into those values -- so once a user's own
-- AfriID reaches 'verified', 'suspended' or 'manual_review', they can never
-- update ANY field on their own row again (occupation, skills, even the
-- existing heritage notes), because the unrelated update still carries that
-- same unchanged eligibility_status forward into the checked NEW row.
-- Reproduced directly: a plain occupation-only update against a real
-- 'verified' row was rejected by RLS before this fix. Same correct fix as
-- above -- compare OLD vs NEW in a trigger (RLS alone cannot) and only
-- block an actual transition into one of the three admin-controlled
-- statuses, not every update made while already in one.
-- ===========================
drop policy if exists "Users update own Afrique ID" on public.afrique_ids;
create policy "Users update own Afrique ID"
  on public.afrique_ids for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.protect_afrique_id_eligibility_transition()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.eligibility_status is distinct from old.eligibility_status
    and new.eligibility_status in ('verified', 'suspended', 'manual_review')
  then
    raise exception 'eligibility_status cannot be self-set to verified, suspended or manual_review.';
  end if;
  return new;
end;
$$;

drop trigger if exists afrique_ids_protect_eligibility_transition on public.afrique_ids;
create trigger afrique_ids_protect_eligibility_transition
  before update on public.afrique_ids
  for each row execute function public.protect_afrique_id_eligibility_transition();
