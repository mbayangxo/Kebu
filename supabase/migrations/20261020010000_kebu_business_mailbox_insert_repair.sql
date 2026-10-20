-- Kebu Mail — business mailbox creation was unreachable.
--
-- Found while building real-browser verification: the only INSERT policy
-- ever added to public.mailboxes is m1's "Users create own personal
-- mailbox", which requires mailbox_type = 'personal'. No migration in the
-- Mail chain (m1, m2, m3, delivery infrastructure, platform domain,
-- reputation guardrails) ever added an INSERT policy for a 'business' (or
-- 'shared') mailbox. app/api/mail/business/route.ts's create_mailbox
-- action inserts through the caller's own RLS-scoped client (not
-- service_role), so every attempt to create hello@<verified-domain> has
-- always failed with a bare row-level-security rejection — not a surfaced,
-- diagnosable error, just a generic 500 the UI shows as "Business mail
-- setup failed." Reproduced before writing this fix: the real-browser
-- harness's business-mailbox test failed with exactly this Postgres
-- 42501 error.
--
-- Mirrors the existing mail_domains INSERT policy from
-- 20260920121000_kebu_business_mail_m3.sql: reuse the already-defined
-- can_manage_business_mail() SECURITY DEFINER helper rather than
-- reimplementing the role check. Added as an additional permissive
-- policy alongside the personal-mailbox one (Postgres ORs permissive
-- policies together for the same command), so personal mailbox creation
-- is unaffected.

drop policy if exists "Business mail admins create business mailboxes" on public.mailboxes;
create policy "Business mail admins create business mailboxes"
  on public.mailboxes for insert
  with check (
    mailbox_type in ('business', 'shared')
    and business_id is not null
    and owner_user_id is null
    and public.can_manage_business_mail(business_id)
  );
