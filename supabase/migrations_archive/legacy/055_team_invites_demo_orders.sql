-- 055 team invites + agency roles + shop demo orders channel
-- Apply after 054. Safe to re-run.

-- >>> Expand business_members roles (agency managers / creatives)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'business_members_role_check'
  ) then
    alter table public.business_members drop constraint business_members_role_check;
  end if;
  alter table public.business_members
    add constraint business_members_role_check
    check (role in (
      'founder', 'cofounder', 'beneficial_owner', 'director', 'administrator',
      'finance_manager', 'store_manager', 'manager', 'creative', 'developer',
      'designer', 'employee', 'accountant', 'legal_representative', 'viewer'
    ));
exception
  when duplicate_object then null;
end $$;

-- >>> Team invites (email + role + token; accept creates membership)
create table if not exists public.business_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  role text not null
    check (role in (
      'cofounder', 'administrator', 'finance_manager', 'store_manager',
      'manager', 'creative', 'developer', 'designer', 'employee',
      'accountant', 'legal_representative', 'viewer'
    )),
  token text not null check (char_length(trim(token)) between 24 and 80),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  message text not null default '' check (char_length(message) <= 400),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists business_invites_token_uidx
  on public.business_invites (token);

create unique index if not exists business_invites_pending_email_uidx
  on public.business_invites (business_id, lower(email))
  where status = 'pending';

create index if not exists business_invites_business_idx
  on public.business_invites (business_id, created_at desc);

alter table public.business_invites enable row level security;

drop policy if exists "Managers read business invites" on public.business_invites;
create policy "Managers read business invites"
  on public.business_invites for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  );

drop policy if exists "Managers write business invites" on public.business_invites;
create policy "Managers write business invites"
  on public.business_invites for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_invites.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'manager')
    )
  );

drop trigger if exists business_invites_set_updated_at on public.business_invites;
create trigger business_invites_set_updated_at
  before update on public.business_invites
  for each row execute function public.set_updated_at();

-- >>> Shop demo orders (merchant practice — not real customers)
alter table public.shop_orders
  add column if not exists is_demo boolean not null default false;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'shop_orders_channel_check'
  ) then
    alter table public.shop_orders drop constraint shop_orders_channel_check;
  end if;
  alter table public.shop_orders
    add constraint shop_orders_channel_check
    check (channel in ('whatsapp', 'demo', 'web'));
exception
  when duplicate_object then null;
end $$;

create index if not exists shop_orders_demo_idx
  on public.shop_orders (project_id, is_demo)
  where is_demo = true;

notify pgrst, 'reload schema';
