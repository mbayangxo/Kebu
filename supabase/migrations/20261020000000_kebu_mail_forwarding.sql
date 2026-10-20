-- Kebu Mail — automatic forwarding.
--
-- Confirmed before writing anything: no mail_forwarding_rules table, no
-- forwarding column, no worker existed anywhere in the repository
-- (grep for "forwarding" across supabase/migrations and lib/app found
-- nothing mail-related) despite docs/product/KEBU-MAIL.md listing
-- mail_forwarding_rules in its data-model sketch and M4 slice. This is
-- new functionality, not a verification gap.
--
-- One active forward target per mailbox (not a list) — matches how most
-- real mail systems expose "forward to" as a single address, and is a
-- complete, real feature rather than a partial multi-target one.
--
-- Loop protection: forward_depth/forwarded_from_message_id let the engine
-- (lib/mail/forwarding.ts) refuse to forward past 5 hops and avoid
-- re-forwarding the same message into the same mailbox twice, without a
-- recursive CTE or trigger — the engine runs in application code so it
-- can reuse the exact same thread/attachment/external-delivery machinery
-- the send and inbound-webhook routes already use, rather than
-- duplicating that logic in PL/pgSQL.

create table if not exists public.mail_forwarding_rules (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  forward_to_address text not null check (forward_to_address = lower(forward_to_address)),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mailbox_id)
);

create index if not exists mail_forwarding_rules_active_idx
  on public.mail_forwarding_rules(mailbox_id) where is_active = true;

alter table public.mail_messages
  add column if not exists forwarded_from_message_id uuid references public.mail_messages(id) on delete set null,
  add column if not exists forward_depth integer not null default 0 check (forward_depth between 0 and 5);

create index if not exists mail_messages_forwarded_from_idx
  on public.mail_messages(forwarded_from_message_id) where forwarded_from_message_id is not null;

alter table public.mail_forwarding_rules enable row level security;

drop policy if exists "Mailbox owners manage forwarding" on public.mail_forwarding_rules;
create policy "Mailbox owners manage forwarding"
  on public.mail_forwarding_rules for all
  using (public.can_send_mailbox(mailbox_id))
  with check (created_by = auth.uid() and public.can_send_mailbox(mailbox_id));

revoke all on public.mail_forwarding_rules from anon;
grant select, insert, update, delete on public.mail_forwarding_rules to authenticated;
grant all on public.mail_forwarding_rules to service_role;
