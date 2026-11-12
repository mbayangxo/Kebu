-- Kebu Liguey (K066) acceptance case 6: meaningful integration.
--
-- Confirmed before writing anything: a reviewing business manager could
-- only ever see an applicant's cover_note and status
-- (app/api/liguey/employers/[businessId]/listings/[listingId]/route.ts) —
-- never their worker_profile (skills, languages, experience) or portfolio
-- evidence (worker_profile_evidence -> library_nodes), because
-- worker_profiles/worker_profile_evidence (20261016180000) have only ever
-- had an owner-only SELECT policy. Review has been genuinely blind beyond
-- free text.
--
-- This connects two already-built pieces (case 1's profile, case 4's
-- review flow) rather than inventing a new integration surface: a
-- business's active members may read a worker_profile/
-- worker_profile_evidence row IF that worker has a non-withdrawn
-- application to one of that business's listings. Revocable, not
-- permanent: withdrawing an application (job_applications.status =
-- 'withdrawn') removes this visibility on the very next read, since the
-- check is a live EXISTS against job_applications, not a cached grant.
--
-- No SECURITY DEFINER helper is needed here, deliberately: the EXISTS
-- subqueries below read job_applications and business_members, and a
-- reviewing business member already has SELECT rights on both of those
-- rows under their OWN existing RLS (job_applications' "Applicants and
-- business members read applications" policy, and business_members'
-- always-visible self-row) — so this policy can check visibility
-- directly without bypassing RLS anywhere. Deliberately NOT building a
-- Rooms-on-hire or Network-connection-on-hire flow in this slice:
-- Network has no 1:1 connection primitive at all (confirmed), and Rooms
-- membership has no revocation primitive tied to application status —
-- both would be speculative, unspecified integration surfaces, not a
-- connection of already-built pieces.

drop policy if exists "Workers read own profile" on public.worker_profiles;
create policy "Workers read own profile"
  on public.worker_profiles for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.job_applications ja
      where ja.applicant_user_id = worker_profiles.user_id
        and ja.status != 'withdrawn'
        and exists (
          select 1 from public.business_members m
          where m.business_id = ja.business_id and m.user_id = auth.uid() and m.status = 'active'
        )
    )
  );

drop policy if exists "Workers read own evidence" on public.worker_profile_evidence;
create policy "Workers read own evidence"
  on public.worker_profile_evidence for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.job_applications ja
      where ja.applicant_user_id = worker_profile_evidence.user_id
        and ja.status != 'withdrawn'
        and exists (
          select 1 from public.business_members m
          where m.business_id = ja.business_id and m.user_id = auth.uid() and m.status = 'active'
        )
    )
  );
