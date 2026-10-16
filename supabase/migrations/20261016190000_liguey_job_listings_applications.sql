-- Kebu Liguey (K066) — acceptance case 4: employer/recruiter workflow
-- (authorized posting + tenant-scoped applicant review), with the minimum
-- of acceptance case 3 (submit/withdraw) needed to make review real
-- rather than reviewing zero applications forever.
--
-- Employer = an existing Kebu business (businesses/business_members),
-- not a new parallel employer concept — confirmed as the only tenant
-- entity in the codebase before writing this. Follows the existing
-- business_events/event_registrations precedent (same owner-portal shape:
-- public_id, draft/published/closed/archived-style status, a business-
-- scoped manager check) rather than inventing a new authorization model.
--
-- Deliberately does NOT reuse lib/business/assert-manager.ts's role list
-- (['founder','administrator','store_manager','manager','creative']) —
-- confirmed inconsistent with the DB's own business_members role check
-- constraint and with the OTHER two inline copies of this same check
-- (app/api/businesses/[id]/events/route.ts and its registrations route),
-- which both use only ['founder','administrator','store_manager']. This
-- migration's RLS mirrors the latter, narrower, DB-constraint-consistent
-- list. The ambiguity itself is not resolved here — that is a separate,
-- pre-existing inconsistency across three call sites, out of scope for
-- this migration.

create schema if not exists private;

create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  public_id text not null unique,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 8000),
  requirements text not null default '' check (char_length(requirements) <= 4000),
  employment_type text not null check (employment_type in
    ('full_time', 'part_time', 'contract', 'internship', 'apprenticeship', 'gig')),
  location_type text not null default 'onsite' check (location_type in ('onsite', 'remote', 'hybrid')),
  location text not null default '' check (char_length(location) <= 160),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_listings_business_idx on public.job_listings (business_id, status, updated_at desc);

drop trigger if exists job_listings_set_updated_at on public.job_listings;
create trigger job_listings_set_updated_at
  before update on public.job_listings
  for each row execute function public.set_updated_at();

alter table public.job_listings enable row level security;

create policy "Business members read their listings"
  on public.job_listings for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = job_listings.business_id and m.user_id = auth.uid() and m.status = 'active'
  ));

create policy "Business managers create listings"
  on public.job_listings for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = job_listings.business_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

create policy "Business managers update their listings"
  on public.job_listings for update to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = job_listings.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ))
  with check (exists (
    select 1 from public.business_members m
    where m.business_id = job_listings.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ));

revoke all on public.job_listings from anon;
revoke insert, update, delete on public.job_listings from authenticated;
grant select on public.job_listings to authenticated;
grant insert (business_id, public_id, title, description, requirements, employment_type,
  location_type, location, status, created_by) on public.job_listings to authenticated;
grant update (title, description, requirements, employment_type, location_type, location, status)
  on public.job_listings to authenticated;

-- No anon/public SELECT policy — mirrors business_events: a published
-- listing's public reach goes through a service-role API route filtering
-- status='published' in application code, not through RLS opening the
-- table to anon. That public route is K066 acceptance case 2 (real work
-- discovery), not attempted in this migration.

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  cover_note text not null default '' check (char_length(cover_note) <= 4000),
  status text not null default 'submitted' check (status in
    ('submitted', 'reviewed', 'accepted', 'declined', 'withdrawn')),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, applicant_user_id)
);

create index job_applications_business_idx on public.job_applications (business_id, status, updated_at desc);
create index job_applications_applicant_idx on public.job_applications (applicant_user_id, created_at desc);

drop trigger if exists job_applications_set_updated_at on public.job_applications;
create trigger job_applications_set_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

-- An application's identity (which listing/business/applicant it is)
-- cannot be reassigned by anyone after creation — same convention as
-- guard_workspace_item_identity / guard_library_node_identity.
create or replace function private.guard_job_application_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
      or new.listing_id is distinct from old.listing_id
      or new.business_id is distinct from old.business_id
      or new.applicant_user_id is distinct from old.applicant_user_id
    then
      raise exception 'An application''s listing, business or applicant cannot be changed.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_job_application_identity() from public;
drop trigger if exists guard_job_application_identity on public.job_applications;
create trigger guard_job_application_identity before update on public.job_applications
for each row execute function private.guard_job_application_identity();

-- decided_at/decided_by are never client-writable (not granted to
-- authenticated at all, same convention as worker_profiles.verified_at) —
-- a status transition into 'accepted'/'declined' stamps them
-- automatically here instead, so "who decided and when" cannot be
-- forged by either side, and reverting out of a decided state clears
-- them rather than leaving a stale decision record.
create or replace function private.stamp_job_application_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') then
      new.decided_at = now();
      new.decided_by = auth.uid();
    else
      new.decided_at = null;
      new.decided_by = null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_job_application_decision() from public;
drop trigger if exists stamp_job_application_decision on public.job_applications;
create trigger stamp_job_application_decision before update on public.job_applications
for each row execute function private.stamp_job_application_decision();

alter table public.job_applications enable row level security;

create policy "Applicants and business members read applications"
  on public.job_applications for select to authenticated
  using (
    applicant_user_id = auth.uid()
    or exists (
      select 1 from public.business_members m
      where m.business_id = job_applications.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- job_listings has no public/anon SELECT policy (see above) — an
-- applicant is never a business_members row for the hiring business, so
-- they cannot see the job_listings row at all under their own RLS, and a
-- WITH CHECK subquery evaluated as the applicant would always see zero
-- rows there regardless of whether the listing is genuinely published.
-- This SECURITY DEFINER helper exists only to answer "is there a
-- published listing with this id/business_id" as a bare boolean — it
-- leaks no field of the listing and is not reachable outside the policy
-- that calls it (the `private` schema, same boundary as every other
-- private.* helper in this codebase).
create or replace function private.is_published_job_listing(p_listing_id uuid, p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.job_listings l
    where l.id = p_listing_id and l.business_id = p_business_id and l.status = 'published'
  );
$$;
revoke all on function private.is_published_job_listing(uuid, uuid) from public, anon;
grant execute on function private.is_published_job_listing(uuid, uuid) to authenticated, service_role;

create policy "Workers apply to published listings"
  on public.job_applications for insert to authenticated
  with check (
    applicant_user_id = auth.uid()
    and private.is_published_job_listing(listing_id, business_id)
  );

create policy "Applicants withdraw their own application"
  on public.job_applications for update to authenticated
  using (applicant_user_id = auth.uid())
  with check (applicant_user_id = auth.uid() and status = 'withdrawn');

create policy "Business managers decide on applications"
  on public.job_applications for update to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = job_applications.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ))
  with check (exists (
    select 1 from public.business_members m
    where m.business_id = job_applications.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ));

revoke all on public.job_applications from anon;
revoke insert, update, delete on public.job_applications from authenticated;
grant select on public.job_applications to authenticated;
grant insert (listing_id, business_id, applicant_user_id, cover_note) on public.job_applications to authenticated;
-- cover_note is set once at submission and is otherwise immutable; only
-- status (withdraw, or a manager's decision) can ever be updated.
grant update (status) on public.job_applications to authenticated;
