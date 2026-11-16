-- Selected from platform_durability; do not overwrite the existing platform_jobs schema.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '',
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_time_idx on public.user_notifications(user_id, created_at desc);

alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from public,anon,authenticated;
grant select,update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;
create policy "Users read own notifications" on public.user_notifications for select
  using (user_id = auth.uid());
create policy "Users mark own notifications read" on public.user_notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
