-- Kebu official business records + extended document types (gov + ECOWAS + Kebu record)

alter table public.business_documents drop constraint if exists business_documents_document_type_check;

alter table public.business_documents add constraint business_documents_document_type_check
  check (document_type in (
    'founder_id',
    'business_plan',
    'address_proof',
    'registration_form',
    'gov_rccm',
    'gov_tax_certificate',
    'ecowas_trade_packet',
    'kebu_official_record',
    'other'
  ));

create table if not exists public.business_kebu_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  record_version text not null,
  public_kebu_id text not null,
  snapshot jsonb not null,
  storage_path text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references auth.users(id) on delete restrict
);

create index if not exists business_kebu_records_public_id_idx on public.business_kebu_records (public_kebu_id);

alter table public.business_kebu_records enable row level security;

drop policy if exists "Members select business_kebu_records" on public.business_kebu_records;
create policy "Members select business_kebu_records"
  on public.business_kebu_records for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_kebu_records.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Founders upsert business_kebu_records" on public.business_kebu_records;
create policy "Founders upsert business_kebu_records"
  on public.business_kebu_records for insert
  with check (
    generated_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = business_kebu_records.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Founders update business_kebu_records" on public.business_kebu_records;
create policy "Founders update business_kebu_records"
  on public.business_kebu_records for update
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_kebu_records.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/html']
where id = 'business-documents';
