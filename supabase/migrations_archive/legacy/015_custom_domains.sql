-- Custom domains: connect real domains (Namecheap, etc.) to published Kebu sites

alter table public.site_domains
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'verified', 'failed')),
  add column if not exists is_primary boolean not null default false,
  add column if not exists dns_target text,
  add column if not exists provider text not null default 'manual'
    check (provider in ('manual', 'namecheap', 'kebu')),
  add column if not exists verified_at timestamptz,
  add column if not exists last_check_at timestamptz,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

-- Keep legacy verified flag in sync
update public.site_domains set status = 'verified', verified = true where verified = true and status = 'pending';

create index if not exists idx_site_domains_hostname_verified
  on public.site_domains (hostname)
  where status = 'verified';

create index if not exists idx_site_domains_project
  on public.site_domains (project_id);

drop policy if exists "Owners update domains" on public.site_domains;
create policy "Owners update domains"
  on public.site_domains for update
  using (
    exists (
      select 1 from public.projects p
      where p.id = site_domains.project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete domains" on public.site_domains;
create policy "Owners delete domains"
  on public.site_domains for delete
  using (
    exists (
      select 1 from public.projects p
      where p.id = site_domains.project_id and p.owner_id = auth.uid()
    )
  );

-- Service role reads verified hostnames for middleware routing (no anon access)
