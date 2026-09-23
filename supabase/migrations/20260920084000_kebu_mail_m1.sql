create table if not exists public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  mailbox_type text not null check (mailbox_type in ('personal','business','shared')),
  address text not null unique check (address = lower(address)),
  display_name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (mailbox_type = 'personal' and owner_user_id is not null and business_id is null)
    or (mailbox_type in ('business','shared') and business_id is not null)
  )
);

create unique index if not exists mailboxes_one_personal_per_user
  on public.mailboxes(owner_user_id) where mailbox_type = 'personal';

create table if not exists public.mail_threads (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  subject text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mail_threads_mailbox_time_idx
  on public.mail_threads(mailbox_id, last_message_at desc);

create table if not exists public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  thread_id uuid not null references public.mail_threads(id) on delete cascade,
  provider_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  folder text not null check (folder in ('inbox','sent','drafts','archive','spam','trash')),
  from_address text not null,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  subject text not null default '',
  body_text text not null default '',
  status text not null default 'received' check (status in ('draft','queued','sent','received','failed','bounced')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mail_messages_mailbox_folder_idx
  on public.mail_messages(mailbox_id, folder, created_at desc);
create index if not exists mail_messages_thread_idx
  on public.mail_messages(thread_id, created_at asc);

alter table public.mailboxes enable row level security;
alter table public.mail_threads enable row level security;
alter table public.mail_messages enable row level security;

drop policy if exists "Users read own personal mailboxes" on public.mailboxes;
create policy "Users read own personal mailboxes" on public.mailboxes for select
using (
  owner_user_id = auth.uid()
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = mailboxes.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Users create own personal mailbox" on public.mailboxes;
create policy "Users create own personal mailbox" on public.mailboxes for insert
with check (mailbox_type = 'personal' and owner_user_id = auth.uid() and business_id is null);

drop policy if exists "Users update accessible mailboxes" on public.mailboxes;
create policy "Users update accessible mailboxes" on public.mailboxes for update
using (
  owner_user_id = auth.uid()
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = mailboxes.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Users read accessible mail threads" on public.mail_threads;
create policy "Users read accessible mail threads" on public.mail_threads for select
using (
  exists (
    select 1 from public.mailboxes mb
    where mb.id = mail_threads.mailbox_id
      and (
        mb.owner_user_id = auth.uid()
        or (
          mb.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = mb.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);

drop policy if exists "Users manage accessible mail threads" on public.mail_threads;
create policy "Users manage accessible mail threads" on public.mail_threads for all
using (
  exists (
    select 1 from public.mailboxes mb
    where mb.id = mail_threads.mailbox_id
      and (
        mb.owner_user_id = auth.uid()
        or (
          mb.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = mb.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
)
with check (
  exists (
    select 1 from public.mailboxes mb
    where mb.id = mail_threads.mailbox_id
      and (
        mb.owner_user_id = auth.uid()
        or (
          mb.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = mb.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);

drop policy if exists "Users read accessible mail messages" on public.mail_messages;
create policy "Users read accessible mail messages" on public.mail_messages for select
using (
  exists (
    select 1 from public.mailboxes mb
    where mb.id = mail_messages.mailbox_id
      and (
        mb.owner_user_id = auth.uid()
        or (
          mb.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = mb.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);

drop policy if exists "Users manage accessible mail messages" on public.mail_messages;
create policy "Users manage accessible mail messages" on public.mail_messages for all
using (
  exists (
    select 1 from public.mailboxes mb
    where mb.id = mail_messages.mailbox_id
      and (
        mb.owner_user_id = auth.uid()
        or (
          mb.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = mb.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
)
with check (
  exists (
    select 1 from public.mailboxes mb
    where mb.id = mail_messages.mailbox_id
      and (
        mb.owner_user_id = auth.uid()
        or (
          mb.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = mb.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);
