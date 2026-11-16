-- Additive convergence for an explicitly inspected legacy QA database.
-- Refuse mixed states. No archived seeds, old call-history DROP, or fabricated migration ledger.
set local lock_timeout='5s';
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated,service_role;
do $converge$
declare n int; total int;begin
 select count(*),count(to_regclass('public.'||t)) into total,n from unnest(array['workspace_items','space_channels','space_messages','rooms','room_members','room_posts','room_links','room_decisions','room_files','library_nodes','library_shares','worker_profiles','worker_profile_evidence','job_listings','job_applications','liguey_applicant_insights','liguey_ai_usage','liguey_company_reviews','kebu_builtin_app_installs','kebu_friends_profiles','sheet_bodies','slide_bodies','room_calls','room_call_participants','cloud_storage_buckets','cloud_storage_files','cloud_deployments','cloud_deployment_versions','business_employer_verifications','employer_review_events','company_projects','company_project_tasks','company_project_feedback','company_project_resources','company_learning_modules','company_learning_assignments','company_learning_attempts','company_hr_requests','company_shifts','company_benefits','company_pay_preferences','company_pay_statements','liguey_interviews','liguey_interview_calendar','liguey_safety_reports','business_name_shortlists','user_notifications']) t;
 if n=total then return;end if;
 if to_regprocedure('public.set_updated_at()') is null then raise exception 'Existing updated_at helper required for legacy convergence';end if;
 if n<>0 then raise exception 'Mixed company foundation state: % of % tables exist; inspect before repair',n,total;end if;
 if exists(select 1 from storage.buckets where id in ('cloud-user-storage','cloud-deployments')) then raise exception 'Cloud buckets already exist without matching foundations; review their data first';end if;
 execute $payload$
-- SOURCE: 20260920081000_workspace_items.sql SHA256: 400d043fbbf3f73c0259cf83e9fa71aa781b9ee453d3a65b0cb7580266712ff4
create table if not exists public.workspace_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('task','event','doc')),
  title text not null check (char_length(trim(title)) between 1 and 160),
  body text not null default '' check (char_length(body) <= 20000),
  status text not null default 'open' check (status in ('open','done','draft')),
  due_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_items_owner_kind_idx
  on public.workspace_items (owner_id, kind, updated_at desc);

create index if not exists workspace_items_business_kind_idx
  on public.workspace_items (business_id, kind, updated_at desc)
  where business_id is not null;

alter table public.workspace_items enable row level security;

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items"
  on public.workspace_items for select
  using (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );

drop policy if exists "Workspace members create items" on public.workspace_items;
create policy "Workspace members create items"
  on public.workspace_items for insert
  with check (
    owner_id = auth.uid()
    and (
      business_id is null or exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items"
  on public.workspace_items for update
  using (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items"
  on public.workspace_items for delete
  using (
    owner_id = auth.uid()
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );


-- SOURCE: 20260920082000_space_chat.sql SHA256: 1fc348a164583faf823900d82ea70239660be8500a61e0bc9e347d6c4806f95c
create table if not exists public.space_channels (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.space_channels(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists space_channels_business_idx on public.space_channels (business_id, updated_at desc) where business_id is not null;
create index if not exists space_channels_creator_idx on public.space_channels (created_by, updated_at desc);
create index if not exists space_messages_channel_idx on public.space_messages (channel_id, created_at asc);

alter table public.space_channels enable row level security;
alter table public.space_messages enable row level security;

drop policy if exists "Members read channels" on public.space_channels;
create policy "Members read channels" on public.space_channels for select using (
  created_by = auth.uid()
  or (
    business_id is not null and exists (
      select 1 from public.business_members m where m.business_id = space_channels.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Members create channels" on public.space_channels;
create policy "Members create channels" on public.space_channels for insert with check (
  created_by = auth.uid()
  and (
    business_id is null or exists (
      select 1 from public.business_members m where m.business_id = space_channels.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Members update channels" on public.space_channels;
create policy "Members update channels" on public.space_channels for update using (
  created_by = auth.uid()
  or (
    business_id is not null and exists (
      select 1 from public.business_members m where m.business_id = space_channels.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  )
);

drop policy if exists "Members read messages" on public.space_messages;
create policy "Members read messages" on public.space_messages for select using (
  exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        c.created_by = auth.uid()
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m where m.business_id = c.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);

drop policy if exists "Members send messages" on public.space_messages;
create policy "Members send messages" on public.space_messages for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        c.created_by = auth.uid()
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m where m.business_id = c.business_id and m.user_id = auth.uid() and m.status = 'active'
          )
        )
      )
  )
);


-- SOURCE: 20260920083000_workspace_scope_hardening.sql SHA256: d9d704a252025f037556d32bd74cb911791bb7dbe6c46f0b91983a52906eda27
-- Keep personal resources private to their owner and business resources scoped strictly to
-- current active business members. A creator/owner must not retain business-space access after
-- their membership is revoked.

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items" on public.workspace_items for select using (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items" on public.workspace_items for update using (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
) with check (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items" on public.workspace_items for delete using (
  (business_id is null and owner_id = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Members read channels" on public.space_channels;
create policy "Members read channels" on public.space_channels for select using (
  (business_id is null and created_by = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = space_channels.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Members update channels" on public.space_channels;
create policy "Members update channels" on public.space_channels for update using (
  (business_id is null and created_by = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = space_channels.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
) with check (
  (business_id is null and created_by = auth.uid())
  or (
    business_id is not null and exists (
      select 1 from public.business_members m
      where m.business_id = space_channels.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Members read messages" on public.space_messages;
create policy "Members read messages" on public.space_messages for select using (
  exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        (c.business_id is null and c.created_by = auth.uid())
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = c.business_id
              and m.user_id = auth.uid()
              and m.status = 'active'
          )
        )
      )
  )
);

drop policy if exists "Members send messages" on public.space_messages;
create policy "Members send messages" on public.space_messages for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id
      and (
        (c.business_id is null and c.created_by = auth.uid())
        or (
          c.business_id is not null and exists (
            select 1 from public.business_members m
            where m.business_id = c.business_id
              and m.user_id = auth.uid()
              and m.status = 'active'
          )
        )
      )
  )
);


-- SOURCE: 20260920085000_kebu_rooms.sql SHA256: dffdb374dc44bff693baa0c2cea7af2445a47895f67297e2e405978c83ea7214
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  room_type text not null default 'project' check (room_type in ('project','team','community','client')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_links (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 160),
  url text not null check (char_length(url) between 8 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.room_decisions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  detail text not null default '' check (char_length(detail) <= 8000),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.workspace_items add column if not exists room_id uuid references public.rooms(id) on delete cascade;
create index if not exists workspace_items_room_idx on public.workspace_items(room_id, kind, updated_at desc) where room_id is not null;

alter table public.space_channels add column if not exists room_id uuid references public.rooms(id) on delete cascade;
create unique index if not exists space_channels_room_unique on public.space_channels(room_id) where room_id is not null;

create index if not exists rooms_business_idx on public.rooms(business_id, updated_at desc) where business_id is not null;
create index if not exists rooms_creator_idx on public.rooms(created_by, updated_at desc);
create index if not exists room_posts_room_idx on public.room_posts(room_id, created_at desc);
create index if not exists room_links_room_idx on public.room_links(room_id, created_at desc);
create index if not exists room_decisions_room_idx on public.room_decisions(room_id, decided_at desc);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_posts enable row level security;
alter table public.room_links enable row level security;
alter table public.room_decisions enable row level security;

create or replace function public.can_access_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.archived_at is null
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.room_members rm
          where rm.room_id = r.id and rm.user_id = auth.uid()
        )
        or (
          r.business_id is not null
          and exists (
            select 1 from public.business_members bm
            where bm.business_id = r.business_id and bm.user_id = auth.uid() and bm.status = 'active'
          )
        )
      )
  );
$$;

revoke all on function public.can_access_room(uuid) from public, anon;
grant execute on function public.can_access_room(uuid) to authenticated, service_role;

drop policy if exists "Members read rooms" on public.rooms;
create policy "Members read rooms" on public.rooms for select using (public.can_access_room(id));

drop policy if exists "Users create rooms" on public.rooms;
create policy "Users create rooms" on public.rooms for insert with check (
  created_by = auth.uid()
  and (
    business_id is null
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = rooms.business_id and bm.user_id = auth.uid() and bm.status = 'active'
    )
  )
);

drop policy if exists "Room owners update rooms" on public.rooms;
create policy "Room owners update rooms" on public.rooms for update using (
  created_by = auth.uid()
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = rooms.id and rm.user_id = auth.uid() and rm.role in ('owner','admin')
  )
);

drop policy if exists "Members read room membership" on public.room_members;
create policy "Members read room membership" on public.room_members for select using (public.can_access_room(room_id));

drop policy if exists "Room admins manage membership" on public.room_members;
create policy "Room admins manage membership" on public.room_members for all using (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.room_members self
          where self.room_id = r.id and self.user_id = auth.uid() and self.role in ('owner','admin')
        )
      )
  )
) with check (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.room_members self
          where self.room_id = r.id and self.user_id = auth.uid() and self.role in ('owner','admin')
        )
      )
  )
);

drop policy if exists "Members read room posts" on public.room_posts;
create policy "Members read room posts" on public.room_posts for select using (public.can_access_room(room_id));
drop policy if exists "Members create room posts" on public.room_posts;
create policy "Members create room posts" on public.room_posts for insert with check (author_id = auth.uid() and public.can_access_room(room_id));
drop policy if exists "Authors manage room posts" on public.room_posts;
create policy "Authors manage room posts" on public.room_posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "Authors delete room posts" on public.room_posts;
create policy "Authors delete room posts" on public.room_posts for delete using (author_id = auth.uid());

drop policy if exists "Members read room links" on public.room_links;
create policy "Members read room links" on public.room_links for select using (public.can_access_room(room_id));
drop policy if exists "Members create room links" on public.room_links;
create policy "Members create room links" on public.room_links for insert with check (created_by = auth.uid() and public.can_access_room(room_id));
drop policy if exists "Creators delete room links" on public.room_links;
create policy "Creators delete room links" on public.room_links for delete using (created_by = auth.uid());

drop policy if exists "Members read room decisions" on public.room_decisions;
create policy "Members read room decisions" on public.room_decisions for select using (public.can_access_room(room_id));
drop policy if exists "Members create room decisions" on public.room_decisions;
create policy "Members create room decisions" on public.room_decisions for insert with check (created_by = auth.uid() and public.can_access_room(room_id));
drop policy if exists "Creators manage room decisions" on public.room_decisions;
create policy "Creators manage room decisions" on public.room_decisions for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "Room members read scoped work items" on public.workspace_items;
create policy "Room members read scoped work items" on public.workspace_items for select using (
  (room_id is not null and public.can_access_room(room_id))
);

drop policy if exists "Room members create scoped work items" on public.workspace_items;
create policy "Room members create scoped work items" on public.workspace_items for insert with check (
  room_id is not null and owner_id = auth.uid() and public.can_access_room(room_id)
);

drop policy if exists "Room members read room channels" on public.space_channels;
create policy "Room members read room channels" on public.space_channels for select using (
  room_id is not null and public.can_access_room(room_id)
);

drop policy if exists "Room members send room channel messages" on public.space_messages;
create policy "Room members send room channel messages" on public.space_messages for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id and c.room_id is not null and public.can_access_room(c.room_id)
  )
);


-- SOURCE: 20260920086000_room_scope_hardening.sql SHA256: 310e3c99b051206aa9b560d355553fa214ca3bcbe2db31f57c2282b5e0b96e87
create or replace function public.can_access_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.archived_at is null
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.room_members rm
          where rm.room_id = r.id and rm.user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items" on public.workspace_items for select using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
);

drop policy if exists "Workspace members create items" on public.workspace_items;
create policy "Workspace members create items" on public.workspace_items for insert with check (
  room_id is null
  and owner_id = auth.uid()
  and (
    business_id is null
    or exists (
      select 1 from public.business_members m
      where m.business_id = workspace_items.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
);

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items" on public.workspace_items for update using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
) with check (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
);

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items" on public.workspace_items for delete using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  )
);

drop policy if exists "Room members update scoped work items" on public.workspace_items;
create policy "Room members update scoped work items" on public.workspace_items for update
using (room_id is not null and public.can_access_room(room_id))
with check (room_id is not null and public.can_access_room(room_id));

drop policy if exists "Room members delete scoped work items" on public.workspace_items;
create policy "Room members delete scoped work items" on public.workspace_items for delete
using (room_id is not null and public.can_access_room(room_id));


-- SOURCE: 20260920090000_room_files.sql SHA256: 0145b0dec4cae2607c04debe54546ecfe8da5c432a84506ccb5a62b4226c7ba5
create table if not exists public.room_files (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(trim(file_name)) between 1 and 240),
  storage_path text not null unique check (char_length(storage_path) between 8 and 1000),
  mime text not null default 'application/octet-stream',
  byte_size bigint not null check (byte_size between 1 and 52428800),
  created_at timestamptz not null default now()
);

create index if not exists room_files_room_time_idx on public.room_files(room_id, created_at desc);

alter table public.room_files enable row level security;

drop policy if exists "Members read room files" on public.room_files;
create policy "Members read room files" on public.room_files for select
using (public.can_access_room(room_id));

drop policy if exists "Members create room files" on public.room_files;
create policy "Members create room files" on public.room_files for insert
with check (uploaded_by = auth.uid() and public.can_access_room(room_id));

drop policy if exists "Uploaders delete room files" on public.room_files;
create policy "Uploaders delete room files" on public.room_files for delete
using (
  uploaded_by = auth.uid()
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = room_files.room_id
      and rm.user_id = auth.uid()
      and rm.role in ('owner','admin')
  )
);


-- SOURCE: 20261014034852_room_file_storage_identity.sql SHA256: 94e8be30ea28882911f25773bd078ff57cace09fd962db2732e4b230b715d0fb
-- A room member must not attach metadata pointing at someone else's private object.
-- Uploads already use this uploader/room prefix; enforce it for direct Data API inserts too.
drop policy if exists "Members create room files" on public.room_files;
create policy "Members create room files" on public.room_files
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and public.can_access_room(room_id)
  and storage_path like (uploaded_by::text || '/rooms/' || room_id::text || '/%')
);


-- SOURCE: 20261014043916_workspace_item_identity_guard.sql SHA256: 78c67a73580a0d85bb4dfa1e7a48110d78e30a66def4545242d7a3df6ac0739a
-- Content collaborators cannot replace a work item's identity or move its scope.
-- Keep existing row policies and caller permissions in force.
create schema if not exists private;
create or replace function private.guard_workspace_item_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
      raise exception 'Work item ownership cannot be changed.' using errcode = '42501';
    end if;
    if (new.business_id is distinct from old.business_id or new.room_id is distinct from old.room_id)
       and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can move a work item.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_workspace_item_identity() from public;
drop trigger if exists guard_workspace_item_identity on public.workspace_items;
create trigger guard_workspace_item_identity before update on public.workspace_items
for each row execute function private.guard_workspace_item_identity();


-- SOURCE: 20261016120000_library_sharing.sql SHA256: edf5c4b61c98da0844cc41ce492282785dba3e48fea9d0c2696e9a4b5e81a8c0
-- Library documents/folders and sharing.
--
-- app/api/library/{nodes,shares}/route.ts have depended on this schema since
-- commit 5d15d60 ("feat(library): add RLS-backed folders and sharing APIs")
-- with NO backing migration ever committed. The tables exist on the hosted
-- project only out-of-band (observed read-only via information_schema in
-- docs/audits/KEBU_EVERYDAY_AUDIO_2026-10-14.md) — a fresh/local database has
-- had no library_nodes/library_shares table and no RLS at all, so these
-- routes 500 ("relation does not exist") anywhere except that one hosted
-- project. This migration is schema-drift remediation: it defines the tables
-- and RLS the routes already assume, matching their exact column usage.

create table if not exists public.library_nodes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.library_nodes(id) on delete cascade,
  kind text not null default 'folder' check (kind in ('folder', 'link', 'document', 'sheet')),
  title text not null check (char_length(trim(title)) between 1 and 240),
  -- Reserved for a future file-backed node (Supabase Storage); no route
  -- currently sets these on insert — Library is text/metadata-only today.
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  mime_type text check (mime_type is null or char_length(mime_type) <= 160),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  source_kind text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  starred boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_nodes_owner_parent_idx on public.library_nodes (owner_id, parent_id);
create index if not exists library_nodes_parent_idx on public.library_nodes (parent_id) where parent_id is not null;

drop trigger if exists library_nodes_set_updated_at on public.library_nodes;
create trigger library_nodes_set_updated_at before update on public.library_nodes
for each row execute function public.set_updated_at();

create table if not exists public.library_shares (
  node_id uuid not null references public.library_nodes(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('viewer', 'editor')),
  shared_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (node_id, shared_with_user_id)
);

create index if not exists library_shares_shared_with_idx on public.library_shares (shared_with_user_id);

drop trigger if exists library_shares_set_updated_at on public.library_shares;
create trigger library_shares_set_updated_at before update on public.library_shares
for each row execute function public.set_updated_at();

-- A share cannot outlive or outrank its sharer's own authority: only the
-- node's current owner may ever hold shared_by_user_id for a row naming that
-- node, enforced the same way lib 20261014043916 enforces work-item identity
-- — a trigger, so the rule holds even if a future policy edit gets it wrong.
create schema if not exists private;
create or replace function private.guard_library_share_authority()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if not exists (
      select 1 from public.library_nodes n
      where n.id = new.node_id and n.owner_id = new.shared_by_user_id
    ) then
      raise exception 'Only the item owner can share or update sharing for it.' using errcode = '42501';
    end if;
    if new.shared_with_user_id = new.shared_by_user_id then
      raise exception 'Cannot share a Library item with yourself.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_library_share_authority() from public;
drop trigger if exists guard_library_share_authority on public.library_shares;
create trigger guard_library_share_authority before insert or update on public.library_shares
for each row execute function private.guard_library_share_authority();

-- Collaborators cannot replace a node's identity/ownership or relocate it —
-- same convention as 20261014043916_workspace_item_identity_guard.sql.
create or replace function private.guard_library_node_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
      raise exception 'Library item ownership cannot be changed.' using errcode = '42501';
    end if;
    if new.kind is distinct from old.kind then
      raise exception 'Library item kind cannot be changed.' using errcode = '42501';
    end if;
    if new.parent_id is distinct from old.parent_id and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can move a Library item.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_library_node_identity() from public;
drop trigger if exists guard_library_node_identity on public.library_nodes;
create trigger guard_library_node_identity before update on public.library_nodes
for each row execute function private.guard_library_node_identity();

-- library_nodes and library_shares each need to read the other table from
-- inside their own RLS policy (is this node shared with me? / do I own the
-- node this share points at?), which is a direct cycle: evaluating one
-- table's policy triggers the other table's policy, which triggers the
-- first table's policy again ("infinite recursion detected in policy for
-- relation", confirmed by actually running this against PGlite before
-- shipping it). The standard fix is a SECURITY DEFINER helper: it runs as
-- the function owner (the migration role), which owns both tables and so
-- is exempt from their RLS by default — reading through it does not
-- re-trigger the other table's policy, breaking the cycle.
create or replace function private.library_node_owner_id(p_node_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select owner_id from public.library_nodes where id = p_node_id;
$$;
revoke all on function private.library_node_owner_id(uuid) from public;
grant execute on function private.library_node_owner_id(uuid) to authenticated;

create or replace function private.library_share_permission(p_node_id uuid, p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select permission from public.library_shares
  where node_id = p_node_id and shared_with_user_id = p_user_id;
$$;
revoke all on function private.library_share_permission(uuid, uuid) from public;
grant execute on function private.library_share_permission(uuid, uuid) to authenticated;

alter table public.library_nodes enable row level security;
alter table public.library_shares enable row level security;

drop policy if exists "Owners and recipients read library_nodes" on public.library_nodes;
create policy "Owners and recipients read library_nodes"
  on public.library_nodes for select
  using (
    owner_id = auth.uid()
    or private.library_share_permission(id, auth.uid()) is not null
  );

drop policy if exists "Owners create library_nodes" on public.library_nodes;
create policy "Owners create library_nodes"
  on public.library_nodes for insert
  with check (owner_id = auth.uid());

drop policy if exists "Owners and editors update library_nodes" on public.library_nodes;
create policy "Owners and editors update library_nodes"
  on public.library_nodes for update
  using (
    owner_id = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  )
  with check (
    owner_id = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

drop policy if exists "Owners delete library_nodes" on public.library_nodes;
create policy "Owners delete library_nodes"
  on public.library_nodes for delete
  using (owner_id = auth.uid());

drop policy if exists "Owners and recipients read library_shares" on public.library_shares;
create policy "Owners and recipients read library_shares"
  on public.library_shares for select
  using (
    shared_with_user_id = auth.uid()
    or private.library_node_owner_id(node_id) = auth.uid()
  );

drop policy if exists "Owners create library_shares" on public.library_shares;
create policy "Owners create library_shares"
  on public.library_shares for insert
  with check (
    shared_by_user_id = auth.uid()
    and private.library_node_owner_id(node_id) = auth.uid()
  );

drop policy if exists "Owners update library_shares" on public.library_shares;
create policy "Owners update library_shares"
  on public.library_shares for update
  using (private.library_node_owner_id(node_id) = auth.uid())
  with check (private.library_node_owner_id(node_id) = auth.uid());

drop policy if exists "Owners delete library_shares" on public.library_shares;
create policy "Owners delete library_shares"
  on public.library_shares for delete
  using (private.library_node_owner_id(node_id) = auth.uid());

grant select, insert, update, delete on public.library_nodes to authenticated;
grant select, insert, update, delete on public.library_shares to authenticated;


-- SOURCE: 20261016150000_workspace_item_visibility.sql SHA256: b95b643e0793ae94888eb55910b7bd4d9251f11cba064161203000e934ded1d0
-- K062: business-scoped Calendar/Tasks items currently have no permission
-- granularity — any active business_members row (any role, any status
-- besides inactive) grants full select/update/delete on EVERY business
-- item, with no concept of "this task is private to me within the team."
-- Confirmed via docs/KEBU-RECOVERED-REQUEST-AUDIT.md's K062 entry
-- ("permissions... remain open") and by reading the live policies in
-- 20260920086000_room_scope_hardening.sql.
--
-- Default is 'team' — identical to today's behavior for every existing row
-- and every row inserted before an item is explicitly marked private. This
-- adds a capability; it does not change current visibility for anyone.
-- Personal items (business_id is null) and room-scoped items are untouched
-- — this migration only changes the business_id-is-not-null branch of the
-- three affected policies.

alter table public.workspace_items
  add column if not exists visibility text not null default 'team' check (visibility in ('private', 'team'));

-- Extends the existing guard_workspace_item_identity trigger (20261014043916)
-- rather than adding a second mechanism: a non-owner business member could
-- otherwise flip another member's item to 'team' (exposing it) or to
-- 'private' (locking the real owner's team out of something that was
-- previously shared), even though the UPDATE policy above lets them touch
-- the row at all for ordinary fields like title/status.
create or replace function private.guard_workspace_item_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
      raise exception 'Work item ownership cannot be changed.' using errcode = '42501';
    end if;
    if (new.business_id is distinct from old.business_id or new.room_id is distinct from old.room_id)
       and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can move a work item.' using errcode = '42501';
    end if;
    if new.visibility is distinct from old.visibility and old.owner_id is distinct from auth.uid() then
      raise exception 'Only the owner can change a work item''s visibility.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_workspace_item_identity() from public;

drop policy if exists "Workspace members read items" on public.workspace_items;
create policy "Workspace members read items" on public.workspace_items for select using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
);

drop policy if exists "Workspace members update items" on public.workspace_items;
create policy "Workspace members update items" on public.workspace_items for update using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
) with check (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
);

drop policy if exists "Workspace members delete items" on public.workspace_items;
create policy "Workspace members delete items" on public.workspace_items for delete using (
  room_id is null
  and (
    (business_id is null and owner_id = auth.uid())
    or (
      business_id is not null
      and exists (
        select 1 from public.business_members m
        where m.business_id = workspace_items.business_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
      and (workspace_items.visibility = 'team' or workspace_items.owner_id = auth.uid())
    )
  )
);


-- SOURCE: 20261016160000_room_chat_read_policy.sql SHA256: 5e582877ed472bf8f397eb2c89acb0010f7611c2a1f98643c0875870f2454c4d
-- K063: room chat had an insert-only RLS policy on space_messages for
-- room-scoped channels (20260920085000_kebu_rooms.sql added "Room members
-- send room channel messages") but no matching select policy was ever
-- added. "Members read messages" (20260920083000_workspace_scope_hardening.sql)
-- only recognizes a channel's business_id, not its room_id, so a room
-- channel (business_id is null for a personal room) satisfies neither of
-- that policy's branches for anyone except the room's creator. Every other
-- room member could post into room chat but never read it back, including
-- their own messages. This adds the missing read policy, mirroring the
-- existing room-scoped insert policy's shape exactly.

drop policy if exists "Room members read room channel messages" on public.space_messages;
create policy "Room members read room channel messages" on public.space_messages for select using (
  exists (
    select 1 from public.space_channels c
    where c.id = space_messages.channel_id and c.room_id is not null and public.can_access_room(c.room_id)
  )
);


-- SOURCE: 20261016161000_room_creation_returning_fix.sql SHA256: 348e432e1e60db4032bd1319f526a96a504ea9a777eba97baef252ad0b7b355d
-- K063: room creation itself was completely broken for every user.
--
-- app/api/rooms/route.ts's POST handler creates a room with
-- `.insert({...}).select("*").single()` — INSERT ... RETURNING under the
-- hood. The rooms table's only SELECT policy, "Members read rooms", is a
-- bare `public.can_access_room(id)` call with no inline fallback, and
-- can_access_room's own body re-queries the `rooms` table (`where r.id =
-- p_room_id`) — the exact table the RETURNING clause's row was just
-- inserted into, in the same statement. This triggers a real, independently
-- confirmed upstream PostgreSQL defect (matches postgresql.org bug #19015:
-- "insert-returning failure: function in select policy doesn't see the
-- row the current statement just inserted") — not a local/CI artifact.
-- Reproduced here with a minimal isolated table outside any app schema,
-- and confirmed PostgREST's/postgrest-js's insert-with-select issues the
-- same INSERT ... RETURNING shape. The result: every call to POST
-- /api/rooms fails with "new row violates row-level security policy for
-- table rooms", for every user, unconditionally — Rooms could never
-- actually be created through the product's own UI.
--
-- The fix used elsewhere in this codebase for exactly this shape (see
-- library_nodes's "owner_id = auth.uid() or ..." policy in
-- 20261016120000_library_sharing.sql) is to give the policy an inline,
-- self-contained disjunct that resolves without invoking the
-- self-referencing function at all for the common case — the row's own
-- creator. Since POST /api/rooms always inserts with created_by = the
-- calling user, this disjunct is always what resolves the RETURNING
-- check for room creation, while can_access_room(id) remains for every
-- other real read (a non-creator member loading a room they did not
-- create) where the row is read-only, not self-referential, and was
-- never affected by this defect.

drop policy if exists "Members read rooms" on public.rooms;
create policy "Members read rooms" on public.rooms for select using (
  created_by = auth.uid() or public.can_access_room(id)
);


-- SOURCE: 20261016162000_room_members_recursion_fix.sql SHA256: d8d52967a13ec9789d8f4cbc2f2c101f741e1840644241387acc7c3a6c9ce12b
-- K063: every write to room_members has always failed with "infinite
-- recursion detected in policy for relation room_members" — including a
-- room's own creator inserting their own first owner-member row during
-- room creation (app/api/rooms/route.ts, no .select(), so the failure was
-- silently swallowed with no error check) and the "member" action adding
-- any second person to a room (app/api/rooms/[id]/route.ts, which DOES
-- check the error and would 500 every time). The only reason this stayed
-- invisible is that can_access_room()'s create_by-based branch already
-- gives the room's creator full access without ever needing a
-- room_members row to exist — so a single-person room looked entirely
-- functional while a room_members row was never actually created for
-- anyone, ever, and no second person could ever be added to any room.
--
-- Root cause: "Room admins manage membership" (20260920085000_kebu_rooms.sql)
-- is a policy ON room_members whose own USING/WITH CHECK directly queries
-- room_members again (aliased `self`) to check the caller's admin role —
-- a direct self-reference, the same recursion class already fixed for
-- library_nodes/library_shares in 20261016120000_library_sharing.sql.
-- Fixed the same way: a SECURITY DEFINER helper that reads room_members
-- bypassing its own RLS, so the policy no longer recurses into itself.

create schema if not exists private;

create or replace function private.is_room_admin(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.room_members rm
    where rm.room_id = p_room_id and rm.user_id = p_user_id and rm.role in ('owner', 'admin')
  );
$$;
revoke all on function private.is_room_admin(uuid, uuid) from public, anon;
grant execute on function private.is_room_admin(uuid, uuid) to authenticated, service_role;

drop policy if exists "Room admins manage membership" on public.room_members;
create policy "Room admins manage membership" on public.room_members for all using (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (r.created_by = auth.uid() or private.is_room_admin(r.id, auth.uid()))
  )
) with check (
  exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and (r.created_by = auth.uid() or private.is_room_admin(r.id, auth.uid()))
  )
);


-- SOURCE: 20261016180000_liguey_worker_profiles.sql SHA256: 19b017516106ba9df21dc05448928b4ad9807ad6ac8d977cd659e5fe595b7898
-- Kebu Liguey (K066) — acceptance case 1: worker access and profile.
--
-- A new, schema-isolated 1:1 extension of the existing user identity,
-- mirroring opportunity_profiles' shape (user_id primary key referencing
-- auth.users) rather than adding skills/experience/portfolio columns to
-- user_profiles (identity-only, cross-product) or network_profiles
-- (K067-owned, a different RLS/ownership history already hardened Oct 15
-- — mixing concerns here would re-open that surface for no reason).
--
-- Every field here is self-reported. verified_at/verified_by are reserved
-- for a future, explicit verification capability and are NOT granted to
-- `authenticated` at all (table-level column grants, not just RLS — the
-- same defense-in-depth convention already used for
-- network_profiles.is_verified in 20261011005205_network_profile_ownership.sql).
-- No credential, score, or eligibility check is invented here: today
-- nothing ever sets verified_at/verified_by, so every profile is,
-- correctly, entirely self-reported.

-- public.set_updated_at() is used by this migration's triggers below but,
-- like businesses/business_members, has never been defined in this
-- repository's canonical supabase/migrations/ chain — only assumed to
-- pre-exist (it is already relied on, uncaptured, by
-- 20261016120000_library_sharing.sql and others). Unlike the
-- businesses/business_members bootstrap, this is a trivial, standard,
-- unambiguous trigger idiom with one obvious correct implementation
-- (verified against the archived definition in
-- supabase/migrations_archive/legacy/004_create_projects.sql, byte-for-
-- byte identical), so `create or replace` here is safe to make this
-- migration self-contained rather than silently depending on drift.


create table public.worker_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  headline text check (headline is null or char_length(trim(headline)) <= 160),
  bio text not null default '' check (char_length(bio) <= 4000),
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  -- Self-reported work/life experience. Each array element is expected to
  -- carry {title, description, kind: 'formal'|'informal', startAt, endAt}
  -- shaped by the API layer (lib/liguey/worker-profile.ts), not enforced
  -- field-by-field in SQL — deliberately permissive here so informal/life
  -- experience is not forced into a conventional-employment shape.
  experience jsonb not null default '[]'::jsonb check (jsonb_typeof(experience) = 'array'),
  location text check (location is null or char_length(trim(location)) <= 160),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  remote_eligible boolean not null default false,
  availability text check (availability is null or availability in ('open', 'limited', 'unavailable')),
  -- Discoverability for employer/recruiter workflows (K066 acceptance
  -- case 4) is explicitly opt-in and defaults closed — a worker profile
  -- is private until its owner chooses otherwise, not exposed by default.
  is_discoverable boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists worker_profiles_set_updated_at on public.worker_profiles;
create trigger worker_profiles_set_updated_at
  before update on public.worker_profiles
  for each row execute function public.set_updated_at();

alter table public.worker_profiles enable row level security;

create policy "Workers read own profile"
  on public.worker_profiles for select to authenticated
  using (user_id = auth.uid());

create policy "Workers create own profile"
  on public.worker_profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy "Workers update own profile"
  on public.worker_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.worker_profiles from anon;
revoke insert, update, delete on public.worker_profiles from authenticated;
grant select on public.worker_profiles to authenticated;
grant insert (user_id, headline, bio, skills, languages, experience, location,
  country_code, remote_eligible, availability, is_discoverable) on public.worker_profiles to authenticated;
grant update (headline, bio, skills, languages, experience, location,
  country_code, remote_eligible, availability, is_discoverable) on public.worker_profiles to authenticated;

-- Portfolio/evidence: reuses library_nodes (already-built, already-tested
-- personal document/folder/link storage, K058) rather than inventing new
-- file storage. Linking a node as evidence requires owning it — enforced
-- with private.library_node_owner_id(), an existing SECURITY DEFINER
-- helper reviewed for a different table (library_nodes) than the one its
-- caller writes to here, so there is no self-reference recursion risk in
-- reusing it (unlike the room_members/business_members cases fixed
-- elsewhere this session, where the helper and the policy's own table
-- were the same table).

create table public.worker_profile_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  library_node_id uuid not null references public.library_nodes(id) on delete cascade,
  label text check (label is null or char_length(trim(label)) <= 160),
  created_at timestamptz not null default now(),
  unique (user_id, library_node_id)
);

create index worker_profile_evidence_user_idx on public.worker_profile_evidence (user_id, created_at desc);

alter table public.worker_profile_evidence enable row level security;

create policy "Workers read own evidence"
  on public.worker_profile_evidence for select to authenticated
  using (user_id = auth.uid());

create policy "Workers link owned nodes as evidence"
  on public.worker_profile_evidence for insert to authenticated
  with check (
    user_id = auth.uid()
    and private.library_node_owner_id(library_node_id) = auth.uid()
  );

create policy "Workers remove their own evidence links"
  on public.worker_profile_evidence for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.worker_profile_evidence from anon;
revoke update on public.worker_profile_evidence from authenticated;
grant select, insert (user_id, library_node_id, label), delete
  on public.worker_profile_evidence to authenticated;


-- SOURCE: 20261016190000_liguey_job_listings_applications.sql SHA256: 221fef93bcf98e94ff22d6b6999f4abc59a7ed52cd40206c5b6e580ec3d5bf5d
-- Kebu Liguey (K066) — acceptance case 4: employer/recruiter workflow
-- (authorized posting + tenant-scoped applicant review), with the minimum
-- of acceptance case 3 (submit/withdraw) needed to make review real
-- rather than reviewing zero applications forever.
--
-- Employer = an existing Kebu business (businesses/business_members),
-- not a new parallel employer concept — confirmed as the only tenant
-- entity in the codebase before writing this. Follows the existing
-- business_events/event_registrations precedent (same owner-portal shape:
-- public_id, draft/published/closed/archived-style status, a business-
-- scoped manager check) rather than inventing a new authorization model.
--
-- Deliberately does NOT reuse lib/business/assert-manager.ts's role list
-- (['founder','administrator','store_manager','manager','creative']) —
-- confirmed inconsistent with the DB's own business_members role check
-- constraint and with the OTHER two inline copies of this same check
-- (app/api/businesses/[id]/events/route.ts and its registrations route),
-- which both use only ['founder','administrator','store_manager']. This
-- migration's RLS mirrors the latter, narrower, DB-constraint-consistent
-- list. The ambiguity itself is not resolved here — that is a separate,
-- pre-existing inconsistency across three call sites, out of scope for
-- this migration.

create schema if not exists private;

create table public.job_listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  public_id text not null unique,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 8000),
  requirements text not null default '' check (char_length(requirements) <= 4000),
  employment_type text not null check (employment_type in
    ('full_time', 'part_time', 'contract', 'internship', 'apprenticeship', 'gig')),
  location_type text not null default 'onsite' check (location_type in ('onsite', 'remote', 'hybrid')),
  location text not null default '' check (char_length(location) <= 160),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_listings_business_idx on public.job_listings (business_id, status, updated_at desc);

drop trigger if exists job_listings_set_updated_at on public.job_listings;
create trigger job_listings_set_updated_at
  before update on public.job_listings
  for each row execute function public.set_updated_at();

alter table public.job_listings enable row level security;

create policy "Business members read their listings"
  on public.job_listings for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = job_listings.business_id and m.user_id = auth.uid() and m.status = 'active'
  ));

create policy "Business managers create listings"
  on public.job_listings for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = job_listings.business_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

create policy "Business managers update their listings"
  on public.job_listings for update to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = job_listings.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ))
  with check (exists (
    select 1 from public.business_members m
    where m.business_id = job_listings.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ));

revoke all on public.job_listings from anon;
revoke insert, update, delete on public.job_listings from authenticated;
grant select on public.job_listings to authenticated;
grant insert (business_id, public_id, title, description, requirements, employment_type,
  location_type, location, status, created_by) on public.job_listings to authenticated;
grant update (title, description, requirements, employment_type, location_type, location, status)
  on public.job_listings to authenticated;

-- No anon/public SELECT policy — mirrors business_events: a published
-- listing's public reach goes through a service-role API route filtering
-- status='published' in application code, not through RLS opening the
-- table to anon. That public route is K066 acceptance case 2 (real work
-- discovery), not attempted in this migration.

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.job_listings(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  cover_note text not null default '' check (char_length(cover_note) <= 4000),
  status text not null default 'submitted' check (status in
    ('submitted', 'reviewed', 'accepted', 'declined', 'withdrawn')),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, applicant_user_id)
);

create index job_applications_business_idx on public.job_applications (business_id, status, updated_at desc);
create index job_applications_applicant_idx on public.job_applications (applicant_user_id, created_at desc);

drop trigger if exists job_applications_set_updated_at on public.job_applications;
create trigger job_applications_set_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

-- An application's identity (which listing/business/applicant it is)
-- cannot be reassigned by anyone after creation — same convention as
-- guard_workspace_item_identity / guard_library_node_identity.
create or replace function private.guard_job_application_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
      or new.listing_id is distinct from old.listing_id
      or new.business_id is distinct from old.business_id
      or new.applicant_user_id is distinct from old.applicant_user_id
    then
      raise exception 'An application''s listing, business or applicant cannot be changed.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_job_application_identity() from public;
drop trigger if exists guard_job_application_identity on public.job_applications;
create trigger guard_job_application_identity before update on public.job_applications
for each row execute function private.guard_job_application_identity();

-- decided_at/decided_by are never client-writable (not granted to
-- authenticated at all, same convention as worker_profiles.verified_at) —
-- a status transition into 'accepted'/'declined' stamps them
-- automatically here instead, so "who decided and when" cannot be
-- forged by either side, and reverting out of a decided state clears
-- them rather than leaving a stale decision record.
create or replace function private.stamp_job_application_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') then
      new.decided_at = now();
      new.decided_by = auth.uid();
    else
      new.decided_at = null;
      new.decided_by = null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_job_application_decision() from public;
drop trigger if exists stamp_job_application_decision on public.job_applications;
create trigger stamp_job_application_decision before update on public.job_applications
for each row execute function private.stamp_job_application_decision();

alter table public.job_applications enable row level security;

create policy "Applicants and business members read applications"
  on public.job_applications for select to authenticated
  using (
    applicant_user_id = auth.uid()
    or exists (
      select 1 from public.business_members m
      where m.business_id = job_applications.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
  );

-- job_listings has no public/anon SELECT policy (see above) — an
-- applicant is never a business_members row for the hiring business, so
-- they cannot see the job_listings row at all under their own RLS, and a
-- WITH CHECK subquery evaluated as the applicant would always see zero
-- rows there regardless of whether the listing is genuinely published.
-- This SECURITY DEFINER helper exists only to answer "is there a
-- published listing with this id/business_id" as a bare boolean — it
-- leaks no field of the listing and is not reachable outside the policy
-- that calls it (the `private` schema, same boundary as every other
-- private.* helper in this codebase).
create or replace function private.is_published_job_listing(p_listing_id uuid, p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.job_listings l
    where l.id = p_listing_id and l.business_id = p_business_id and l.status = 'published'
  );
$$;
revoke all on function private.is_published_job_listing(uuid, uuid) from public, anon;
grant execute on function private.is_published_job_listing(uuid, uuid) to authenticated, service_role;

create policy "Workers apply to published listings"
  on public.job_applications for insert to authenticated
  with check (
    applicant_user_id = auth.uid()
    and private.is_published_job_listing(listing_id, business_id)
  );

create policy "Applicants withdraw their own application"
  on public.job_applications for update to authenticated
  using (applicant_user_id = auth.uid())
  with check (applicant_user_id = auth.uid() and status = 'withdrawn');

create policy "Business managers decide on applications"
  on public.job_applications for update to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = job_applications.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ))
  with check (exists (
    select 1 from public.business_members m
    where m.business_id = job_applications.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ));

revoke all on public.job_applications from anon;
revoke insert, update, delete on public.job_applications from authenticated;
grant select on public.job_applications to authenticated;
grant insert (listing_id, business_id, applicant_user_id, cover_note) on public.job_applications to authenticated;
-- cover_note is set once at submission and is otherwise immutable; only
-- status (withdraw, or a manager's decision) can ever be updated.
grant update (status) on public.job_applications to authenticated;


-- SOURCE: 20261016200000_liguey_profile_visibility_for_reviewers.sql SHA256: 83bee093479bb68ec2131254b4ce11baa47f5e9827d577695e8a8b87147b768b
-- Kebu Liguey (K066) acceptance case 6: meaningful integration.
--
-- Confirmed before writing anything: a reviewing business manager could
-- only ever see an applicant's cover_note and status
-- (app/api/liguey/employers/[businessId]/listings/[listingId]/route.ts) —
-- never their worker_profile (skills, languages, experience) or portfolio
-- evidence (worker_profile_evidence -> library_nodes), because
-- worker_profiles/worker_profile_evidence (20261016180000) have only ever
-- had an owner-only SELECT policy. Review has been genuinely blind beyond
-- free text.
--
-- This connects two already-built pieces (case 1's profile, case 4's
-- review flow) rather than inventing a new integration surface: a
-- business's active members may read a worker_profile/
-- worker_profile_evidence row IF that worker has a non-withdrawn
-- application to one of that business's listings. Revocable, not
-- permanent: withdrawing an application (job_applications.status =
-- 'withdrawn') removes this visibility on the very next read, since the
-- check is a live EXISTS against job_applications, not a cached grant.
--
-- No SECURITY DEFINER helper is needed here, deliberately: the EXISTS
-- subqueries below read job_applications and business_members, and a
-- reviewing business member already has SELECT rights on both of those
-- rows under their OWN existing RLS (job_applications' "Applicants and
-- business members read applications" policy, and business_members'
-- always-visible self-row) — so this policy can check visibility
-- directly without bypassing RLS anywhere. Deliberately NOT building a
-- Rooms-on-hire or Network-connection-on-hire flow in this slice:
-- Network has no 1:1 connection primitive at all (confirmed), and Rooms
-- membership has no revocation primitive tied to application status —
-- both would be speculative, unspecified integration surfaces, not a
-- connection of already-built pieces.

drop policy if exists "Workers read own profile" on public.worker_profiles;
create policy "Workers read own profile"
  on public.worker_profiles for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.job_applications ja
      where ja.applicant_user_id = worker_profiles.user_id
        and ja.status != 'withdrawn'
        and exists (
          select 1 from public.business_members m
          where m.business_id = ja.business_id and m.user_id = auth.uid() and m.status = 'active'
        )
    )
  );

drop policy if exists "Workers read own evidence" on public.worker_profile_evidence;
create policy "Workers read own evidence"
  on public.worker_profile_evidence for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.job_applications ja
      where ja.applicant_user_id = worker_profile_evidence.user_id
        and ja.status != 'withdrawn'
        and exists (
          select 1 from public.business_members m
          where m.business_id = ja.business_id and m.user_id = auth.uid() and m.status = 'active'
        )
    )
  );


-- SOURCE: 20261016210000_liguey_applicant_listing_visibility.sql SHA256: 434110bb6be9e42be60169c531261c0dd3e5dfa6f48ad16ff081cc39e3dcf186
-- Kebu Liguey (K066) — a worker reading the listings they applied to.
--
-- Found while building real-browser verification for case 8: "Business
-- members read their listings" (20261016190000) is the ONLY SELECT
-- policy on job_listings, and it only matches business_members rows —
-- an applicant has none. That makes /liguey/applications (and the GET
-- handler in app/api/liguey/applications/route.ts, which the page
-- mirrors) silently unable to ever resolve a listing's title for the
-- worker who applied to it: the UI falls back to the literal word
-- "Listing" forever, not a loading state, not an error — a real,
-- previously-undetected functional gap, not a test artifact.
--
-- Same shape as case 6 (profile_visibility_for_reviewers) but in the
-- other direction: a worker may read a job_listings row if they have
-- ANY application to it (submitted, reviewed, accepted, declined, or
-- withdrawn) — their own application history should keep showing the
-- real title even after withdrawing, not revoke it. No SECURITY
-- DEFINER helper needed: the applicant already has SELECT on their own
-- job_applications rows under the existing "Applicants and business
-- members read applications" policy, so this check does not bypass RLS
-- anywhere.

drop policy if exists "Business members read their listings" on public.job_listings;
create policy "Business members and applicants read listings"
  on public.job_listings for select to authenticated
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = job_listings.business_id and m.user_id = auth.uid() and m.status = 'active'
    )
    or exists (
      select 1 from public.job_applications ja
      where ja.listing_id = job_listings.id and ja.applicant_user_id = auth.uid()
    )
  );


-- SOURCE: 20261020002000_liguey_yande_applicant_insight.sql SHA256: 48bb236efeefe2b3aec397a156c4b0ac50afc85c0de2ce7c090001538ee3de48
-- Kebu Liguey (K066) — Yande applicant insight (employer-side decision support).
--
-- Mapped before coding: confirmed via grep that Liguey had zero AI
-- integration anywhere (no reference to Anthropic, Yande, or any model
-- call in app/liguey, app/components/liguey, lib/liguey, app/api/liguey).
-- Deliberately does NOT build a numeric "match score" or percentage —
-- the recovered scope addendum explicitly lists a fabricated "70%
-- qualified" explanation as a prior proposal that is NOT automatically
-- approved. This stores a qualitative, clearly-AI-labeled note instead:
-- real strengths/questions grounded in the applicant's own real profile
-- and the listing's own real requirements, never a score.
--
-- One cached insight per application (unique on application_id);
-- regenerate overwrites in place rather than accumulating a history —
-- this is decision support for the current review, not an audit log.
-- Deliberately NOT visible to the applicant: unlike job_applications
-- itself (applicant-visible for their own row), this is an internal
-- employer note, closer to interview notes than to application status.
--
-- Generation is manager-gated (same ['founder','administrator',
-- 'store_manager'] list as every other Liguey employer-write check, for
-- the same confirmed DB-constraint-consistency reason given in
-- lib/liguey/assert-employer-manager.ts) because it costs a real model
-- call; reading a previously-generated insight is open to any active
-- business member, matching job_applications' own read policy.

create table public.liguey_applicant_insights (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  generated_by uuid not null references auth.users(id) on delete restrict,
  model text not null,
  summary text not null check (char_length(summary) between 1 and 4000),
  strengths text[] not null default '{}',
  questions_to_ask text[] not null default '{}',
  caution text not null default '' check (char_length(caution) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id)
);

create index liguey_applicant_insights_business_idx on public.liguey_applicant_insights (business_id, created_at desc);

drop trigger if exists liguey_applicant_insights_set_updated_at on public.liguey_applicant_insights;
create trigger liguey_applicant_insights_set_updated_at
  before update on public.liguey_applicant_insights
  for each row execute function public.set_updated_at();

alter table public.liguey_applicant_insights enable row level security;

create policy "Business members read applicant insights"
  on public.liguey_applicant_insights for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid() and m.status = 'active'
  ));

create policy "Business managers generate applicant insights"
  on public.liguey_applicant_insights for insert to authenticated
  with check (
    generated_by = auth.uid()
    and exists (
      select 1 from public.job_applications ja
      where ja.id = liguey_applicant_insights.application_id and ja.business_id = liguey_applicant_insights.business_id
    )
    and exists (
      select 1 from public.business_members m
      where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

create policy "Business managers regenerate applicant insights"
  on public.liguey_applicant_insights for update to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
  ))
  with check (
    generated_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = liguey_applicant_insights.business_id and m.user_id = auth.uid()
        and m.status = 'active' and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

revoke all on public.liguey_applicant_insights from anon;
grant select, insert, update on public.liguey_applicant_insights to authenticated;

-- Self-contained usage tracking, deliberately NOT depending on
-- account_ai_usage_events / reserve_account_ai_generation: confirmed
-- that the shared metering migration (20261010134141_atomic_account_ai_
-- reservations.sql) revokes privileges on a table no migration in this
-- repository's applied chain ever creates (it only exists in an
-- unapplied legacy script), so it cannot be relied on to even apply
-- cleanly on a fresh database, let alone meter correctly. That is a
-- pre-existing, cross-cutting bug outside Liguey's scope to fix here.
-- This mirrors Liguey's own existing self-contained pattern instead
-- (e.g. job_applications' own constraints) rather than the shop/
-- mail-style per-minute/day bucket tables, since this is a monthly
-- per-business cap, not a burst-rate limiter.
create table public.liguey_ai_usage (
  business_id uuid not null references public.businesses(id) on delete cascade,
  month_start date not null,
  generation_count integer not null default 0 check (generation_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, month_start)
);

alter table public.liguey_ai_usage enable row level security;

create policy "Business members read their AI usage"
  on public.liguey_ai_usage for select to authenticated
  using (exists (
    select 1 from public.business_members m
    where m.business_id = liguey_ai_usage.business_id and m.user_id = auth.uid() and m.status = 'active'
  ));

revoke all on public.liguey_ai_usage from anon, authenticated;
grant select on public.liguey_ai_usage to authenticated;
grant all on public.liguey_ai_usage to service_role;

create or replace function public.liguey_reserve_ai_generation(p_business_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_month date := date_trunc('month', now() at time zone 'utc')::date;
  v_count integer;
begin
  insert into public.liguey_ai_usage(business_id, month_start, generation_count)
  values (p_business_id, v_month, 0)
  on conflict (business_id, month_start) do nothing;

  update public.liguey_ai_usage
  set generation_count = generation_count + 1, updated_at = now()
  where business_id = p_business_id and month_start = v_month and generation_count < p_limit
  returning generation_count into v_count;

  return v_count is not null;
end;
$$;

revoke all on function public.liguey_reserve_ai_generation(uuid, integer) from public, anon, authenticated;
grant execute on function public.liguey_reserve_ai_generation(uuid, integer) to service_role;


-- SOURCE: 20261020020000_liguey_listing_pay_photo_and_company_reviews.sql SHA256: 689477dea87a101a46e59a01b54838ef8c410a4983b1a4cea4a3addd2324769f
-- Kebu Liguey — listing pay/photo fields, and real employment-verified
-- company reviews (requested directly: "add how much it is... add
-- about the company... people can start rating companies... reviews on
-- companies that worked here, anonymous, and put their name if they
-- want").
--
-- Deliberately NOT a "business credit score" / "bad business bureau"
-- composite number: .cursor/rules/kebu-ka-score.mdc is explicit that
-- "customer reviews" must not be in KA Score's first slice, and that no
-- KA Score work starts until that slice is explicitly assigned. Nothing
-- here computes or stores a score — only a real average rating + real
-- review text, surfaced honestly as reviews, not as a credit signal.
--
-- "Worked here" is enforced for real, not merely claimed: a review's
-- application_id must reference a job_applications row with
-- status = 'accepted' belonging to that same reviewer and business
-- (checked in the INSERT policy below). A reviewer cannot invent an
-- employment relationship that never existed. Anonymity is the
-- reviewer's own choice per row (is_anonymous) — the business can never
-- see or suppress a review (no UPDATE/DELETE grant to business members
-- at all), matching the product's own "malicious review spikes must not
-- destroy a score" spirit in the other direction: a business cannot
-- erase a real one either.

alter table public.job_listings
  add column pay_label text not null default '' check (char_length(pay_label) <= 60),
  add column photo_url text not null default '' check (char_length(photo_url) <= 500);

grant update (pay_label) on public.job_listings to authenticated;
grant insert (pay_label) on public.job_listings to authenticated;
-- photo_url is never client-insertable at creation time — it is only
-- ever set by the dedicated upload route (see photo route below), which
-- uses the signed-in manager's own client and this same column grant,
-- the same shape as businesses.logo_url via app/api/businesses/[id]/logo.
grant update (photo_url) on public.job_listings to authenticated;

create table public.liguey_company_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.job_applications(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text not null default '' check (char_length(body) <= 2000),
  is_anonymous boolean not null default false,
  status text not null default 'visible' check (status in ('visible', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, reviewer_user_id)
);

create index liguey_company_reviews_business_idx on public.liguey_company_reviews (business_id, status, created_at desc);

drop trigger if exists liguey_company_reviews_set_updated_at on public.liguey_company_reviews;
create trigger liguey_company_reviews_set_updated_at
  before update on public.liguey_company_reviews
  for each row execute function public.set_updated_at();

-- A review's identity (who wrote it, about which business, proven by
-- which application) can never be reassigned after creation — same
-- convention as guard_job_application_identity. Status, rating and body
-- may always be edited by the author (withdraw by setting 'removed',
-- edit/restore by setting 'visible' again) — the one real guarantee is
-- that only the author who was actually hired there can ever touch it.
create or replace function private.guard_liguey_company_review_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
      or new.business_id is distinct from old.business_id
      or new.reviewer_user_id is distinct from old.reviewer_user_id
      or new.application_id is distinct from old.application_id
    then
      raise exception 'A review''s business, reviewer or application cannot be changed.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_liguey_company_review_identity() from public;
drop trigger if exists guard_liguey_company_review_identity on public.liguey_company_reviews;
create trigger guard_liguey_company_review_identity before update on public.liguey_company_reviews
for each row execute function private.guard_liguey_company_review_identity();

alter table public.liguey_company_reviews enable row level security;

create policy "Visible reviews are readable by any signed-in user"
  on public.liguey_company_reviews for select to authenticated
  using (status = 'visible');

create policy "A reviewer can always read their own review"
  on public.liguey_company_reviews for select to authenticated
  using (reviewer_user_id = auth.uid());

-- job_applications already grants the applicant SELECT on their own
-- rows (applicant_user_id = auth.uid()), so this subquery runs under the
-- reviewer's own real permissions — no SECURITY DEFINER helper needed,
-- unlike job_listings' public-reach gap.
create policy "Workers review businesses that actually hired them"
  on public.liguey_company_reviews for insert to authenticated
  with check (
    reviewer_user_id = auth.uid()
    and exists (
      select 1 from public.job_applications a
      where a.id = application_id
        and a.business_id = liguey_company_reviews.business_id
        and a.applicant_user_id = auth.uid()
        and a.status = 'accepted'
    )
  );

create policy "A reviewer can edit or withdraw their own review"
  on public.liguey_company_reviews for update to authenticated
  using (reviewer_user_id = auth.uid())
  with check (reviewer_user_id = auth.uid());

-- No UPDATE/DELETE policy for business members at all — a reviewed
-- business can read (via the "visible reviews" policy, same as anyone
-- else) but never edit, hide, or delete someone else's real review.

revoke all on public.liguey_company_reviews from anon, authenticated;
revoke insert, update, delete on public.liguey_company_reviews from anon;
grant select on public.liguey_company_reviews to authenticated;
-- status is included in the INSERT grant (not just UPDATE) because the
-- API always sets it explicitly on upsert — including the restore path,
-- where re-submitting after a withdrawal must bring status back to
-- 'visible' as part of the same write.
grant insert (business_id, reviewer_user_id, application_id, rating, body, is_anonymous, status) on public.liguey_company_reviews to authenticated;
grant update (rating, body, is_anonymous, status) on public.liguey_company_reviews to authenticated;
grant all on public.liguey_company_reviews to service_role;


-- SOURCE: 20261106074222_kebu_builtin_app_installs.sql SHA256: 7e2ad3f88123ddd8ddd14ad6c279f76f3875fe3596a809b7ba281ac2f3f8a8ff
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


-- SOURCE: 20261107010000_sheet_bodies.sql SHA256: 394dda879260124f2404231f441aad399886fa40ead7d522ad9a3e500a3078f1
-- Real spreadsheet content for Library nodes of kind='sheet' (completion audit
-- K060: "Sheets/Excel real spreadsheet types/formulas/editing -- Full product
-- not found"). library_nodes.kind already allows 'sheet' (confirmed: zero real
-- callers before this migration, unlike kind='document' which turned out to
-- already be served by a separate workspace_items system) -- this is the first
-- real use of it.
--
-- Cells store the raw input (a literal or a '='-prefixed formula string)
-- separately from any cached computed value, so reopening a sheet still shows
-- the real formula in the formula bar, not a frozen number. The real formula
-- *evaluation* happens via HyperFormula, client-side for live editing and
-- server-side (same library, same code) for export -- this table is just the
-- durable source of truth for raw input.
create table if not exists public.sheet_bodies (
  id uuid primary key references public.library_nodes(id) on delete cascade,
  -- Sparse cell map keyed by address, e.g. {"A1": {"raw": "12"}, "A4": {"raw": "=SUM(A1:A3)"}}.
  -- Only non-empty cells are stored; an absent key means an empty cell.
  cells jsonb not null default '{}'::jsonb,
  -- Sheet dimensions are advisory (grid UI sizing hints), not a hard limit --
  -- a cell address outside this range is still valid, just outside the
  -- initially-rendered viewport.
  row_count integer not null default 100 check (row_count between 1 and 10000),
  column_count integer not null default 26 check (column_count between 1 and 702),
  updated_at timestamptz not null default now()
);

drop trigger if exists sheet_bodies_set_updated_at on public.sheet_bodies;
create trigger sheet_bodies_set_updated_at before update on public.sheet_bodies
for each row execute function public.set_updated_at();

alter table public.sheet_bodies enable row level security;

-- Reuses the exact two SECURITY DEFINER helpers library_nodes/library_shares
-- already defined (20261016120000_library_sharing.sql) specifically to break
-- the owner/share RLS read cycle -- sheet_bodies.id IS the library_nodes.id
-- it belongs to (1:1), so the same helpers apply directly with no new ones.
drop policy if exists "Owners and recipients read sheet_bodies" on public.sheet_bodies;
create policy "Owners and recipients read sheet_bodies"
  on public.sheet_bodies for select
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) is not null
  );

-- Insert covers the lazy-create-on-first-save path: a sheet's library_nodes
-- row can exist with no sheet_bodies row yet (a brand-new, still-empty sheet).
-- An editor (not just the owner) must be able to create that first row --
-- otherwise a shared editor could never save content into a sheet they don't
-- own, which would make "editor" permission meaningless for Sheets.
drop policy if exists "Owners and editors write sheet_bodies" on public.sheet_bodies;
create policy "Owners and editors write sheet_bodies"
  on public.sheet_bodies for insert
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

drop policy if exists "Owners and editors update sheet_bodies" on public.sheet_bodies;
create policy "Owners and editors update sheet_bodies"
  on public.sheet_bodies for update
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  )
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

-- Only the owner can delete the body outright (matches library_nodes' own
-- "Owners delete library_nodes" policy -- an editor can edit content, not
-- destroy it).
drop policy if exists "Owners delete sheet_bodies" on public.sheet_bodies;
create policy "Owners delete sheet_bodies"
  on public.sheet_bodies for delete
  using (private.library_node_owner_id(id) = auth.uid());

grant select, insert, update, delete on public.sheet_bodies to authenticated;
notify pgrst, 'reload schema';


-- SOURCE: 20261107040000_workspace_item_rich_content.sql SHA256: 0d5f52bcde4465dc964138db3221b82aa6e262b96ed6b96be5a6a58069108a65
-- Docs upgrade: workspace_items (kind='doc') gains a real structured rich-text
-- content column, separate from the existing plain-text `body` column.
--
-- `body` stays exactly what it always was for 'task'/'event' items, and keeps
-- working unchanged for any 'doc' row that predates this migration (plain text,
-- capped at 20,000 chars, already real and tested). For a 'doc' row that has
-- been edited since this migration, `rich_content` becomes the real source of
-- truth (a TipTap/ProseMirror JSON document) and `body` is kept as a *derived*
-- plain-text extraction of it, written by the API route on every save — so
-- every existing reader of `body` (previews, search, exports, the old plain
-- textarea fallback) keeps working without modification.
alter table public.workspace_items
  add column if not exists rich_content jsonb;

comment on column public.workspace_items.rich_content is
  'Real structured rich-text content (TipTap/ProseMirror JSON) for kind=''doc'' items. Null for task/event items and for doc rows never opened in the rich editor. body is kept in sync as a derived plain-text extraction when this is set.';

notify pgrst, 'reload schema';


-- SOURCE: 20261108010000_slide_bodies.sql SHA256: 7dc7e086bf9e0b808586472668229bafc88a15b2ab469e9fb6f7ab50e8b8bd03
-- Real presentation content for Library nodes of kind='slide' (completion
-- audit K061: "Slides/presentations creation and collaborative editing --
-- Full product not found"). Mirrors the Sheets precedent
-- (20261107010000_sheet_bodies.sql) exactly: extend library_nodes.kind with
-- the new value, add a 1:1 body table reusing the existing
-- library_node_owner_id / library_share_permission SECURITY DEFINER helpers
-- for RLS, same owner/editor/viewer policy shape.

alter table public.library_nodes drop constraint if exists library_nodes_kind_check;
alter table public.library_nodes add constraint library_nodes_kind_check
  check (kind in ('folder', 'link', 'document', 'sheet', 'slide'));

-- A deck is an ordered array of slides. Each slide is a small, self-contained
-- JSON object: { id, name, backgroundColor, layers: [...], transitionKind,
-- transitionDurationMs }. Unlike Sheets' sparse per-cell map, a deck's own
-- slide order *is* meaningful content (not just a rendering hint), so it is
-- stored as an ordered jsonb array, not a keyed map.
create table if not exists public.slide_bodies (
  id uuid primary key references public.library_nodes(id) on delete cascade,
  slides jsonb not null default '[]'::jsonb,
  -- Artboard size in pixels, shared by every slide in the deck (changing it
  -- rescales layer coordinates client-side, so the stored layer x/y/width/
  -- height always assume this size -- the Studio canvas-document precedent
  -- for a 16:9 "pitch_deck_slide" artboard).
  width integer not null default 1920 check (width between 200 and 4096),
  height integer not null default 1080 check (height between 200 and 4096),
  updated_at timestamptz not null default now()
);

drop trigger if exists slide_bodies_set_updated_at on public.slide_bodies;
create trigger slide_bodies_set_updated_at before update on public.slide_bodies
for each row execute function public.set_updated_at();

alter table public.slide_bodies enable row level security;

drop policy if exists "Owners and recipients read slide_bodies" on public.slide_bodies;
create policy "Owners and recipients read slide_bodies"
  on public.slide_bodies for select
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) is not null
  );

-- Insert covers the lazy-create-on-first-save path: a deck's library_nodes
-- row can exist with no slide_bodies row yet (a brand-new, still-empty
-- deck). An editor (not just the owner) must be able to create that first
-- row, the same reasoning as Sheets.
drop policy if exists "Owners and editors write slide_bodies" on public.slide_bodies;
create policy "Owners and editors write slide_bodies"
  on public.slide_bodies for insert
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

drop policy if exists "Owners and editors update slide_bodies" on public.slide_bodies;
create policy "Owners and editors update slide_bodies"
  on public.slide_bodies for update
  using (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  )
  with check (
    private.library_node_owner_id(id) = auth.uid()
    or private.library_share_permission(id, auth.uid()) = 'editor'
  );

-- Only the owner can delete the body outright (matches sheet_bodies/
-- library_nodes' own delete policy).
drop policy if exists "Owners delete slide_bodies" on public.slide_bodies;
create policy "Owners delete slide_bodies"
  on public.slide_bodies for delete
  using (private.library_node_owner_id(id) = auth.uid());

grant select, insert, update, delete on public.slide_bodies to authenticated;
notify pgrst, 'reload schema';


-- SOURCE: 20261108020000_room_calls_mesh.sql SHA256: 9a68e938b107dc21e7d39581f1090b95bbf0507028b97525c361ed8b3c056b95
-- Upgrade private room calls from a two-person, RPC-polling-signaled prototype
-- to real group meetings. SDP offers/answers/ICE candidates now travel over
-- Supabase Realtime broadcast (ephemeral, peer-to-peer) instead of being
-- stored and polled in Postgres; this table only tracks call sessions and
-- participants for authorization, capacity, and history.



create table public.room_calls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  started_by uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Kept in sync with MAX_MESH_PARTICIPANTS in lib/rooms/call-mesh.ts — a full
  -- mesh (one RTCPeerConnection per pair) does not scale past a small group
  -- without a media server (SFU), which is out of scope for this slice.
  max_participants int not null default 8 check (max_participants between 2 and 8)
);
alter table public.room_calls enable row level security;
revoke all on public.room_calls from public, anon, authenticated;
grant select on public.room_calls to authenticated;
create index room_calls_room_idx on public.room_calls(room_id, started_at desc);

create table public.room_call_participants (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.room_calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (call_id, user_id)
);
alter table public.room_call_participants enable row level security;
revoke all on public.room_call_participants from public, anon, authenticated;
grant select on public.room_call_participants to authenticated;
create index room_call_participants_call_idx on public.room_call_participants(call_id, left_at);
create index room_call_participants_user_idx on public.room_call_participants(user_id, joined_at desc);

create policy "Room members read calls" on public.room_calls
  for select using (public.can_access_room(room_id));

create policy "Room members read call participants" on public.room_call_participants
  for select using (
    exists (
      select 1 from public.room_calls c
      where c.id = room_call_participants.call_id and public.can_access_room(c.room_id)
    )
  );

-- Get-or-create the room's active call and join it. Locks the active call row
-- so two simultaneous joins can't both squeeze past the capacity check.
create or replace function public.room_call_join(p_room uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
begin
  if actor is null or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;

  if not found then
    insert into public.room_calls(room_id, started_by) values (p_room, actor)
      returning * into call_row;
  end if;

  select count(*) into active_count from public.room_call_participants
    where call_id = call_row.id and left_at is null and user_id <> actor;
  if active_count >= call_row.max_participants then
    raise exception 'Call is full';
  end if;

  insert into public.room_call_participants(call_id, user_id)
    values (call_row.id, actor)
    on conflict (call_id, user_id) do update
      set joined_at = case when public.room_call_participants.left_at is not null then now()
                           else public.room_call_participants.joined_at end,
          left_at = null;

  return jsonb_build_object(
    'id', call_row.id, 'roomId', call_row.room_id, 'startedAt', call_row.started_at,
    'maxParticipants', call_row.max_participants
  );
end;
$$;
revoke all on function public.room_call_join(uuid) from public, anon;
grant execute on function public.room_call_join(uuid) to authenticated;

-- Leave a call. Ends it for everyone once the last active participant leaves.
create or replace function public.room_call_leave(p_call uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  remaining int;
  call_room uuid;
begin
  if actor is null then return null; end if;
  select room_id into call_room from public.room_calls where id = p_call;
  if call_room is null or not public.can_access_room(call_room) then return null; end if;

  update public.room_call_participants set left_at = now()
    where call_id = p_call and user_id = actor and left_at is null;

  select count(*) into remaining from public.room_call_participants
    where call_id = p_call and left_at is null;
  if remaining = 0 then
    update public.room_calls set ended_at = coalesce(ended_at, now()) where id = p_call;
  end if;
  return jsonb_build_object('left', true, 'ended', remaining = 0);
end;
$$;
revoke all on function public.room_call_leave(uuid) from public, anon;
grant execute on function public.room_call_leave(uuid) to authenticated;

-- Force-end a call for everyone. Only the call's starter or a room owner/admin.
create or replace function public.room_call_end(p_call uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  allowed boolean;
begin
  if actor is null then return null; end if;
  select * into call_row from public.room_calls where id = p_call for update;
  if not found then return null; end if;

  select (
    call_row.started_by = actor
    or exists (
      select 1 from public.rooms r where r.id = call_row.room_id and r.created_by = actor
    )
    or exists (
      select 1 from public.room_members m
      where m.room_id = call_row.room_id and m.user_id = actor and m.role in ('owner','admin')
    )
  ) into allowed;
  if not allowed then return null; end if;

  update public.room_calls set ended_at = coalesce(ended_at, now()) where id = p_call;
  update public.room_call_participants set left_at = coalesce(left_at, now()) where call_id = p_call;
  return jsonb_build_object('ended', true);
end;
$$;
revoke all on function public.room_call_end(uuid) from public, anon;
grant execute on function public.room_call_end(uuid) to authenticated;


-- SOURCE: 20261109010001_room_call_join_created_flag.sql SHA256: be12eb4e65b6b97e0da81050ae2659158316ded9729be9e070a5a66d14207f2b
-- room_call_join previously gave callers no way to tell "I just started a new
-- call" apart from "I joined one already in progress" — needed so the API
-- layer can notify other room members only when a call is genuinely new, not
-- on every join/rejoin.
create or replace function public.room_call_join(p_room uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
  is_new_call boolean;
begin
  if actor is null or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;
  is_new_call := not found;

  if is_new_call then
    insert into public.room_calls(room_id, started_by) values (p_room, actor)
      returning * into call_row;
  end if;

  select count(*) into active_count from public.room_call_participants
    where call_id = call_row.id and left_at is null and user_id <> actor;
  if active_count >= call_row.max_participants then
    raise exception 'Call is full';
  end if;

  insert into public.room_call_participants(call_id, user_id)
    values (call_row.id, actor)
    on conflict (call_id, user_id) do update
      set joined_at = case when public.room_call_participants.left_at is not null then now()
                           else public.room_call_participants.joined_at end,
          left_at = null;

  return jsonb_build_object(
    'id', call_row.id, 'roomId', call_row.room_id, 'startedAt', call_row.started_at,
    'maxParticipants', call_row.max_participants, 'created', is_new_call
  );
end;
$$;
revoke all on function public.room_call_join(uuid) from public, anon;
grant execute on function public.room_call_join(uuid) to authenticated;


-- SOURCE: 20261109010000_cloud_storage.sql SHA256: 3431a354538181b34f3ad3925fcb916de23adaba180f96611813d33884edd10c
-- Kebu Cloud, phase 1 (completion audit K070: "Kebu Cloud hosts user apps/
-- software, APIs, databases and automations -- Full Kebu product not found").
-- Full Kebu Cloud per docs/KEBU-ECOSYSTEM.md is a future PaaS (deploy/run
-- arbitrary developer code, containers, databases) with no defined security
--/isolation model -- that is explicitly NOT what this migration builds.
-- Scope here, chosen deliberately to stay safe: real object storage (buckets
-- + files) and real static site/SPA hosting. No server-side code execution
-- of any kind -- deployments are extracted, static files served as-is.
--
-- Storage quota reuses the *existing*, already-defined-but-never-enforced
-- lib/billing/plans.ts KebuPlanLimits.storageMb field (confirmed zero
-- call sites before this change) rather than inventing a new business rule --
-- this migration's job is just to give that field something real to meter.

create table if not exists public.cloud_storage_buckets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 63 and name ~ '^[a-z0-9][a-z0-9._-]*$'),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

drop trigger if exists cloud_storage_buckets_set_updated_at on public.cloud_storage_buckets;
create trigger cloud_storage_buckets_set_updated_at before update on public.cloud_storage_buckets
for each row execute function public.set_updated_at();

create table if not exists public.cloud_storage_files (
  id uuid primary key default gen_random_uuid(),
  bucket_id uuid not null references public.cloud_storage_buckets(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  mime_type text not null check (char_length(trim(mime_type)) between 3 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists cloud_storage_files_bucket_idx on public.cloud_storage_files (bucket_id);

-- Deployment slug becomes the `<slug>.cloud.kebu.africa` subdomain
-- (lib/create/middleware-routing.ts) -- must be a valid DNS label, globally
-- unique (it is the whole origin, not scoped per owner).
create table if not exists public.cloud_deployments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  live_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cloud_deployments_owner_idx on public.cloud_deployments (owner_id);

drop trigger if exists cloud_deployments_set_updated_at on public.cloud_deployments;
create trigger cloud_deployments_set_updated_at before update on public.cloud_deployments
for each row execute function public.set_updated_at();

create table if not exists public.cloud_deployment_versions (
  id uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.cloud_deployments(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  storage_prefix text not null unique,
  size_bytes bigint not null check (size_bytes >= 0),
  file_count integer not null check (file_count >= 0),
  -- Exact object keys written for this version, so deletion can remove
  -- precisely what was uploaded instead of a best-effort storage.list()
  -- (the JS client's list() is a flat, non-recursive, paginated directory
  -- read -- not a reliable way to discover every nested asset path).
  asset_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (deployment_id, version_number)
);

create index if not exists cloud_deployment_versions_deployment_idx on public.cloud_deployment_versions (deployment_id);

alter table public.cloud_deployments
  add constraint cloud_deployments_live_version_fkey
  foreign key (live_version_id) references public.cloud_deployment_versions(id) on delete set null;

-- RLS stays strict owner-only on every table, including the deployment that
-- a visitor's browser ultimately resolves by slug: public serving
-- (app/cloud-sites/[slug]/.../route.ts) reads through the service-role
-- client, not these policies, so the "what can an anonymous visitor see"
-- decision lives in one reviewable server code path instead of being spread
-- across RLS. Mirrors how room_calls/sheet_bodies keep sensitive
-- cross-cutting reads behind SECURITY DEFINER / service-role, not anon RLS.

alter table public.cloud_storage_buckets enable row level security;
alter table public.cloud_storage_files enable row level security;
alter table public.cloud_deployments enable row level security;
alter table public.cloud_deployment_versions enable row level security;

drop policy if exists "Owners manage cloud_storage_buckets" on public.cloud_storage_buckets;
create policy "Owners manage cloud_storage_buckets"
  on public.cloud_storage_buckets for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners manage cloud_storage_files" on public.cloud_storage_files;
create policy "Owners manage cloud_storage_files"
  on public.cloud_storage_files for all
  using (
    exists (
      select 1 from public.cloud_storage_buckets b
      where b.id = cloud_storage_files.bucket_id and b.owner_id = auth.uid()
    )
  )
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.cloud_storage_buckets b
      where b.id = cloud_storage_files.bucket_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners manage cloud_deployments" on public.cloud_deployments;
create policy "Owners manage cloud_deployments"
  on public.cloud_deployments for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners manage cloud_deployment_versions" on public.cloud_deployment_versions;
create policy "Owners manage cloud_deployment_versions"
  on public.cloud_deployment_versions for all
  using (
    exists (
      select 1 from public.cloud_deployments d
      where d.id = cloud_deployment_versions.deployment_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cloud_deployments d
      where d.id = cloud_deployment_versions.deployment_id and d.owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.cloud_storage_buckets to authenticated;
grant select, insert, update, delete on public.cloud_storage_files to authenticated;
grant select, insert, update, delete on public.cloud_deployments to authenticated;
grant select, insert, update, delete on public.cloud_deployment_versions to authenticated;

-- Storage: user object storage, 25 MB/file cap (app layer separately enforces
-- the per-account storageMb plan quota across both buckets combined).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cloud-user-storage', 'cloud-user-storage', false, 26214400, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage: extracted static-deployment assets only -- web asset mime types,
-- smaller per-file cap (typical site assets, not general file storage).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cloud-deployments',
  'cloud-deployments',
  false,
  10485760,
  array[
    'text/html', 'text/css', 'text/plain', 'text/javascript', 'application/javascript',
    'application/json', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml',
    'image/x-icon', 'font/woff', 'font/woff2', 'application/font-woff', 'application/wasm',
    'application/xml', 'text/xml', 'text/markdown'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects paths are `${ownerId}/${bucketRowId}/${fileId}-${name}` for
-- user storage -- foldername()[1] is always the uploader's own auth.uid(), so
-- this is a direct check, no join needed (mirrors business-documents'
-- foldername-based storage RLS, migrations_archive/legacy/017).
drop policy if exists "Cloud storage owner read" on storage.objects;
create policy "Cloud storage owner read"
  on storage.objects for select
  using (
    bucket_id = 'cloud-user-storage'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Cloud storage owner write" on storage.objects;
create policy "Cloud storage owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'cloud-user-storage'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Cloud storage owner delete" on storage.objects;
create policy "Cloud storage owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'cloud-user-storage'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deployment asset paths are `${deploymentId}/${versionId}/<relative path>` --
-- foldername()[1] is the deployment id, checked against ownership via a join
-- (the uploader isn't encoded in the path the way it is for user storage).
--
-- Every reference to the object's own path is qualified as
-- `storage.objects.name` -- an unqualified `name` inside the EXISTS
-- subquery resolves to cloud_deployments.name (the deployment's own
-- display-name column, also called `name`), not storage.objects.name,
-- because the inner table is the closer scope. That shadowing bug was
-- caught by this migration's own PGlite RLS test
-- (tests/cloud/cloud-storage-rls.local-pg.test.ts): with it, even the real
-- owner's own upload was rejected, since no object path ever matches a
-- deployment's display name. CREATE POLICY has no table-alias clause, so
-- the fully-qualified name is the fix, not an alias.
drop policy if exists "Cloud deployment owner read" on storage.objects;
create policy "Cloud deployment owner read"
  on storage.objects for select
  using (
    bucket_id = 'cloud-deployments'
    and auth.uid() is not null
    and exists (
      select 1 from public.cloud_deployments d
      where d.owner_id = auth.uid()
        and d.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

drop policy if exists "Cloud deployment owner write" on storage.objects;
create policy "Cloud deployment owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'cloud-deployments'
    and auth.uid() is not null
    and exists (
      select 1 from public.cloud_deployments d
      where d.owner_id = auth.uid()
        and d.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

drop policy if exists "Cloud deployment owner delete" on storage.objects;
create policy "Cloud deployment owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'cloud-deployments'
    and auth.uid() is not null
    and exists (
      select 1 from public.cloud_deployments d
      where d.owner_id = auth.uid()
        and d.id::text = (storage.foldername(storage.objects.name))[1]
    )
  );

notify pgrst, 'reload schema';


-- SOURCE: 20261109020000_room_call_default_cap.sql SHA256: 03e1e5274371479f5123f88652c4559a9c1cec07444d3e0e4bce667634b078e5
-- Let the call's starter pick a cap within the existing 2-8 range, instead
-- of every call silently defaulting to the ceiling with no way to choose
-- smaller. The default itself stays 8 (an explicit product decision, not an
-- oversight - see lib/rooms/call-mesh.ts's DEFAULT_MESH_PARTICIPANTS comment
-- for the mobile-bandwidth tradeoff that was weighed and kept): whoever
-- wants a smaller, more reliable call on a weak connection can now ask for
-- one via the size picker, without changing what happens when nobody asks.
create or replace function public.room_call_join(p_room uuid, p_max_participants int default 8)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
  requested_cap int;
  is_new_call boolean;
begin
  if actor is null or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;
  is_new_call := not found;

  if is_new_call then
    -- Clamp rather than reject: a caller-supplied value outside the table's
    -- own check constraint just gets pulled back into range instead of
    -- failing the whole join, since the UI already only offers in-range
    -- choices and this is a floor/ceiling, not a validation surface.
    requested_cap := least(greatest(coalesce(p_max_participants, 8), 2), 8);
    insert into public.room_calls(room_id, started_by, max_participants)
      values (p_room, actor, requested_cap)
      returning * into call_row;
  end if;

  select count(*) into active_count from public.room_call_participants
    where call_id = call_row.id and left_at is null and user_id <> actor;
  if active_count >= call_row.max_participants then
    raise exception 'Call is full';
  end if;

  insert into public.room_call_participants(call_id, user_id)
    values (call_row.id, actor)
    on conflict (call_id, user_id) do update
      set joined_at = case when public.room_call_participants.left_at is not null then now()
                           else public.room_call_participants.joined_at end,
          left_at = null;

  return jsonb_build_object(
    'id', call_row.id, 'roomId', call_row.room_id, 'startedAt', call_row.started_at,
    'maxParticipants', call_row.max_participants, 'created', is_new_call
  );
end;
$$;
revoke all on function public.room_call_join(uuid, int) from public, anon;
grant execute on function public.room_call_join(uuid, int) to authenticated;

-- The old single-argument overload from 20261108020000 is gone once Postgres
-- resolves calls against the two-argument version with its default; drop it
-- explicitly so there's exactly one room_call_join to keep in sync with.
drop function if exists public.room_call_join(uuid);

-- Already 8 from 20261108020000; restated for clarity now that the
-- function above also treats 8 as its explicit default, not an oversight.
alter table public.room_calls alter column max_participants set default 8;


-- SOURCE: 20261112075207_editor_revision_guards.sql SHA256: dc586554f03011c32a3f398c76742400b3220f7f538f9f9bb4fd3715fdb8ea6e
-- Strictly advance body revision even for multiple writes in one transaction.
create or replace function public.advance_library_body_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function public.advance_library_body_revision() from public;
drop trigger if exists sheet_bodies_set_updated_at on public.sheet_bodies;
create trigger sheet_bodies_set_updated_at before update on public.sheet_bodies
for each row execute function public.advance_library_body_revision();
drop trigger if exists slide_bodies_set_updated_at on public.slide_bodies;
create trigger slide_bodies_set_updated_at before update on public.slide_bodies
for each row execute function public.advance_library_body_revision();


-- SOURCE: 20261112075718_document_collaboration_state.sql SHA256: 2e019214c28645e1bd75ed5febc7dd6b49e1e2a2d46a9a5e8e80e0545392612c
alter table public.workspace_items add column if not exists collab_state text
  check (collab_state is null or octet_length(collab_state) <= 2000000);

alter table public.workspace_items add column if not exists collab_epoch uuid;
alter table public.workspace_items add column if not exists collab_write_id uuid;

-- Private Realtime channels: database permissions, never a UI-only join gate.
-- realtime.messages already has RLS enabled by Supabase; do not alter its ownership settings.
drop policy if exists "Document collaborators receive" on realtime.messages;
create policy "Document collaborators receive" on realtime.messages for select to authenticated using (
  exists (select 1 from public.workspace_items w where w.kind = 'doc'
    and (select realtime.topic()) in ('doc-collab:' || w.id::text || ':' || w.collab_epoch::text, 'doc-presence:' || w.id::text || ':' || w.collab_epoch::text))
);
drop policy if exists "Document collaborators send" on realtime.messages;
create policy "Document collaborators send" on realtime.messages for insert to authenticated with check (
  exists (select 1 from public.workspace_items w where w.kind = 'doc'
    and (select realtime.topic()) in ('doc-collab:' || w.id::text || ':' || w.collab_epoch::text, 'doc-presence:' || w.id::text || ':' || w.collab_epoch::text))
);
notify pgrst, 'reload schema';

-- Older clients or direct Data API writes must invalidate the old CRDT history.
create or replace function public.invalidate_stale_document_collaboration()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.rich_content is distinct from old.rich_content or new.body is distinct from old.body)
     and new.collab_write_id is not distinct from old.collab_write_id then
    new.collab_state := null;
    new.collab_epoch := null;
    new.collab_write_id := null;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_stale_document_collaboration() from public;
drop trigger if exists workspace_items_invalidate_collab on public.workspace_items;
create trigger workspace_items_invalidate_collab before update on public.workspace_items
for each row execute function public.invalidate_stale_document_collaboration();


-- SOURCE: 20261112075919_cloud_deployment_version_ownership.sql SHA256: 8c5773eb822a58a88be4464f7fdfc17b30d06ea476edd0b063f88530072b4511
-- Fail closed on inconsistent existing metadata; never repoint a tenant's version.
-- Repeatable for a manually interrupted rollout. These checks validate existing data.
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.cloud_deployment_versions'::regclass and conname='cloud_versions_canonical_prefix') then
  alter table public.cloud_deployment_versions add constraint cloud_versions_canonical_prefix
   check(storage_prefix=deployment_id::text||'/'||id::text) not valid;
 end if;
 alter table public.cloud_deployment_versions validate constraint cloud_versions_canonical_prefix;
 if not exists(select 1 from pg_constraint where conrelid='public.cloud_deployment_versions'::regclass and conname='cloud_versions_deployment_identity') then
  alter table public.cloud_deployment_versions add constraint cloud_versions_deployment_identity unique(deployment_id,id);
 end if;
 alter table public.cloud_deployments drop constraint if exists cloud_deployments_live_version_fkey;
 if not exists(select 1 from pg_constraint where conrelid='public.cloud_deployments'::regclass and conname='cloud_deployments_owned_live_version_fkey') then
  alter table public.cloud_deployments add constraint cloud_deployments_owned_live_version_fkey
   foreign key(id,live_version_id) references public.cloud_deployment_versions(deployment_id,id)
   on delete set null(live_version_id) not valid;
 end if;
 alter table public.cloud_deployments validate constraint cloud_deployments_owned_live_version_fkey;
end $$;


-- SOURCE: 20261112081206_private_room_call_signaling.sql SHA256: 903ecbbe8213e2223db3599679de18db918b159208a606daf8c97aa7a08442b8
-- Only current room members with an active call participation can exchange signals.
drop policy if exists "Active call participants receive signals" on realtime.messages;
create policy "Active call participants receive signals" on realtime.messages for select to authenticated using (
  exists (select 1 from public.room_calls c join public.room_call_participants p on p.call_id = c.id
    where (select realtime.topic()) = 'room-call:' || c.id::text
      and public.can_access_room(c.room_id) and c.ended_at is null and p.user_id = (select auth.uid()) and p.left_at is null)
);
drop policy if exists "Active call participants send signals" on realtime.messages;
create policy "Active call participants send signals" on realtime.messages for insert to authenticated with check (
  exists (select 1 from public.room_calls c join public.room_call_participants p on p.call_id = c.id
    where (select realtime.topic()) = 'room-call:' || c.id::text
      and public.can_access_room(c.room_id) and c.ended_at is null and p.user_id = (select auth.uid()) and p.left_at is null)
);


-- SOURCE: 20261116015115_company_team_invite_atomic.sql SHA256: dbdc170f123440a61c47abd1ebdfb179804fd2fd4180400e371530d8cceade0e
-- Accept, membership and audit are one transaction. No caller-supplied identity/email.
create schema if not exists private;
create or replace function private.can_invite_business_role(p_business uuid, p_role text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.business_members m where m.business_id=p_business
   and m.user_id=(select auth.uid()) and m.status='active' and (
     (m.role in ('founder','administrator') and p_role in ('cofounder','administrator','finance_manager','store_manager','manager','creative','developer','designer','employee','accountant','legal_representative','viewer'))
     or (m.role in ('manager','store_manager') and p_role in ('creative','developer','designer','employee','viewer'))));
$$;
revoke all on function private.can_invite_business_role(uuid,text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_invite_business_role(uuid,text) to authenticated;

drop policy if exists "Managers read business invites" on public.business_invites;
drop policy if exists "Managers write business invites" on public.business_invites;
create policy "Team managers read invites" on public.business_invites for select to authenticated
using (private.can_invite_business_role(business_id,role));
create policy "Team managers create invites" on public.business_invites for insert to authenticated
with check (invited_by=(select auth.uid()) and status='pending' and accepted_user_id is null and accepted_at is null
  and private.can_invite_business_role(business_id,role));
create policy "Team managers revoke invites" on public.business_invites for update to authenticated
using (status='pending' and private.can_invite_business_role(business_id,role))
with check (status='revoked' and accepted_user_id is null and accepted_at is null
  and private.can_invite_business_role(business_id,role));
-- Never allow a direct Data API update to turn a normal invite into another identity/role.
create or replace function private.keep_business_invite_identity()
returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.business_id,new.email,new.role,new.token,new.invited_by,new.expires_at)
    is distinct from row(old.business_id,old.email,old.role,old.token,old.invited_by,old.expires_at) then
   raise exception 'Revoke this invitation and create a new one to change its identity or role.';
 end if;
 return new;
end $$;
revoke all on function private.keep_business_invite_identity() from public,anon,authenticated;
create trigger business_invites_keep_identity before update on public.business_invites
for each row execute function private.keep_business_invite_identity();

create or replace function private.accept_business_invite(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 actor_email text;
 invitation public.business_invites%rowtype;
 membership public.business_members%rowtype;
 inviter public.business_members%rowtype;
begin
 if actor is null then return jsonb_build_object('ok',false,'status',401,'error','Sign in required.'); end if;
 select lower(trim(email)) into actor_email from auth.users where id=actor and email_confirmed_at is not null;
 if actor_email is null then return jsonb_build_object('ok',false,'status',403,'error','Confirm your account email before accepting an invitation.'); end if;
 select * into invitation from public.business_invites where token=p_token for update;
 if not found or lower(trim(invitation.email))<>actor_email then
   return jsonb_build_object('ok',false,'status',404,'error','Invitation not found for this account.');
 end if;
 -- Serializes two invitations for the same business/account, including when no membership row exists.
 perform pg_advisory_xact_lock(hashtextextended(invitation.business_id::text||':'||actor::text,0));
 select * into membership from public.business_members where business_id=invitation.business_id and user_id=actor for update;
 if invitation.status='accepted' then
   if invitation.accepted_user_id=actor and membership.status='active' then
     return jsonb_build_object('ok',true,'businessId',invitation.business_id,'role',membership.role);
   end if;
   return jsonb_build_object('ok',false,'status',409,'error','Invitation was already used. Ask the company for a new invitation.');
 end if;
 if invitation.status<>'pending' then return jsonb_build_object('ok',false,'status',410,'error','Invitation is no longer available.'); end if;
 if invitation.expires_at<=clock_timestamp() then
   update public.business_invites set status='expired' where id=invitation.id;
   return jsonb_build_object('ok',false,'status',410,'error','Invitation expired.');
 end if;
 -- Lock the inviter against concurrent removal/demotion while granting access.
 select * into inviter from public.business_members where business_id=invitation.business_id and user_id=invitation.invited_by for share;
 if inviter.status is distinct from 'active' or not (
    inviter.role in ('founder','administrator') or
    (inviter.role in ('manager','store_manager') and invitation.role in ('creative','developer','designer','employee','viewer'))
 ) then return jsonb_build_object('ok',false,'status',403,'error','The inviter can no longer grant this access.'); end if;
 if membership.id is not null and membership.status<>'active' and membership.updated_at>=invitation.created_at then
   return jsonb_build_object('ok',false,'status',409,'error','Access was removed after this invitation. Ask for a new invitation.');
 end if;
 if membership.id is null then
   insert into public.business_members(business_id,user_id,role,status)
   values(invitation.business_id,actor,invitation.role,'active') returning * into membership;
 elsif membership.status<>'active' then
   update public.business_members set role=invitation.role,status='active',updated_at=clock_timestamp()
   where id=membership.id returning * into membership;
 end if;
 update public.business_invites set status='accepted',accepted_at=clock_timestamp(),accepted_user_id=actor
 where id=invitation.id;
 insert into public.business_audit_logs(business_id,actor_user_id,action,metadata)
 values(invitation.business_id,actor,'team.invite_accepted',jsonb_build_object('inviteId',invitation.id,'role',membership.role));
 return jsonb_build_object('ok',true,'businessId',invitation.business_id,'role',membership.role);
end $$;
revoke all on function private.accept_business_invite(text) from public,anon;
grant execute on function private.accept_business_invite(text) to authenticated;
create or replace function public.accept_business_invite(p_token text)
returns jsonb language sql security invoker set search_path='' as $$ select private.accept_business_invite(p_token); $$;
revoke all on function public.accept_business_invite(text) from public,anon;
grant execute on function public.accept_business_invite(text) to authenticated;
notify pgrst,'reload schema';


-- SOURCE: 20261116015814_liguey_optional_app_and_employer_safety.sql SHA256: 5b112b040f7575defb3a91a4cabda4156e96c6c6cb2d193b06738df27095f658
-- Liguey is an optional Kebu app, never a separate login or an automatic signup.
alter table public.kebu_builtin_app_installs drop constraint kebu_builtin_app_installs_app_key_check;
alter table public.kebu_builtin_app_installs add constraint kebu_builtin_app_installs_app_key_check check(app_key in ('live-rooms','friends','liguey'));
create or replace function private.is_liguey_manager(p_business uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_members where business_id=p_business and user_id=(select auth.uid()) and status='active' and role in ('founder','administrator','store_manager'));
$$;
revoke all on function private.is_liguey_manager(uuid) from public,anon;
grant execute on function private.is_liguey_manager(uuid) to authenticated;

create table public.business_employer_verifications(
 business_id uuid primary key references public.businesses(id) on delete cascade,
 country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 registry_authority text not null check(char_length(trim(registry_authority)) between 2 and 160),
 registration_number text not null check(char_length(trim(registration_number)) between 2 and 120),
 registry_url text not null check(registry_url ~ '^https://[^[:space:]]+$' and char_length(registry_url)<=2000),
 recruiter_name text not null check(char_length(trim(recruiter_name)) between 2 and 120),
 office_address text not null default '' check(char_length(office_address)<=500),
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended')),
 registry_checked boolean not null default false,
 recruiter_checked boolean not null default false,
 office_checked boolean not null default false,
 review_note text not null default '' check(char_length(review_note)<=2000),
 reviewed_at timestamptz,expires_at timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 check(status<>'approved' or (registry_checked and recruiter_checked and reviewed_at is not null and expires_at>reviewed_at)),
 check(not office_checked or char_length(trim(office_address))>=10)
);
alter table public.business_employer_verifications enable row level security;
revoke all on public.business_employer_verifications from public,anon,authenticated;
grant select on public.business_employer_verifications to authenticated;
grant all on public.business_employer_verifications to service_role;
create policy "Hiring managers read their review" on public.business_employer_verifications for select to authenticated using(private.is_liguey_manager(business_id));
create or replace function private.employer_can_recruit(p_business uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_employer_verifications v join public.businesses b on b.id=v.business_id
 where v.business_id=p_business and v.status='approved' and v.registry_checked and v.recruiter_checked
 and v.expires_at>clock_timestamp() and b.lifecycle_status='active');
$$;
revoke all on function private.employer_can_recruit(uuid) from public,anon;
grant execute on function private.employer_can_recruit(uuid) to authenticated;

create or replace function public.liguey_request_verification(p_business uuid,p_country text,p_authority text,p_number text,p_url text,p_recruiter text,p_office text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_liguey_manager(p_business)
 or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Not allowed'; end if;
 insert into public.business_employer_verifications(business_id,country_code,registry_authority,registration_number,registry_url,recruiter_name,office_address)
 values(p_business,upper(trim(p_country)),trim(p_authority),trim(p_number),trim(p_url),trim(p_recruiter),trim(p_office))
 on conflict(business_id) do update set country_code=excluded.country_code,registry_authority=excluded.registry_authority,
 registration_number=excluded.registration_number,registry_url=excluded.registry_url,recruiter_name=excluded.recruiter_name,
 office_address=excluded.office_address,status='pending',registry_checked=false,recruiter_checked=false,office_checked=false,
 review_note='',reviewed_at=null,expires_at=null,updated_at=clock_timestamp();
end $$;
revoke all on function public.liguey_request_verification(uuid,text,text,text,text,text,text) from public,anon;
grant execute on function public.liguey_request_verification(uuid,text,text,text,text,text,text) to authenticated;

create or replace function private.guard_liguey_publishing()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('draft','published') then
  if auth.uid() is null or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then
   raise exception 'Add Liguey from the Kebu App Store first.';
  end if;
  if new.status='published' and not private.employer_can_recruit(new.business_id) then
   raise exception 'An active company registration and recruiter review is required before publishing.';
  end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_liguey_publishing() from public,anon,authenticated;
create trigger job_listings_require_review before insert or update on public.job_listings for each row execute function private.guard_liguey_publishing();
create or replace function private.is_published_job_listing(p_listing_id uuid,p_business_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.job_listings l where l.id=p_listing_id and l.business_id=p_business_id and l.status='published')
 and private.employer_can_recruit(p_business_id)
 and exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey');
$$;
-- Existing execute grants are retained on the replaced application-policy helper.
notify pgrst,'reload schema';

create table public.employer_review_events(
 id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id),
 decision text not null,note text not null,registry_checked boolean not null,recruiter_checked boolean not null,
 office_checked boolean not null,created_at timestamptz not null default clock_timestamp()
);
alter table public.employer_review_events enable row level security;
revoke all on public.employer_review_events from public,anon,authenticated;
grant all on public.employer_review_events to service_role;
create or replace function public.liguey_review_employer(p_business uuid,p_revision timestamptz,p_status text,p_registry boolean,p_recruiter boolean,p_office boolean,p_note text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v public.business_employer_verifications%rowtype;
begin
 if p_status not in ('approved','rejected','suspended') or char_length(trim(p_note))<20 then raise exception 'A review decision and substantive note are required.'; end if;
 select * into v from public.business_employer_verifications where business_id=p_business for update;
 if not found or v.updated_at<>p_revision then return false; end if;
 if p_status='approved' and not (p_registry and p_recruiter) then raise exception 'Registration and recruiter authority must both be checked.'; end if;
 if p_office and char_length(trim(v.office_address))<10 then raise exception 'An office address is required.'; end if;
 update public.business_employer_verifications set status=p_status,registry_checked=p_registry,recruiter_checked=p_recruiter,
 office_checked=p_office,review_note=trim(p_note),reviewed_at=clock_timestamp(),
 expires_at=case when p_status='approved' then clock_timestamp()+interval '90 days' else null end,
 updated_at=greatest(clock_timestamp(),v.updated_at+interval '1 microsecond') where business_id=p_business;
 insert into public.employer_review_events(business_id,decision,note,registry_checked,recruiter_checked,office_checked)
 values(p_business,p_status,trim(p_note),p_registry,p_recruiter,p_office);
 return true;
end $$;
revoke all on function public.liguey_review_employer(uuid,timestamptz,text,boolean,boolean,boolean,text) from public,anon,authenticated;
grant execute on function public.liguey_review_employer(uuid,timestamptz,text,boolean,boolean,boolean,text) to service_role;

-- A general company membership never grants access to recruitment files.
-- Restrictive policy also narrows the profile/evidence policies which consult applications.
create policy "Recruitment is private to applicant and hiring managers"
 on public.job_applications as restrictive for select to authenticated
 using (applicant_user_id = auth.uid() or private.is_liguey_manager(business_id));
do $$begin
 if to_regclass('public.liguey_applicant_insights') is not null then
  execute 'create policy "Recruitment insight confidentiality" on public.liguey_applicant_insights as restrictive for select to authenticated using (private.is_liguey_manager(business_id))';
 end if;
end$$;


-- SOURCE: 20261116020225_company_worker_portal.sql SHA256: 60e77b3114102f59bd2d264f606422ac0e5ef0822d3a90b184139bde71c40c78
-- Business Kebu workforce operations; Liguey remains an optional recruiting app.
create or replace function private.company_role(p_business uuid)
returns text language sql stable security definer set search_path='' as $$
 select role from public.business_members where business_id=p_business and user_id=(select auth.uid()) and status='active';
$$;
revoke all on function private.company_role(uuid) from public,anon;
grant execute on function private.company_role(uuid) to authenticated;

create table public.company_projects(
 id uuid primary key,business_id uuid not null references public.businesses(id),title text not null check(char_length(trim(title)) between 1 and 160),
 description text not null default '' check(char_length(description)<=4000),status text not null default 'active' check(status in ('active','blocked','done','archived')),
 room_id uuid not null references public.rooms(id),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
 unique(business_id,id)
);
alter table public.workspace_items add constraint workspace_items_business_identity unique(business_id,id);
create table public.company_project_tasks(
 id uuid primary key, business_id uuid not null,project_id uuid not null,assignee_user_id uuid not null references auth.users(id),
 foreign key(business_id,project_id) references public.company_projects(business_id,id),
 foreign key(business_id,id) references public.workspace_items(business_id,id) on delete cascade
);
create table public.company_project_feedback(
 id uuid primary key,business_id uuid not null,project_id uuid not null,author_id uuid not null references auth.users(id),
 message text not null check(char_length(trim(message)) between 1 and 4000),created_at timestamptz not null default clock_timestamp(),
 foreign key(business_id,project_id) references public.company_projects(business_id,id)
);
create table public.company_project_resources(
 id uuid primary key,business_id uuid not null,project_id uuid not null,kind text not null check(kind in ('doc','sheet','slide')),
 resource_id uuid not null,label text not null check(char_length(trim(label)) between 1 and 160),created_by uuid not null references auth.users(id),
 foreign key(business_id,project_id) references public.company_projects(business_id,id),unique(project_id,kind,resource_id)
);
create table public.company_learning_modules(
 id uuid primary key,business_id uuid not null references public.businesses(id),title text not null check(char_length(trim(title)) between 1 and 160),
 lesson text not null check(char_length(trim(lesson)) between 1 and 20000),quiz jsonb not null check(jsonb_typeof(quiz)='array' and jsonb_array_length(quiz) between 1 and 10),
 pass_percent integer not null check(pass_percent between 1 and 100),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),unique(business_id,id)
);
create table public.company_learning_assignments(
 business_id uuid not null,module_id uuid not null,user_id uuid not null references auth.users(id),assigned_at timestamptz not null default clock_timestamp(),
 primary key(module_id,user_id),foreign key(business_id,module_id) references public.company_learning_modules(business_id,id)
);
create table public.company_learning_attempts(
 id uuid primary key,business_id uuid not null,module_id uuid not null,user_id uuid not null,answers jsonb not null,
 score integer not null check(score between 0 and 100),passed boolean not null,created_at timestamptz not null default clock_timestamp(),
 foreign key(module_id,user_id) references public.company_learning_assignments(module_id,user_id),
 foreign key(business_id,module_id) references public.company_learning_modules(business_id,id)
);
create table public.company_hr_requests(
 id uuid primary key,business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 category text not null check(category in ('time_off','pay','benefits','workplace','other')),
 message text not null check(char_length(trim(message)) between 1 and 4000),response text not null default '' check(char_length(response)<=4000),
 status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
);
create table public.company_shifts(
 id uuid primary key,business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 starts_at timestamptz not null,ends_at timestamptz not null,location text not null check(char_length(trim(location)) between 1 and 300),
 status text not null default 'scheduled' check(status in ('scheduled','cancelled')),created_by uuid not null references auth.users(id),
 check(ends_at>starts_at and ends_at<=starts_at+interval '24 hours')
);
create table public.company_benefits(
 id uuid primary key,business_id uuid not null references public.businesses(id),title text not null check(char_length(trim(title)) between 1 and 160),
 details text not null check(char_length(trim(details)) between 1 and 8000),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp()
);
create table public.company_pay_preferences(
 business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 method text not null check(method in ('bank','mobile_money','cash')),updated_at timestamptz not null default clock_timestamp(),primary key(business_id,user_id)
);
-- Employer-entered statements, never a money transfer or a tax calculation.
create table public.company_pay_statements(
 id uuid primary key,business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),
 period_start date not null,period_end date not null,currency text not null check(currency ~ '^[A-Z]{3}$'),
 gross_minor bigint not null check(gross_minor between 0 and 1000000000000),deductions_minor bigint not null,
 net_minor bigint not null,notes text not null default '' check(char_length(notes)<=2000),created_by uuid not null references auth.users(id),created_at timestamptz not null default clock_timestamp(),
 check(period_end>=period_start),check(deductions_minor>=0 and deductions_minor<=gross_minor),check(net_minor=gross_minor-deductions_minor),
 unique(business_id,user_id,period_start,period_end)
);
create index company_projects_business_idx on public.company_projects(business_id,created_at desc);
create index company_tasks_business_idx on public.company_project_tasks(business_id,assignee_user_id);
create index company_feedback_project_idx on public.company_project_feedback(business_id,project_id,created_at desc);
create index company_resources_project_idx on public.company_project_resources(business_id,project_id);
create index company_modules_business_idx on public.company_learning_modules(business_id);
create index company_assignments_person_idx on public.company_learning_assignments(business_id,user_id);
create index company_attempts_person_idx on public.company_learning_attempts(business_id,user_id,created_at desc);
create index company_hr_person_idx on public.company_hr_requests(business_id,user_id,created_at desc);
create index company_shifts_person_idx on public.company_shifts(business_id,user_id,starts_at);
create index company_benefits_business_idx on public.company_benefits(business_id,created_at desc);
create index company_statements_person_idx on public.company_pay_statements(business_id,user_id,period_end desc);

do $$ declare t text;begin
 foreach t in array array['company_projects','company_project_tasks','company_project_feedback','company_project_resources','company_learning_modules','company_learning_assignments','company_learning_attempts','company_hr_requests','company_shifts','company_benefits','company_pay_preferences','company_pay_statements'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy company_projects_read on public.company_projects for select to authenticated using(private.company_role(business_id) is not null);
create policy company_tasks_read on public.company_project_tasks for select to authenticated using(private.company_role(business_id) is not null);
create policy company_feedback_read on public.company_project_feedback for select to authenticated using(private.company_role(business_id) is not null);
create policy company_resources_read on public.company_project_resources for select to authenticated using(private.company_role(business_id) is not null);
-- Answer keys are visible only to authorized module authors/managers, never through employee table access.
create policy company_modules_read on public.company_learning_modules for select to authenticated using(private.company_role(business_id) in ('founder','administrator','manager','store_manager'));
create policy company_assignments_read on public.company_learning_assignments for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','manager','store_manager')));
create policy company_attempts_read on public.company_learning_attempts for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','manager','store_manager')));
create policy company_hr_read on public.company_hr_requests for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator')));
create policy company_shifts_read on public.company_shifts for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','manager','store_manager')));
create policy company_benefits_read on public.company_benefits for select to authenticated using(private.company_role(business_id) is not null);
create policy company_preferences_read on public.company_pay_preferences for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','finance_manager')));
create policy company_statements_read on public.company_pay_statements for select to authenticated using(private.company_role(business_id) is not null and (user_id=auth.uid() or private.company_role(business_id) in ('founder','administrator','finance_manager')));

create or replace function public.company_learning_for_me(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.company_role(p_business) is null then raise exception 'Not allowed';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'lesson',m.lesson,'passPercent',m.pass_percent,
 'questions',(select jsonb_agg(jsonb_build_object('prompt',q->>'prompt','options',q->'options') order by ord) from jsonb_array_elements(m.quiz) with ordinality as qs(q,ord)),
 'passed',exists(select 1 from public.company_learning_attempts a where a.module_id=m.id and a.user_id=auth.uid() and a.passed)))
 from public.company_learning_assignments x join public.company_learning_modules m on m.id=x.module_id
 where x.business_id=p_business and x.user_id=auth.uid()),'[]'::jsonb);
end $$;
revoke all on function public.company_learning_for_me(uuid) from public,anon;
grant execute on function public.company_learning_for_me(uuid) to authenticated;

-- Scoped command boundary. Tables are read-only through the Data API; every mutation
-- validates current company membership, role and resource identity in this transaction.
create or replace function public.company_portal_action(p_business uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();actor_role text:=private.company_role(p_business);
 managed boolean:=actor_role in ('founder','administrator','manager','store_manager');
 hr boolean:=actor_role in ('founder','administrator');finance boolean:=actor_role in ('founder','administrator','finance_manager');
 target uuid;command_id uuid;project public.company_projects%rowtype;module public.company_learning_modules%rowtype;
 question jsonb;answer integer;correct integer:=0;score integer;i integer;existing jsonb;starts timestamptz;ends timestamptz;
begin
 if actor is null or actor_role is null then raise exception 'Not allowed' using errcode='42501';end if;
 if p_data is null or octet_length(p_data::text)>200000 or jsonb_typeof(p_data)<>'object' then raise exception 'Invalid request';end if;
 command_id:=(p_data->>'id')::uuid;
 -- Retry the identical command once only: receipt stores an input fingerprint and result.
 if command_id is null then raise exception 'A request id is required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':'||actor::text||':'||command_id::text,0));
 select result into existing from private.company_command_receipts where business_id=p_business and user_id=actor and request_id=command_id and action=p_action and payload=p_data;
 if found then return existing;end if;
 if exists(select 1 from private.company_command_receipts where business_id=p_business and user_id=actor and request_id=command_id) then raise exception 'Request id was reused for different work';end if;
 if p_action in ('project_create','project_status','task_create','module_create','module_assign','shift_create','shift_cancel','benefit_create') and not managed then raise exception 'Manager access required' using errcode='42501';end if;
 if p_action='hr_reply' and not hr then raise exception 'HR access required' using errcode='42501';end if;
 if p_action='statement_create' and not finance then raise exception 'Finance access required' using errcode='42501';end if;
 if p_action in ('task_create','feedback_create','doc_create','resource_attach','project_status') then
  select * into project from public.company_projects where id=(p_data->>'projectId')::uuid and business_id=p_business for update;
  if not found or project.status='archived' then raise exception 'Project is unavailable';end if;
 end if;
 if p_action in ('task_create','module_assign','shift_create','statement_create') then
  target:=(p_data->>'userId')::uuid;
  perform 1 from public.business_members where business_id=p_business and user_id=target and status='active' for share;
  if not found then raise exception 'Choose an active member of this company';end if;
 end if;
 case p_action
 when 'project_create' then
  insert into public.rooms(id,created_by,business_id,name,room_type) values(command_id,actor,p_business,left(p_data->>'title',100),'project');
  insert into public.company_projects(id,business_id,title,description,room_id,created_by) values(command_id,p_business,trim(p_data->>'title'),coalesce(p_data->>'description',''),command_id,actor);
  insert into public.room_members(room_id,user_id,role) select command_id,user_id,'member' from public.business_members where business_id=p_business and status='active' on conflict do nothing;
 when 'project_status' then
  if project.status is distinct from p_data->>'expectedStatus' then raise exception 'Project changed. Reload before updating.';end if;
  update public.company_projects set status=p_data->>'status' where id=project.id;
 when 'task_create' then
  insert into public.workspace_items(id,owner_id,business_id,kind,title,body,status,due_at,visibility)
  values(command_id,actor,p_business,'task',trim(p_data->>'title'),coalesce(p_data->>'body',''),'open',(p_data->>'dueAt')::timestamptz,'team');
  insert into public.company_project_tasks(id,business_id,project_id,assignee_user_id) values(command_id,p_business,project.id,target);
 when 'task_status' then
  perform 1 from public.company_project_tasks t where t.id=(p_data->>'taskId')::uuid and t.business_id=p_business;
  if not found then raise exception 'Task not found';end if;
  if p_data->>'status' not in ('open','done') then raise exception 'Invalid task status';end if;
  update public.workspace_items set status=p_data->>'status',updated_at=clock_timestamp() where id=(p_data->>'taskId')::uuid and business_id=p_business;
 when 'feedback_create' then
  insert into public.company_project_feedback(id,business_id,project_id,author_id,message) values(command_id,p_business,project.id,actor,trim(p_data->>'message'));
 when 'doc_create' then
  insert into public.workspace_items(id,owner_id,business_id,kind,title,body,status,visibility) values(command_id,actor,p_business,'doc',trim(p_data->>'title'),'','draft','team');
  insert into public.company_project_resources(id,business_id,project_id,kind,resource_id,label,created_by) values(command_id,p_business,project.id,'doc',command_id,trim(p_data->>'title'),actor);
 when 'resource_attach' then
  target:=(p_data->>'resourceId')::uuid;
  if p_data->>'kind'='doc' then
   perform 1 from public.workspace_items where id=target and business_id=p_business and kind='doc' and visibility='team';
  elsif p_data->>'kind' in ('sheet','slide') then
   perform 1 from public.library_nodes n where n.id=target and n.kind=p_data->>'kind' and n.trashed_at is null
   and (n.owner_id=actor or exists(select 1 from public.library_shares s where s.node_id=n.id and s.shared_with_user_id=actor));
  else raise exception 'Unsupported resource';end if;
  if not found then raise exception 'You cannot attach this resource';end if;
  insert into public.company_project_resources(id,business_id,project_id,kind,resource_id,label,created_by)
   values(command_id,p_business,project.id,p_data->>'kind',target,trim(p_data->>'label'),actor);
 when 'module_create' then
  if jsonb_typeof(p_data->'quiz')<>'array' or jsonb_array_length(p_data->'quiz') not between 1 and 10 then raise exception 'Add 1–10 questions';end if;
  for question in select * from jsonb_array_elements(p_data->'quiz') loop
   if coalesce(char_length(trim(question->>'prompt')),0) not between 1 and 500 or jsonb_typeof(question->'options')<>'array'
   or jsonb_array_length(question->'options') not between 2 and 6 or jsonb_typeof(question->'correctIndex')<>'number' then raise exception 'Invalid quiz question';end if;
   answer:=(question->>'correctIndex')::integer;
   if answer<0 or answer>=jsonb_array_length(question->'options') or exists(select 1 from jsonb_array_elements(question->'options') option where jsonb_typeof(option)<>'string' or char_length(trim(option#>>'{}')) not between 1 and 300) then raise exception 'Invalid quiz choices';end if;
  end loop;
  insert into public.company_learning_modules(id,business_id,title,lesson,quiz,pass_percent,created_by)
   values(command_id,p_business,trim(p_data->>'title'),p_data->>'lesson',p_data->'quiz',(p_data->>'passPercent')::integer,actor);
 when 'module_assign' then
  perform 1 from public.company_learning_modules where business_id=p_business and id=(p_data->>'moduleId')::uuid;
  if not found then raise exception 'Module not found';end if;
  insert into public.company_learning_assignments(business_id,module_id,user_id) values(p_business,(p_data->>'moduleId')::uuid,target) on conflict do nothing;
 when 'module_answer' then
  if p_data->'acknowledged' is distinct from 'true'::jsonb then raise exception 'Confirm that you reviewed the lesson';end if;
  select m.* into module from public.company_learning_modules m join public.company_learning_assignments x on x.module_id=m.id and x.user_id=actor
  where m.id=(p_data->>'moduleId')::uuid and m.business_id=p_business;
  if not found then raise exception 'Module not assigned to you';end if;
  if jsonb_typeof(p_data->'answers')<>'array' or jsonb_array_length(p_data->'answers')<>jsonb_array_length(module.quiz) then raise exception 'Answer every question';end if;
  for i in 0..jsonb_array_length(module.quiz)-1 loop
   if jsonb_typeof(p_data->'answers'->i)<>'number' then raise exception 'Invalid answer';end if;
   answer:=(p_data->'answers'->>i)::integer;
   if answer<0 or answer>=jsonb_array_length(module.quiz->i->'options') then raise exception 'Invalid answer';end if;
   if answer=(module.quiz->i->>'correctIndex')::integer then correct:=correct+1;end if;
  end loop;
  score:=floor(correct*100.0/jsonb_array_length(module.quiz));
  insert into public.company_learning_attempts(id,business_id,module_id,user_id,answers,score,passed) values(command_id,p_business,module.id,actor,p_data->'answers',score,score>=module.pass_percent);
 when 'hr_create' then
  insert into public.company_hr_requests(id,business_id,user_id,category,message) values(command_id,p_business,actor,p_data->>'category',trim(p_data->>'message'));
 when 'hr_reply' then
  update public.company_hr_requests set response=trim(p_data->>'response'),status=p_data->>'status',updated_at=clock_timestamp()
  where id=(p_data->>'requestId')::uuid and business_id=p_business and updated_at=(p_data->>'expectedUpdatedAt')::timestamptz;
  if not found then raise exception 'HR request not found';end if;
 when 'shift_create' then
  starts:=(p_data->>'startsAt')::timestamptz;ends:=(p_data->>'endsAt')::timestamptz;
  perform pg_advisory_xact_lock(hashtextextended('liguey-interview:'||target::text,0));
  perform pg_advisory_xact_lock(hashtextextended(p_business::text||':shift:'||target::text,0));
  if exists(select 1 from public.liguey_interviews where status in ('proposed','accepted') and starts_at<ends and ends_at>starts and(candidate_id=target or interviewer_id=target)) then raise exception 'This member already has a commitment at that time';end if;
  if exists(select 1 from public.company_shifts where business_id=p_business and user_id=target and status='scheduled' and starts_at<ends and ends_at>starts) then raise exception 'This member already has a shift at that time';end if;
  insert into public.company_shifts(id,business_id,user_id,starts_at,ends_at,location,created_by) values(command_id,p_business,target,starts,ends,trim(p_data->>'location'),actor);
 when 'shift_cancel' then
  update public.company_shifts set status='cancelled' where id=(p_data->>'shiftId')::uuid and business_id=p_business;
  if not found then raise exception 'Shift not found';end if;
 when 'benefit_create' then
  insert into public.company_benefits(id,business_id,title,details,created_by) values(command_id,p_business,trim(p_data->>'title'),trim(p_data->>'details'),actor);
 when 'pay_preference' then
  insert into public.company_pay_preferences(business_id,user_id,method) values(p_business,actor,p_data->>'method')
  on conflict(business_id,user_id) do update set method=excluded.method,updated_at=clock_timestamp();
 when 'member_remove' then
  if not hr then raise exception 'Administrator access required' using errcode='42501';end if;
  target:=(p_data->>'userId')::uuid;
  if target=actor then raise exception 'You cannot remove your own access here';end if;
  update public.business_members set status='removed',updated_at=clock_timestamp() where business_id=p_business and user_id=target and status='active' and role<>'founder';
  if not found then raise exception 'Member cannot be removed';end if;
  update public.business_invites set status='revoked' where business_id=p_business and status='pending' and lower(email)=(select lower(email) from auth.users where id=target);
 when 'statement_create' then
  insert into public.company_pay_statements(id,business_id,user_id,period_start,period_end,currency,gross_minor,deductions_minor,net_minor,notes,created_by)
  values(command_id,p_business,target,(p_data->>'periodStart')::date,(p_data->>'periodEnd')::date,p_data->>'currency',(p_data->>'grossMinor')::bigint,(p_data->>'deductionsMinor')::bigint,(p_data->>'netMinor')::bigint,coalesce(p_data->>'notes',''),actor);
 else raise exception 'Unsupported company action';
 end case;
 existing:=jsonb_build_object('ok',true,'id',command_id,'score',score);
 insert into private.company_command_receipts(business_id,user_id,request_id,action,payload,result) values(p_business,actor,command_id,p_action,p_data,existing);
 insert into public.business_audit_logs(business_id,actor_user_id,action,metadata) values(p_business,actor,'company.'||p_action,jsonb_build_object('requestId',command_id));
 return existing;
end $$;
create table private.company_command_receipts(
 business_id uuid not null references public.businesses(id),user_id uuid not null references auth.users(id),request_id uuid not null,
 action text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(business_id,user_id,request_id)
);
revoke all on private.company_command_receipts from public,anon,authenticated;
revoke all on function public.company_portal_action(uuid,text,jsonb) from public,anon;
grant execute on function public.company_portal_action(uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';

-- A former employee cannot keep a company room through its creator/member shortcut.
create or replace function public.can_access_room(p_room_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and r.archived_at is null
 and (r.created_by=auth.uid() or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=auth.uid()))
 and (r.business_id is null or private.company_role(r.business_id) is not null));
$$;
create policy "Company membership required for company rooms" on public.rooms as restrictive for all to authenticated
using(business_id is null or private.company_role(business_id) is not null)
with check(business_id is null or private.company_role(business_id) is not null);
create or replace function private.sync_company_membership_access()
returns trigger language plpgsql security definer set search_path='' as $$
declare b uuid:=coalesce(new.business_id,old.business_id);u uuid:=coalesce(new.user_id,old.user_id);
begin
 if tg_op<>'DELETE' and new.status='active' then
  insert into public.room_members(room_id,user_id,role)
   select room_id,u,'member' from public.company_projects where business_id=b and status<>'archived'
   on conflict(room_id,user_id) do nothing;
 else
  delete from public.room_members m using public.rooms r where m.room_id=r.id and r.business_id=b and m.user_id=u;
  update public.room_call_participants p set left_at=clock_timestamp() from public.room_calls c join public.rooms r on r.id=c.room_id
   where p.call_id=c.id and r.business_id=b and p.user_id=u and p.left_at is null;
  -- Keep the durable CRDT history, rotate its private-channel epoch. Other clients
  -- must reauthorize before sharing more edits; their local conflict recovery stays intact.
  update public.workspace_items set collab_epoch=gen_random_uuid() where business_id=b and kind='doc' and collab_state is not null;
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
revoke all on function private.sync_company_membership_access() from public,anon,authenticated;
create trigger company_membership_access_sync after insert or update of status or delete on public.business_members
for each row execute function private.sync_company_membership_access();

create or replace function public.company_roster(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.company_role(p_business) is null then raise exception 'Not allowed';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'role',m.role,'name',coalesce(nullif(p.name,''),'Team member'),'kebuId',null::text))
 from public.business_members m left join public.user_profiles p on p.id=m.user_id where m.business_id=p_business and m.status='active'),'[]'::jsonb);
end $$;
revoke all on function public.company_roster(uuid) from public,anon;
grant execute on function public.company_roster(uuid) to authenticated;

create or replace function public.company_portfolio()
returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',coalesce(b.trading_name,b.legal_name),'kebuId',b.public_kebu_id,
 'role',m.role,'activeProjects',(select count(*) from public.company_projects p where p.business_id=b.id and p.status in ('active','blocked')),
 'blockedProjects',(select count(*) from public.company_projects p where p.business_id=b.id and p.status='blocked'),
 'myOpenTasks',(select count(*) from public.company_project_tasks t join public.workspace_items w on w.id=t.id where t.business_id=b.id and t.assignee_user_id=auth.uid() and w.status='open'),
 'myOpenHR',(select count(*) from public.company_hr_requests h where h.business_id=b.id and h.user_id=auth.uid() and h.status='open'))),'[]'::jsonb)
 from public.business_members m join public.businesses b on b.id=m.business_id where m.user_id=auth.uid() and m.status='active';
$$;
revoke all on function public.company_portfolio() from public,anon;
grant execute on function public.company_portfolio() to authenticated;

create or replace function public.company_prepare_hire(p_application uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare application public.job_applications%rowtype;mail text;invitation public.business_invites%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into application from public.job_applications where id=p_application for update;
 if not found or application.status<>'accepted' or not private.is_liguey_manager(application.business_id)
 or not private.can_invite_business_role(application.business_id,'employee') or not private.employer_can_recruit(application.business_id)
 or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Accepted application and current employer access required';end if;
 select email into mail from auth.users where id=application.applicant_user_id and email_confirmed_at is not null;
 if mail is null then raise exception 'The applicant must confirm their account email';end if;
 insert into public.business_invites(business_id,email,role,token,invited_by)
 values(application.business_id,lower(mail),'employee',replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),auth.uid())
 on conflict(business_id,lower(email)) where status='pending' do nothing;
 select * into invitation from public.business_invites where business_id=application.business_id and lower(email)=lower(mail) and status='pending';
 if invitation.role<>'employee' or invitation.expires_at<=clock_timestamp() then raise exception 'Review or revoke the existing invitation first';end if;
 return jsonb_build_object('token',invitation.token,'expiresAt',invitation.expires_at);
end $$;
revoke all on function public.company_prepare_hire(uuid) from public,anon;
grant execute on function public.company_prepare_hire(uuid) to authenticated;


-- SOURCE: 20261116022036_liguey_interviews_and_reports.sql SHA256: ebfe9308a0db66a178ebd17fc5a3aac741980460d9d099a9be6035d63962e27b
create table public.liguey_interviews(
 id uuid primary key,business_id uuid not null references public.businesses(id),application_id uuid not null references public.job_applications(id),
 candidate_id uuid not null references auth.users(id),interviewer_id uuid not null references auth.users(id),
 kind text not null check(kind in ('online','office')),office_address text not null default '',
 starts_at timestamptz not null,ends_at timestamptz not null,room_id uuid references public.rooms(id),
 status text not null default 'proposed' check(status in ('proposed','accepted','declined','cancelled')),
 revision integer not null default 1,created_at timestamptz not null default clock_timestamp(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '4 hours'),
 check((kind='online' and room_id is not null and office_address='') or(kind='office' and room_id is null and char_length(office_address)>=10))
);
create index liguey_interviews_business_idx on public.liguey_interviews(business_id,starts_at);
create index liguey_interviews_candidate_idx on public.liguey_interviews(candidate_id,starts_at);
create index liguey_interviews_interviewer_idx on public.liguey_interviews(interviewer_id,starts_at);
alter table public.liguey_interviews enable row level security;
revoke all on public.liguey_interviews from public,anon,authenticated;
grant select on public.liguey_interviews to authenticated;
grant all on public.liguey_interviews to service_role;
create policy interviews_participants_read on public.liguey_interviews for select to authenticated
using(candidate_id=auth.uid() or private.is_liguey_manager(business_id));

create or replace function private.interview_current(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.liguey_interviews i join public.business_members m on m.business_id=i.business_id and m.user_id=i.interviewer_id
 join public.job_applications a on a.id=i.application_id
 where i.id=p_id and m.status='active' and m.role in ('founder','administrator','store_manager')
 and a.status in ('submitted','reviewed','accepted') and private.employer_can_recruit(i.business_id)
 and(i.kind='online' or exists(select 1 from public.business_employer_verifications v where v.business_id=i.business_id and v.office_checked and v.office_address=i.office_address)));
$$;
revoke all on function private.interview_current(uuid) from public,anon;
grant execute on function private.interview_current(uuid) to authenticated;
create or replace function public.liguey_interview_state(p_business uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_business is not null and not private.is_liguey_manager(p_business) then raise exception 'Not allowed';end if;
 return jsonb_build_object('interviews',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('currentReview',private.interview_current(i.id))) from public.liguey_interviews i where p_business is null or i.business_id=p_business),'[]'::jsonb),
 'applications',case when p_business is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'candidateId',a.applicant_user_id,'listingId',a.listing_id,'status',a.status)) from public.job_applications a where a.business_id=p_business and a.status in ('submitted','reviewed','accepted')),'[]'::jsonb) end);
end $$;
revoke all on function public.liguey_interview_state(uuid) from public,anon;
grant execute on function public.liguey_interview_state(uuid) to authenticated;

create or replace function public.liguey_propose_interview(p_id uuid,p_application uuid,p_start timestamptz,p_end timestamptz,p_kind text)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.job_applications%rowtype;v public.business_employer_verifications%rowtype;i public.liguey_interviews%rowtype;u uuid;room uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Add Liguey first';end if;
 select * into a from public.job_applications where id=p_application;
 if not found or a.status not in ('submitted','reviewed','accepted') or not private.is_liguey_manager(a.business_id) or not private.employer_can_recruit(a.business_id) then raise exception 'Current company/recruiter review and application access required';end if;
 if p_start<=clock_timestamp() or p_end<=p_start or p_end>p_start+interval '4 hours' or p_kind not in ('online','office') then raise exception 'Choose a future interview of up to four hours';end if;
 -- Consistent participant lock ordering serializes overlapping requests from different companies.
 for u in select x from unnest(array[auth.uid(),a.applicant_user_id]) x order by x loop perform pg_advisory_xact_lock(hashtextextended('liguey-interview:'||u::text,0));end loop;
 select * into i from public.liguey_interviews where id=p_id;
 if found then
  if i.application_id=p_application and i.interviewer_id=auth.uid() and i.starts_at=p_start and i.ends_at=p_end and i.kind=p_kind then return p_id;end if;
  raise exception 'Interview request id was reused';
 end if;
 if exists(select 1 from public.liguey_interviews where status in ('proposed','accepted') and starts_at<p_end and ends_at>p_start and(candidate_id in(auth.uid(),a.applicant_user_id) or interviewer_id in(auth.uid(),a.applicant_user_id)))
 or exists(select 1 from public.company_shifts where status='scheduled' and user_id in(auth.uid(),a.applicant_user_id) and starts_at<p_end and ends_at>p_start) then raise exception 'A participant already has a commitment at this time';end if;
 select * into v from public.business_employer_verifications where business_id=a.business_id;
 if p_kind='office' and(not v.office_checked or char_length(trim(v.office_address))<10) then raise exception 'A reviewed office is required for an in-person interview';end if;
 if p_kind='online' then
  room:=p_id;insert into public.rooms(id,created_by,name,room_type) values(room,auth.uid(),'Private Liguey interview','client');
 end if;
 insert into public.liguey_interviews(id,business_id,application_id,candidate_id,interviewer_id,kind,office_address,starts_at,ends_at,room_id)
 values(p_id,a.business_id,a.id,a.applicant_user_id,auth.uid(),p_kind,case when p_kind='office' then v.office_address else '' end,p_start,p_end,room);
 insert into public.business_audit_logs(business_id,actor_user_id,action,metadata) values(a.business_id,auth.uid(),'liguey.interview_proposed',jsonb_build_object('interviewId',p_id));
 return p_id;
end $$;
revoke all on function public.liguey_propose_interview(uuid,uuid,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.liguey_propose_interview(uuid,uuid,timestamptz,timestamptz,text) to authenticated;

create table public.liguey_interview_calendar(interview_id uuid not null references public.liguey_interviews(id),user_id uuid not null references auth.users(id),item_id uuid not null references public.workspace_items(id),primary key(interview_id,user_id));
alter table public.liguey_interview_calendar enable row level security;
revoke all on public.liguey_interview_calendar from public,anon,authenticated;
create or replace function public.liguey_respond_interview(p_id uuid,p_revision integer,p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
declare i public.liguey_interviews%rowtype;u uuid;item uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into i from public.liguey_interviews where id=p_id for update;
 if not found or not(i.candidate_id=auth.uid() or private.is_liguey_manager(i.business_id)) then raise exception 'Not allowed';end if;
 if i.revision<>p_revision then return false;end if;
 if p_status in ('accepted','declined') then
  if i.candidate_id<>auth.uid() or i.status<>'proposed' then raise exception 'Only this candidate can answer a pending invitation';end if;
  if p_status='accepted' and(not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') or not private.interview_current(i.id) or i.starts_at<=clock_timestamp()) then raise exception 'Interview review changed or its time passed';end if;
 elsif p_status='cancelled' then
  if i.status not in ('proposed','accepted') then return false;end if;
 else raise exception 'Invalid interview response';end if;
 update public.liguey_interviews set status=p_status,revision=revision+1 where id=i.id;
 if p_status='accepted' then
  if i.room_id is not null then insert into public.room_members(room_id,user_id,role)values(i.room_id,i.candidate_id,'member') on conflict do nothing;end if;
  foreach u in array array[i.candidate_id,i.interviewer_id] loop
   item:=gen_random_uuid();insert into public.workspace_items(id,owner_id,kind,title,body,status,start_at,end_at,visibility)
    values(item,u,'event','Liguey interview',case when i.kind='online' then 'Private interview room: /rooms/'||i.room_id::text else 'Reviewed office: '||i.office_address end,'open',i.starts_at,i.ends_at,'private');
   insert into public.liguey_interview_calendar values(i.id,u,item);
  end loop;
 else
  if i.room_id is not null then
   update public.rooms set archived_at=clock_timestamp() where id=i.room_id;
   update public.room_calls set ended_at=clock_timestamp() where room_id=i.room_id and ended_at is null;
  end if;
  update public.workspace_items w set title='Cancelled: Liguey interview',status='done' from public.liguey_interview_calendar c where c.item_id=w.id and c.interview_id=i.id;
 end if;
 return true;
end $$;
revoke all on function public.liguey_respond_interview(uuid,integer,text) from public,anon;
grant execute on function public.liguey_respond_interview(uuid,integer,text) to authenticated;

-- A live interview also loses room access when registration, recruiter authority,
-- consent or application status changes. Existing media clients recheck periodically.
create or replace function public.can_access_room(p_room_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and r.archived_at is null
 and (r.created_by=auth.uid() or exists(select 1 from public.room_members m where m.room_id=r.id and m.user_id=auth.uid()))
 and (r.business_id is null or private.company_role(r.business_id) is not null)
 and not exists(select 1 from public.liguey_interviews i where i.room_id=r.id and (i.status<>'accepted' or not private.interview_current(i.id))));
$$;
create table public.liguey_safety_reports(
 id uuid primary key,business_id uuid not null references public.businesses(id),author_id uuid not null references auth.users(id),
 message text not null check(char_length(trim(message)) between 10 and 4000),created_at timestamptz not null default clock_timestamp()
);
create index liguey_reports_business_idx on public.liguey_safety_reports(business_id,created_at desc);
alter table public.liguey_safety_reports enable row level security;
revoke all on public.liguey_safety_reports from public,anon,authenticated;
grant select on public.liguey_safety_reports to authenticated;grant all on public.liguey_safety_reports to service_role;
create policy safety_report_author_read on public.liguey_safety_reports for select to authenticated using(author_id=auth.uid());
create or replace function public.liguey_report_company(p_id uuid,p_business uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.kebu_builtin_app_installs where user_id=auth.uid() and app_key='liguey') then raise exception 'Add Liguey first';end if;
 insert into public.liguey_safety_reports(id,business_id,author_id,message) values(p_id,p_business,auth.uid(),trim(p_message)) on conflict do nothing;
 if not exists(select 1 from public.liguey_safety_reports where id=p_id and business_id=p_business and author_id=auth.uid() and message=trim(p_message)) then raise exception 'Report id was reused';end if;
 return p_id;
end $$;
revoke all on function public.liguey_report_company(uuid,uuid,text) from public,anon;
grant execute on function public.liguey_report_company(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';


-- SOURCE: 20261116022755_business_name_shortlists.sql SHA256: a167291e9f37d34e5b12bdbb00ee3cfe0916ae424c39f8ec2975ad076788011b
-- Private naming research, distinct from government registration or trademark clearance.
create table public.business_name_shortlists(
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 name text not null check(char_length(trim(name)) between 2 and 120),country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 goods_services text not null check(char_length(trim(goods_services)) between 2 and 1000),
 created_at timestamptz not null default clock_timestamp()
);
create index business_name_shortlists_user_idx on public.business_name_shortlists(user_id,created_at desc);
alter table public.business_name_shortlists enable row level security;
revoke all on public.business_name_shortlists from public,anon,authenticated;
grant select,insert,delete on public.business_name_shortlists to authenticated;
create policy naming_own_read on public.business_name_shortlists for select to authenticated using(user_id=(select auth.uid()));
create policy naming_own_add on public.business_name_shortlists for insert to authenticated with check(user_id=(select auth.uid()));
create policy naming_own_remove on public.business_name_shortlists for delete to authenticated using(user_id=(select auth.uid()));


-- SOURCE: ../rollouts/company-notifications.sql SHA256: dad6de46da8549f3f90c0ad8b9961e4b46cbf725711d28d7b11efb1e365c10cd
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
$payload$;
end $converge$;

do $permissions$declare t text;begin foreach t in array array['workspace_items','space_channels','space_messages','rooms','room_members','room_posts','room_links','room_decisions','room_files','library_nodes','library_shares','worker_profiles','worker_profile_evidence','job_listings','job_applications','liguey_applicant_insights','liguey_ai_usage','liguey_company_reviews','kebu_builtin_app_installs','kebu_friends_profiles','sheet_bodies','slide_bodies','room_calls','room_call_participants','cloud_storage_buckets','cloud_storage_files','cloud_deployments','cloud_deployment_versions','business_employer_verifications','employer_review_events','company_projects','company_project_tasks','company_project_feedback','company_project_resources','company_learning_modules','company_learning_assignments','company_learning_attempts','company_hr_requests','company_shifts','company_benefits','company_pay_preferences','company_pay_statements','liguey_interviews','liguey_interview_calendar','liguey_safety_reports','business_name_shortlists','user_notifications'] loop
 execute format('revoke all on public.%I from public,anon',t);
 execute format('revoke truncate,references,trigger on public.%I from authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop;end $permissions$;
grant select,insert,update,delete on public.workspace_items,public.space_channels,public.space_messages,public.rooms,public.room_members,public.room_posts,public.room_links,public.room_decisions,public.room_files to authenticated;
revoke all on public.business_invites from public,anon;
revoke truncate,references,trigger on public.business_invites from authenticated;

create or replace function public.company_roster(p_business uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or private.company_role(p_business) is null then raise exception 'Not allowed';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'role',m.role,'name',coalesce(nullif(p.name,''),'Team member'),'kebuId',null::text))
 from public.business_members m left join public.user_profiles p on p.id=m.user_id where m.business_id=p_business and m.status='active'),'[]'::jsonb);
end $$;
revoke all on function public.company_roster(uuid) from public,anon;
grant execute on function public.company_roster(uuid) to authenticated;

-- Parent-room locking covers first join and last leave. Never delete duplicate history.
create unique index if not exists room_calls_one_active_per_room on public.room_calls(room_id) where ended_at is null;
-- Let the call's starter pick a cap within the existing 2-8 range, instead
-- of every call silently defaulting to the ceiling with no way to choose
-- smaller. The default itself stays 8 (an explicit product decision, not an
-- oversight - see lib/rooms/call-mesh.ts's DEFAULT_MESH_PARTICIPANTS comment
-- for the mobile-bandwidth tradeoff that was weighed and kept): whoever
-- wants a smaller, more reliable call on a weak connection can now ask for
-- one via the size picker, without changing what happens when nobody asks.
create or replace function public.room_call_join(p_room uuid, p_max_participants int default 8)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  call_row public.room_calls%rowtype;
  active_count int;
  requested_cap int;
  is_new_call boolean;
begin
  if actor is null then return null; end if;
  perform 1 from public.rooms where id=p_room for update;
  if not found or not public.can_access_room(p_room) then return null; end if;

  select * into call_row from public.room_calls
    where room_id = p_room and ended_at is null
    order by started_at desc limit 1 for update;
  is_new_call := not found;

  if is_new_call then
    -- Clamp rather than reject: a caller-supplied value outside the table's
    -- own check constraint just gets pulled back into range instead of
    -- failing the whole join, since the UI already only offers in-range
    -- choices and this is a floor/ceiling, not a validation surface.
    requested_cap := least(greatest(coalesce(p_max_participants, 8), 2), 8);
    insert into public.room_calls(room_id, started_by, max_participants)
      values (p_room, actor, requested_cap)
      returning * into call_row;
  end if;

  select count(*) into active_count from public.room_call_participants
    where call_id = call_row.id and left_at is null and user_id <> actor;
  if active_count >= call_row.max_participants then
    raise exception 'Call is full';
  end if;

  insert into public.room_call_participants(call_id, user_id)
    values (call_row.id, actor)
    on conflict (call_id, user_id) do update
      set joined_at = case when public.room_call_participants.left_at is not null then now()
                           else public.room_call_participants.joined_at end,
          left_at = null;

  return jsonb_build_object(
    'id', call_row.id, 'roomId', call_row.room_id, 'startedAt', call_row.started_at,
    'maxParticipants', call_row.max_participants, 'created', is_new_call
  );
end;
$$;
revoke all on function public.room_call_join(uuid, int) from public, anon;
grant execute on function public.room_call_join(uuid, int) to authenticated;

create or replace function public.room_call_leave(p_call uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  remaining int;
  call_room uuid;
begin
  if actor is null then return null; end if;
  select room_id into call_room from public.room_calls where id = p_call;
  if call_room is null then return null; end if;
  perform 1 from public.rooms where id=call_room for update;
  if not public.can_access_room(call_room) then return null; end if;
  perform 1 from public.room_calls where id=p_call for update;

  update public.room_call_participants set left_at = now()
    where call_id = p_call and user_id = actor and left_at is null;

  select count(*) into remaining from public.room_call_participants
    where call_id = p_call and left_at is null;
  if remaining = 0 then
    update public.room_calls set ended_at = coalesce(ended_at, now()) where id = p_call;
  end if;
  return jsonb_build_object('left', true, 'ended', remaining = 0);
end;
$$;
revoke all on function public.room_call_leave(uuid) from public, anon;
grant execute on function public.room_call_leave(uuid) to authenticated;

notify pgrst,'reload schema';
