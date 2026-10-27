-- Kebu Mail M5: shared mailbox membership (support@company.com — multiple
-- employees, RBAC, no shared password). `mailboxes.mailbox_type = 'shared'`
-- and its INSERT policy have existed since 20261020010000, but nothing ever
-- scoped who besides the creator could read or send from one: every read
-- path (this file's own predecessors) and can_send_mailbox() treated
-- 'shared' identically to 'business' -- any active business_members row
-- granted access, and can_send_mailbox() required an admin-tier role,
-- so a shared mailbox's own point (letting ordinary employees share one
-- address) never actually worked. This migration adds the real per-mailbox
-- membership table the product doc (docs/product/KEBU-MAIL.md) sketches as
-- `mail_shared_access`, and rewires every existing read/send check to
-- consult it for 'shared' mailboxes specifically, while leaving 'personal'
-- and 'business' mailbox behavior exactly as it was.

create table if not exists public.mail_shared_access (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  added_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (mailbox_id, user_id)
);

create index if not exists mail_shared_access_mailbox_idx on public.mail_shared_access(mailbox_id);
create index if not exists mail_shared_access_user_idx on public.mail_shared_access(user_id);

-- A row only ever makes sense against a real 'shared' mailbox -- enforced
-- here (not just at the application layer) so a direct insert can't quietly
-- attach membership semantics to a 'business' or 'personal' mailbox.
--
-- security definer is required: without it, this trigger's own SELECT runs
-- under the inserting role's RLS, so a caller RLS already hides the
-- mailbox from (e.g. an outsider with no business_members row at all) sees
-- v_type as null and gets "must reference a shared mailbox" -- a
-- misleading error that masks the real reason (no RLS access) behind an
-- unrelated one. Reproduced and fixed before this migration shipped: an
-- outsider inserting against a real shared mailbox they can't see must
-- fail with the RLS policy's own rejection, not this trigger's.
create or replace function public.mail_shared_access_mailbox_is_shared()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text;
begin
  select mailbox_type into v_type from public.mailboxes where id = new.mailbox_id;
  if v_type is distinct from 'shared' then
    raise exception 'mail_shared_access.mailbox_id must reference a shared mailbox';
  end if;
  return new;
end;
$$;

drop trigger if exists mail_shared_access_requires_shared_mailbox on public.mail_shared_access;
create trigger mail_shared_access_requires_shared_mailbox
  before insert or update on public.mail_shared_access
  for each row execute function public.mail_shared_access_mailbox_is_shared();

-- True for a business-wide mail admin (unchanged definition, existing
-- fallback that can never be locked out by per-mailbox membership rows) or
-- a 'manager' row on this specific shared mailbox.
create or replace function public.can_manage_mail_shared_access(p_mailbox_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.mailboxes mb
    where mb.id = p_mailbox_id
      and mb.business_id is not null
      and (
        public.can_manage_business_mail(mb.business_id)
        or exists (
          select 1 from public.mail_shared_access msa
          where msa.mailbox_id = mb.id and msa.user_id = auth.uid() and msa.role = 'manager'
        )
      )
  );
$$;

revoke all on function public.can_manage_mail_shared_access(uuid) from public, anon;
grant execute on function public.can_manage_mail_shared_access(uuid) to authenticated, service_role;

alter table public.mail_shared_access enable row level security;

drop policy if exists "Members and mail admins read shared access" on public.mail_shared_access;
create policy "Members and mail admins read shared access"
  on public.mail_shared_access for select
  using (
    user_id = auth.uid()
    or public.can_manage_mail_shared_access(mailbox_id)
  );

drop policy if exists "Mailbox managers add shared access" on public.mail_shared_access;
create policy "Mailbox managers add shared access"
  on public.mail_shared_access for insert
  with check (added_by = auth.uid() and public.can_manage_mail_shared_access(mailbox_id));

drop policy if exists "Mailbox managers update shared access" on public.mail_shared_access;
create policy "Mailbox managers update shared access"
  on public.mail_shared_access for update
  using (public.can_manage_mail_shared_access(mailbox_id))
  with check (public.can_manage_mail_shared_access(mailbox_id));

drop policy if exists "Mailbox managers remove shared access" on public.mail_shared_access;
create policy "Mailbox managers remove shared access"
  on public.mail_shared_access for delete
  using (public.can_manage_mail_shared_access(mailbox_id));

-- Read-access check used by mailboxes/mail_threads/mail_messages/mail_attachments
-- SELECT policies (was called can_access_mailbox before this migration; kept the
-- name since every existing policy below already references it by name).
-- 'personal' and 'business' branches are byte-for-byte what they were; only
-- the 'shared' branch is new.
create or replace function public.can_access_mailbox(p_mailbox_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.mailboxes mb
    where mb.id = p_mailbox_id
      and mb.is_active = true
      and (
        (mb.mailbox_type = 'personal' and mb.owner_user_id = auth.uid())
        or (
          mb.mailbox_type = 'business' and mb.business_id is not null and exists (
            select 1 from public.business_members bm
            where bm.business_id = mb.business_id and bm.user_id = auth.uid() and bm.status = 'active'
          )
        )
        or (
          mb.mailbox_type = 'shared' and mb.business_id is not null and (
            public.can_manage_business_mail(mb.business_id)
            or exists (
              select 1 from public.mail_shared_access msa
              where msa.mailbox_id = mb.id and msa.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

-- Send/manage-thread check. 'personal' and 'business' branches unchanged
-- (business sending stays admin-tier, same as before this migration --
-- out of scope for this slice); only the 'shared' branch is new.
create or replace function public.can_send_mailbox(p_mailbox_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.mailboxes mb
    where mb.id = p_mailbox_id
      and mb.is_active = true
      and (
        (mb.mailbox_type = 'personal' and mb.owner_user_id = auth.uid() and mb.business_id is null)
        or (
          mb.mailbox_type = 'business' and mb.business_id is not null
          and public.can_manage_business_mail(mb.business_id)
        )
        or (
          mb.mailbox_type = 'shared' and mb.business_id is not null and (
            public.can_manage_business_mail(mb.business_id)
            or exists (
              select 1 from public.mail_shared_access msa
              where msa.mailbox_id = mb.id and msa.user_id = auth.uid()
            )
          )
        )
      )
  );
$$;

-- mailboxes' own SELECT policy must stay a direct inline expression over
-- its own row's columns, NOT a call to can_access_mailbox(id). Tried the
-- function form first and caught the bug live: can_access_mailbox()
-- re-queries public.mailboxes by id from inside a security-definer
-- function, and for INSERT ... RETURNING on mailboxes itself, that
-- self-referential subquery cannot see the row still being inserted in
-- the same statement -- every personal/business mailbox creation started
-- failing with a bare "new row violates row-level security policy"
-- because RETURNING's visibility check always saw zero rows. Reproduced
-- with the real app's own personal-mailbox-activation flow before fixing.
-- The fix: keep this one policy inline (mailbox_type/business_id/
-- owner_user_id are the candidate row's own columns here, not a
-- subquery), and only add the 'shared' branch via a join to a genuinely
-- different table (mail_shared_access) -- which has no such problem.
-- mail_threads/mail_messages below are a different table than the one
-- they look up, so can_access_mailbox(mailbox_id) there is unaffected.
drop policy if exists "Users read own personal mailboxes" on public.mailboxes;
create policy "Users read own personal mailboxes"
  on public.mailboxes for select
  using (
    (mailbox_type = 'personal' and owner_user_id = auth.uid())
    or (
      mailbox_type = 'business' and business_id is not null and exists (
        select 1 from public.business_members bm
        where bm.business_id = mailboxes.business_id and bm.user_id = auth.uid() and bm.status = 'active'
      )
    )
    or (
      mailbox_type = 'shared' and business_id is not null and (
        public.can_manage_business_mail(mailboxes.business_id)
        or exists (
          select 1 from public.mail_shared_access msa
          where msa.mailbox_id = mailboxes.id and msa.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Users read accessible mail threads" on public.mail_threads;
create policy "Users read accessible mail threads"
  on public.mail_threads for select
  using (public.can_access_mailbox(mailbox_id));

drop policy if exists "Users read accessible mail messages" on public.mail_messages;
create policy "Users read accessible mail messages"
  on public.mail_messages for select
  using (public.can_access_mailbox(mailbox_id));

grant select, insert, update, delete on public.mail_shared_access to authenticated;
grant select on public.mail_shared_access to service_role;
