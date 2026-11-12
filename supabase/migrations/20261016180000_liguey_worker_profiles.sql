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
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
