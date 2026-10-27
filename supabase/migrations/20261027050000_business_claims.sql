-- Claim-existing-company, with proof. Deliberately conservative: approving a
-- claim never silently transfers or adds ownership on a business that
-- already has an active member -- see lib/kebu-id/business-claims.ts for the
-- orphaned-vs-active-member distinction enforced in application code. This
-- migration only stores the claim and its review, and protects the proof
-- document; it does not itself grant membership.

create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  claimant_user_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (char_length(trim(note)) between 10 and 2000),
  proof_storage_path text not null,
  proof_file_name text not null check (char_length(trim(proof_file_name)) between 1 and 255),
  proof_mime_type text not null check (char_length(trim(proof_mime_type)) between 3 and 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_reason text check (review_reason is null or char_length(trim(review_reason)) between 3 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_claims_business_idx on public.business_claims (business_id, status);
create index if not exists business_claims_claimant_idx on public.business_claims (claimant_user_id);

-- One live claim per (claimant, business) at a time -- resubmission requires
-- the prior claim to be resolved first, so an admin never sees duplicate
-- pending noise from the same person re-clicking submit.
create unique index if not exists business_claims_one_pending_idx
  on public.business_claims (business_id, claimant_user_id)
  where (status = 'pending');

drop trigger if exists business_claims_set_updated_at on public.business_claims;
create trigger business_claims_set_updated_at
  before update on public.business_claims
  for each row execute function public.set_updated_at();

alter table public.business_claims enable row level security;

drop policy if exists "Claimants read own claims" on public.business_claims;
create policy "Claimants read own claims"
  on public.business_claims for select
  using (claimant_user_id = auth.uid());

drop policy if exists "Admins read all claims" on public.business_claims;
create policy "Admins read all claims"
  on public.business_claims for select
  using (
    exists (
      select 1 from public.platform_staff_roles r
      where r.user_id = auth.uid() and r.role in ('admin', 'support') and r.active
    )
  );

-- Insert is defense-in-depth only: the real "not already an active member"
-- and "business exists" checks run server-side in
-- lib/kebu-id/business-claims.ts before this ever executes, using the
-- service role, so this policy only needs to stop a client from forging
-- someone else's claimant_user_id or a non-pending initial status.
drop policy if exists "Claimants create own pending claims" on public.business_claims;
create policy "Claimants create own pending claims"
  on public.business_claims for insert
  with check (claimant_user_id = auth.uid() and status = 'pending');

-- Only an admin may change status (approve/reject); a claimant can never
-- edit their own claim once submitted, so they can't self-approve or alter
-- their own note/proof after the fact.
drop policy if exists "Admins review claims" on public.business_claims;
create policy "Admins review claims"
  on public.business_claims for update
  using (
    exists (
      select 1 from public.platform_staff_roles r
      where r.user_id = auth.uid() and r.role in ('admin', 'support') and r.active
    )
  )
  with check (
    exists (
      select 1 from public.platform_staff_roles r
      where r.user_id = auth.uid() and r.role in ('admin', 'support') and r.active
    )
  );

grant select, insert on public.business_claims to authenticated;
grant update on public.business_claims to authenticated;

-- Private bucket for claim proof documents. Separate from business-documents
-- (017) on purpose: that bucket's policies require the uploader to already
-- be an active member of the business, which a claimant by definition is
-- not yet.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-claim-documents',
  'business-claim-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Claim proof own folder upload" on storage.objects;
create policy "Claim proof own folder upload"
  on storage.objects for insert
  with check (
    bucket_id = 'business-claim-documents'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Claim proof read own or admin" on storage.objects;
create policy "Claim proof read own or admin"
  on storage.objects for select
  using (
    bucket_id = 'business-claim-documents'
    and auth.uid() is not null
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.platform_staff_roles r
        where r.user_id = auth.uid() and r.role in ('admin', 'support') and r.active
      )
    )
  );
