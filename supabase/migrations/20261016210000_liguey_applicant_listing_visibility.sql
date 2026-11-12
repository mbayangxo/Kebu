-- Kebu Liguey (K066) — a worker reading the listings they applied to.
--
-- Found while building real-browser verification for case 8: "Business
-- members read their listings" (20261016190000) is the ONLY SELECT
-- policy on job_listings, and it only matches business_members rows —
-- an applicant has none. That makes /liguey/applications (and the GET
-- handler in app/api/liguey/applications/route.ts, which the page
-- mirrors) silently unable to ever resolve a listing's title for the
-- worker who applied to it: the UI falls back to the literal word
-- "Listing" forever, not a loading state, not an error — a real,
-- previously-undetected functional gap, not a test artifact.
--
-- Same shape as case 6 (profile_visibility_for_reviewers) but in the
-- other direction: a worker may read a job_listings row if they have
-- ANY application to it (submitted, reviewed, accepted, declined, or
-- withdrawn) — their own application history should keep showing the
-- real title even after withdrawing, not revoke it. No SECURITY
-- DEFINER helper needed: the applicant already has SELECT on their own
-- job_applications rows under the existing "Applicants and business
-- members read applications" policy, so this check does not bypass RLS
-- anywhere.

drop policy if exists "Business members read their listings" on public.job_listings;
create policy "Business members and applicants read listings"
  on public.job_listings for select to authenticated
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = job_listings.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
    or exists (
      select 1 from public.job_applications ja
      where ja.listing_id = job_listings.id and ja.applicant_user_id = auth.uid()
    )
  );
