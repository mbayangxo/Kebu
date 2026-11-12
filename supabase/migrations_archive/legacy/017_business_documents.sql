-- Business registration documents — Supabase Storage + metadata (Slice: document upload)

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  document_type text not null check (document_type in (
    'founder_id',
    'business_plan',
    'address_proof',
    'registration_form',
    'other'
  )),
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  storage_path text not null unique,
  mime_type text not null check (char_length(trim(mime_type)) between 3 and 120),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists business_documents_biz_idx on public.business_documents (business_id, document_type);
create index if not exists business_documents_path_idx on public.business_documents (storage_path);

alter table public.business_documents enable row level security;

drop policy if exists "Members select business_documents" on public.business_documents;
create policy "Members select business_documents"
  on public.business_documents for select
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_documents.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists "Founders insert business_documents" on public.business_documents;
create policy "Founders insert business_documents"
  on public.business_documents for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.business_members m
      where m.business_id = business_documents.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

drop policy if exists "Founders delete business_documents" on public.business_documents;
create policy "Founders delete business_documents"
  on public.business_documents for delete
  using (
    exists (
      select 1 from public.business_members m
      where m.business_id = business_documents.business_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
    )
  );

-- Private bucket for business registration files (10 MB max enforced in app + column)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-documents',
  'business-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business doc members read" on storage.objects;
create policy "Business doc members read"
  on storage.objects for select
  using (
    bucket_id = 'business-documents'
    and auth.uid() is not null
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and (storage.foldername(name))[1] = m.business_id::text
    )
  );

drop policy if exists "Business doc founders upload" on storage.objects;
create policy "Business doc founders upload"
  on storage.objects for insert
  with check (
    bucket_id = 'business-documents'
    and auth.uid() is not null
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
        and (storage.foldername(name))[1] = m.business_id::text
    )
  );

drop policy if exists "Business doc founders delete" on storage.objects;
create policy "Business doc founders delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-documents'
    and auth.uid() is not null
    and exists (
      select 1 from public.business_members m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('founder', 'administrator')
        and (storage.foldername(name))[1] = m.business_id::text
    )
  );
