-- Two-way thread on a help request: the requester and the Kebu team can
-- both add messages. Customer replies are scoped to their own request and
-- can only ever be tagged author_type='customer', authored as themselves —
-- never as 'team', never on someone else's request. Team replies are
-- written by the service role from the admin API (lib/platform/help-requests.ts),
-- which also sends the real outbound email.

create table if not exists public.help_request_replies (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  author_type text not null check (author_type in ('customer', 'team')),
  author_name text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists help_request_replies_request_idx
  on public.help_request_replies (help_request_id, created_at);

alter table public.help_request_replies enable row level security;

drop policy if exists "Owner reads own request replies" on public.help_request_replies;
create policy "Owner reads own request replies"
  on public.help_request_replies for select
  using (
    exists (
      select 1 from public.help_requests hr
      where hr.id = help_request_replies.help_request_id
        and hr.user_id = auth.uid()
    )
  );

drop policy if exists "Owner replies to own request" on public.help_request_replies;
create policy "Owner replies to own request"
  on public.help_request_replies for insert
  with check (
    author_type = 'customer'
    and author_user_id = auth.uid()
    and exists (
      select 1 from public.help_requests hr
      where hr.id = help_request_replies.help_request_id
        and hr.user_id = auth.uid()
    )
  );

revoke all on public.help_request_replies from anon;
grant select, insert on public.help_request_replies to authenticated;
grant all on public.help_request_replies to service_role;

notify pgrst, 'reload schema';
