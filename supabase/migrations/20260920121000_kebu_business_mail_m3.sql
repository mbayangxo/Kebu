create table if not exists public.mail_domains (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  site_domain_id uuid not null references public.site_domains(id) on delete restrict,
  domain text not null check (domain = lower(domain)),
  provider text not null default 'resend',
  provider_domain_id text,
  status text not null default 'pending' check (status in ('pending','verified','failed')),
  dns_records jsonb not null default '[]'::jsonb,
  last_error text,
  verified_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, domain),
  unique (site_domain_id)
);

alter table public.mailboxes
  add column if not exists mail_domain_id uuid references public.mail_domains(id) on delete restrict,
  add column if not exists local_part text;

create unique index if not exists mailboxes_business_address_unique
  on public.mailboxes(business_id, address)
  where business_id is not null and is_active = true;

create table if not exists public.mail_audit_events (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid references public.mailboxes(id) on delete set null,
  business_id uuid references public.businesses(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (char_length(event_type) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mail_domains_business_idx on public.mail_domains(business_id, updated_at desc);
create index if not exists mail_audit_business_time_idx on public.mail_audit_events(business_id, created_at desc);

create or replace function public.can_manage_business_mail(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.status = 'active'
      and bm.role in ('founder','cofounder','director','administrator','manager')
  );
$$;

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
          mb.business_id is not null
          and public.can_manage_business_mail(mb.business_id)
        )
      )
  );
$$;

revoke all on function public.can_manage_business_mail(uuid) from public, anon;
revoke all on function public.can_send_mailbox(uuid) from public, anon;
grant execute on function public.can_manage_business_mail(uuid) to authenticated, service_role;
grant execute on function public.can_send_mailbox(uuid) to authenticated, service_role;

alter table public.mail_domains enable row level security;
alter table public.mail_audit_events enable row level security;

drop policy if exists "Business members read mail domains" on public.mail_domains;
create policy "Business members read mail domains"
  on public.mail_domains for select
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = mail_domains.business_id
        and bm.user_id = auth.uid()
        and bm.status = 'active'
    )
  );

drop policy if exists "Business mail admins create domains" on public.mail_domains;
create policy "Business mail admins create domains"
  on public.mail_domains for insert
  with check (created_by = auth.uid() and public.can_manage_business_mail(business_id));

drop policy if exists "Business mail admins update domains" on public.mail_domains;
create policy "Business mail admins update domains"
  on public.mail_domains for update
  using (public.can_manage_business_mail(business_id))
  with check (public.can_manage_business_mail(business_id));

drop policy if exists "Business mail admins delete domains" on public.mail_domains;
create policy "Business mail admins delete domains"
  on public.mail_domains for delete
  using (public.can_manage_business_mail(business_id));

drop policy if exists "Business mail members read audit" on public.mail_audit_events;
create policy "Business mail members read audit"
  on public.mail_audit_events for select
  using (
    business_id is null
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = mail_audit_events.business_id
        and bm.user_id = auth.uid()
        and bm.status = 'active'
    )
  );

drop policy if exists "Users insert own mail audit" on public.mail_audit_events;
create policy "Users insert own mail audit"
  on public.mail_audit_events for insert
  with check (
    actor_user_id = auth.uid()
    and (
      business_id is null
      or exists (
        select 1 from public.business_members bm
        where bm.business_id = mail_audit_events.business_id
          and bm.user_id = auth.uid()
          and bm.status = 'active'
      )
    )
  );

drop policy if exists "Users update accessible mailboxes" on public.mailboxes;
create policy "Users update accessible mailboxes"
  on public.mailboxes for update
  using (
    (mailbox_type = 'personal' and owner_user_id = auth.uid() and business_id is null)
    or (business_id is not null and public.can_manage_business_mail(business_id))
  )
  with check (
    (mailbox_type = 'personal' and owner_user_id = auth.uid() and business_id is null)
    or (business_id is not null and public.can_manage_business_mail(business_id))
  );

drop policy if exists "Users manage accessible mail threads" on public.mail_threads;
create policy "Users manage accessible mail threads"
  on public.mail_threads for all
  using (public.can_send_mailbox(mailbox_id))
  with check (public.can_send_mailbox(mailbox_id));

drop policy if exists "Users manage accessible mail messages" on public.mail_messages;
create policy "Users manage accessible mail messages"
  on public.mail_messages for all
  using (public.can_send_mailbox(mailbox_id))
  with check (public.can_send_mailbox(mailbox_id));

drop policy if exists "Users upload accessible mail attachments" on public.mail_attachments;
create policy "Users upload accessible mail attachments"
  on public.mail_attachments for insert
  with check (
    uploaded_by = auth.uid()
    and public.can_send_mailbox(mailbox_id)
    and exists (
      select 1 from public.mail_messages mm
      where mm.id = mail_attachments.message_id
        and mm.mailbox_id = mail_attachments.mailbox_id
    )
  );
