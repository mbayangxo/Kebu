-- Business events: RSVP + ticketed shows for agencies (DkLNS) and any Kebu business.
-- Registrations never mark paid from the browser — owner or future webhook does.
-- Apply after businesses + set_updated_at exist.

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  public_id text not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 800),
  venue text not null default '' check (char_length(venue) <= 200),
  city text not null default '' check (char_length(city) <= 120),
  country_code text not null default '' check (char_length(country_code) <= 8),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Africa/Dakar',
  capacity int check (capacity is null or capacity > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled', 'completed')),
  mode text not null default 'rsvp'
    check (mode in ('rsvp', 'ticketed')),
  cover_image_url text,
  whatsapp_phone text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_events_public_id_uidx unique (public_id)
);

create index if not exists business_events_business_idx
  on public.business_events (business_id, starts_at desc);

create index if not exists business_events_status_idx
  on public.business_events (status, starts_at);

create table if not exists public.event_ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.business_events(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  price_xof int not null default 0 check (price_xof >= 0),
  capacity int check (capacity is null or capacity > 0),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists event_ticket_types_event_idx
  on public.event_ticket_types (event_id, sort_order);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.business_events(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  ticket_type_id uuid references public.event_ticket_types(id) on delete set null,
  guest_name text not null check (char_length(trim(guest_name)) between 1 and 80),
  guest_phone text not null check (char_length(trim(guest_phone)) between 5 and 24),
  guest_email text check (guest_email is null or guest_email ~* '^[^@]+@[^@]+\.[^@]+$'),
  quantity int not null default 1 check (quantity between 1 and 20),
  amount_xof int not null default 0 check (amount_xof >= 0),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'awaiting_payment', 'paid', 'waived', 'failed')),
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled', 'checked_in')),
  channel text not null default 'web'
    check (channel in ('web', 'whatsapp', 'offline_sync', 'manual')),
  note text not null default '' check (char_length(note) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_registrations_event_idx
  on public.event_registrations (event_id, created_at desc);

create index if not exists event_registrations_business_idx
  on public.event_registrations (business_id, created_at desc);

alter table public.business_events enable row level security;
alter table public.event_ticket_types enable row level security;
alter table public.event_registrations enable row level security;

drop policy if exists "Members read business events" on public.business_events;
create policy "Members read business events"
  on public.business_events for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_events.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Managers write business events" on public.business_events;
create policy "Managers write business events"
  on public.business_events for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_events.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_events.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Members read event ticket types" on public.event_ticket_types;
create policy "Members read event ticket types"
  on public.event_ticket_types for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = event_ticket_types.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Managers write event ticket types" on public.event_ticket_types;
create policy "Managers write event ticket types"
  on public.event_ticket_types for all
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = event_ticket_types.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = event_ticket_types.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

drop policy if exists "Members read event registrations" on public.event_registrations;
create policy "Members read event registrations"
  on public.event_registrations for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = event_registrations.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Managers update event registrations" on public.event_registrations;
create policy "Managers update event registrations"
  on public.event_registrations for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = event_registrations.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members m
      where m.business_id = event_registrations.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator', 'store_manager')
    )
  );

-- Public inserts go through service role API only (no anon insert policy).

drop trigger if exists business_events_set_updated_at on public.business_events;
create trigger business_events_set_updated_at
  before update on public.business_events
  for each row execute function public.set_updated_at();

drop trigger if exists event_registrations_set_updated_at on public.event_registrations;
create trigger event_registrations_set_updated_at
  before update on public.event_registrations
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
