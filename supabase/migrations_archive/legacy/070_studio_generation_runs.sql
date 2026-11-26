-- Studio S4: AI campaign generation history (prompt → design ids)
-- Depends on: create_designs (022 / 064)

create table if not exists public.studio_generation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(trim(prompt)) between 8 and 800),
  business_name text not null default '' check (char_length(business_name) <= 120),
  used_ai boolean not null default false,
  fallback boolean not null default false,
  design_ids uuid[] not null default '{}',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists studio_generation_runs_owner_idx
  on public.studio_generation_runs (owner_id, created_at desc);

alter table public.studio_generation_runs enable row level security;

drop policy if exists "Owners manage studio_generation_runs" on public.studio_generation_runs;
create policy "Owners manage studio_generation_runs"
  on public.studio_generation_runs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.studio_generation_runs to authenticated;
grant all on public.studio_generation_runs to service_role;
