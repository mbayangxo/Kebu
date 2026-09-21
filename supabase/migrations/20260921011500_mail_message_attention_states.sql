alter table public.mail_messages
  add column if not exists priority boolean not null default false,
  add column if not exists starred_at timestamptz,
  add column if not exists waiting_until timestamptz,
  add column if not exists scheduled_at timestamptz;
create index if not exists mail_messages_priority_idx on public.mail_messages(mailbox_id, created_at desc) where priority=true;
create index if not exists mail_messages_starred_idx on public.mail_messages(mailbox_id, starred_at desc) where starred_at is not null;
create index if not exists mail_messages_waiting_idx on public.mail_messages(mailbox_id, waiting_until) where waiting_until is not null;
create index if not exists mail_messages_scheduled_idx on public.mail_messages(mailbox_id, scheduled_at) where scheduled_at is not null;
