-- Application tracker
create table if not exists application_tracker (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete cascade,
  opportunity_id text not null,
  opportunity_title text not null,
  opportunity_type text not null,
  opportunity_country text not null,
  opportunity_amount bigint,
  opportunity_currency text default 'USD',
  status text not null default 'saved'
    check (status in ('saved', 'applying', 'submitted', 'won', 'rejected')),
  notes text,
  deadline date,
  saved_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists application_tracker_user_idx on application_tracker(user_id);
create index if not exists application_tracker_status_idx on application_tracker(status);

alter table application_tracker enable row level security;

create policy "Users manage their own tracked applications"
  on application_tracker for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger application_tracker_updated_at
  before update on application_tracker
  for each row execute function update_updated_at();

-- Watchlist alerts
create table if not exists watchlist_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete cascade,
  label text not null,
  countries text[] default '{}',
  sectors text[] default '{}',
  funding_types text[] default '{}',
  alert_enabled boolean default true,
  created_at timestamptz default now()
);

alter table watchlist_alerts enable row level security;

create policy "Users manage their own watchlist"
  on watchlist_alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Document vault (metadata — files stored in Supabase Storage bucket 'documents')
create table if not exists document_vault (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete cascade,
  document_type text not null check (document_type in (
    'ID', 'Passport', 'Business Registration', 'Tax Certificate',
    'Business Plan', 'Bank Statement', 'Certificate', 'Contract', 'Other'
  )),
  filename text not null,
  storage_path text not null,
  file_size_kb integer,
  uploaded_at timestamptz default now()
);

alter table document_vault enable row level security;

create policy "Users manage their own vault"
  on document_vault for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
