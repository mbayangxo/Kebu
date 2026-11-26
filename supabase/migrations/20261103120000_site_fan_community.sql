-- General, reusable fan/member community board for any published site (first real usage: May Lecor "May's World").
-- Creator (project owner) posts as the creator identity; signed-in members post + reply as themselves.
create table if not exists public.site_community_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.site_community_posts(id) on delete cascade,
  role text not null default 'member' check (role in ('creator', 'member')),
  display_name text not null default 'Fan' check (char_length(display_name) between 1 and 80),
  body text not null check (char_length(body) between 1 and 2000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_community_posts_project_created_idx
  on public.site_community_posts (project_id, created_at desc);
create index if not exists site_community_posts_parent_idx
  on public.site_community_posts (parent_id) where parent_id is not null;
create index if not exists site_community_posts_user_idx
  on public.site_community_posts (user_id);

alter table public.site_community_posts enable row level security;

-- Defense in depth: identity/ownership fields can never be changed by an UPDATE, regardless of policy.
create or replace function public.site_community_posts_lock_identity()
returns trigger language plpgsql as $$
begin
  new.project_id := old.project_id;
  new.user_id := old.user_id;
  new.role := old.role;
  new.created_at := old.created_at;
  new.parent_id := old.parent_id;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists site_community_posts_lock_identity_trg on public.site_community_posts;
create trigger site_community_posts_lock_identity_trg
  before update on public.site_community_posts
  for each row execute function public.site_community_posts_lock_identity();

drop policy if exists "Members read community posts" on public.site_community_posts;
create policy "Members read community posts" on public.site_community_posts
  for select to authenticated
  using (
    is_hidden = false
    or exists (
      select 1 from public.projects p
      where p.id = site_community_posts.project_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Members post to community" on public.site_community_posts;
create policy "Members post to community" on public.site_community_posts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      role = 'member'
      or (
        role = 'creator'
        and exists (
          select 1 from public.projects p
          where p.id = site_community_posts.project_id and p.owner_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "Authors and owners update community posts" on public.site_community_posts;
create policy "Authors and owners update community posts" on public.site_community_posts
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = site_community_posts.project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = site_community_posts.project_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Authors and owners delete community posts" on public.site_community_posts;
create policy "Authors and owners delete community posts" on public.site_community_posts
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = site_community_posts.project_id and p.owner_id = (select auth.uid())
    )
  );
