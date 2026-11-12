alter table public.mail_threads
  add column if not exists normalized_subject text not null default '',
  add column if not exists participant_key text not null default '';

alter table public.mail_messages
  add column if not exists in_reply_to_message_id uuid references public.mail_messages(id) on delete set null;

create table if not exists public.mail_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.mail_messages(id) on delete cascade,
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null check (char_length(trim(file_name)) between 1 and 240),
  storage_path text not null unique check (char_length(storage_path) between 8 and 1200),
  mime text not null default 'application/octet-stream',
  byte_size bigint not null check (byte_size between 1 and 26214400),
  provider_attachment_id text,
  created_at timestamptz not null default now()
);

create index if not exists mail_threads_lookup_idx
  on public.mail_threads(mailbox_id, normalized_subject, participant_key, last_message_at desc);

create index if not exists mail_attachments_message_idx
  on public.mail_attachments(message_id, created_at asc);

alter table public.mail_attachments enable row level security;

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
        mb.owner_user_id = auth.uid()
        or (
          mb.business_id is not null and exists (
            select 1 from public.business_members bm
            where bm.business_id = mb.business_id
              and bm.user_id = auth.uid()
              and bm.status = 'active'
          )
        )
      )
  );
$$;

revoke all on function public.can_access_mailbox(uuid) from public, anon;
grant execute on function public.can_access_mailbox(uuid) to authenticated, service_role;

drop policy if exists "Users read accessible mail attachments" on public.mail_attachments;
create policy "Users read accessible mail attachments"
  on public.mail_attachments for select
  using (public.can_access_mailbox(mailbox_id));

drop policy if exists "Users upload accessible mail attachments" on public.mail_attachments;
create policy "Users upload accessible mail attachments"
  on public.mail_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and public.can_access_mailbox(mailbox_id)
    and exists (
      select 1 from public.mail_messages mm
      where mm.id = mail_attachments.message_id and mm.mailbox_id = mail_attachments.mailbox_id
    )
  );

drop policy if exists "Users delete accessible mail attachments" on public.mail_attachments;
create policy "Users delete accessible mail attachments"
  on public.mail_attachments for delete
  using (
    public.can_access_mailbox(mailbox_id)
    and (
      uploaded_by = auth.uid()
      or uploaded_by is null
    )
  );
