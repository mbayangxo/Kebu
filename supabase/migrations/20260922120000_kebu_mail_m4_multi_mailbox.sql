-- Allow a user to hold multiple personal mailboxes (like Gmail multi-account).
-- Drops the one-per-user unique index and replaces it with a softer
-- "only one *default* personal mailbox per user" constraint.

alter table public.mailboxes
  add column if not exists is_default boolean not null default false;

-- Seed: first personal mailbox per user becomes the default.
update public.mailboxes m
set is_default = true
where mailbox_type = 'personal'
  and is_default = false
  and not exists (
    select 1 from public.mailboxes m2
    where m2.owner_user_id = m.owner_user_id
      and m2.mailbox_type = 'personal'
      and m2.is_default = true
  );

-- Remove old single-mailbox-per-user constraint.
drop index if exists mailboxes_one_personal_per_user;

-- One default personal mailbox per user is still enforced.
create unique index if not exists mailboxes_one_default_personal_per_user
  on public.mailboxes(owner_user_id)
  where mailbox_type = 'personal' and is_default = true;

-- Allow users to set their default mailbox.
drop policy if exists "Users set default mailbox" on public.mailboxes;
create policy "Users set default mailbox" on public.mailboxes for update
using (owner_user_id = auth.uid() and mailbox_type = 'personal');
