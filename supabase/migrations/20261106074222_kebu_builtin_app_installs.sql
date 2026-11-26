-- Per-account launcher preferences. Removing an app does not delete its data.
create table public.kebu_builtin_app_installs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  app_key text not null check (app_key in ('live-rooms', 'friends')),
  installed_at timestamptz not null default now(),
  primary key (user_id, app_key)
);
alter table public.kebu_builtin_app_installs enable row level security;
revoke all on public.kebu_builtin_app_installs from public, anon, authenticated;
grant select, insert, delete on public.kebu_builtin_app_installs to authenticated;
create policy builtin_apps_own_read on public.kebu_builtin_app_installs for select to authenticated using ((select auth.uid()) = user_id);
create policy builtin_apps_own_add on public.kebu_builtin_app_installs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy builtin_apps_own_remove on public.kebu_builtin_app_installs for delete to authenticated using ((select auth.uid()) = user_id);

create table public.kebu_friends_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  discoverable boolean not null default false,
  display_name text not null check (char_length(trim(display_name)) between 2 and 60),
  bio text not null default '' check (char_length(bio) <= 240),
  check (not discoverable or username is not null)
);
alter table public.kebu_friends_profiles enable row level security;
revoke all on public.kebu_friends_profiles from public, anon, authenticated;
grant select, insert, update on public.kebu_friends_profiles to authenticated;
create policy friends_profile_own on public.kebu_friends_profiles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select on public.kebu_builtin_app_installs, public.kebu_friends_profiles to service_role;
