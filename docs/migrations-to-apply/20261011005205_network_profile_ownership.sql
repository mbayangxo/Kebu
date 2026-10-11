-- Preserve all profiles while removing ownerless writes and client-controlled trust fields.
begin;
alter table public.network_profiles enable row level security;
drop policy if exists "Anyone can read visible network profiles" on public.network_profiles;
drop policy if exists "Users can insert their own network profile" on public.network_profiles;
drop policy if exists "Users can update their own network profile" on public.network_profiles;
drop policy if exists "Members read visible or owned network profiles" on public.network_profiles;
drop policy if exists "Members create owned network profiles" on public.network_profiles;
drop policy if exists "Members update owned network profiles" on public.network_profiles;

create policy "Members read visible or owned network profiles"
on public.network_profiles for select to authenticated
using ((is_visible = true and user_id is not null) or (select auth.uid()) = user_id);

create policy "Members create owned network profiles"
on public.network_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Members update owned network profiles"
on public.network_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.network_profiles from anon;
revoke insert, update, delete on public.network_profiles from authenticated;
revoke insert (initials, is_verified, contact_count, joined_at, updated_at),
  update (id, user_id, initials, is_verified, contact_count, joined_at, updated_at)
  on public.network_profiles from authenticated;
grant select on public.network_profiles to authenticated;
grant insert (id, user_id, name, location, country, sector, headline, building,
  offering, looking_for, stage, languages, is_visible) on public.network_profiles to authenticated;
grant update (name, location, country, sector, headline, building,
  offering, looking_for, stage, languages, is_visible) on public.network_profiles to authenticated;
commit;
