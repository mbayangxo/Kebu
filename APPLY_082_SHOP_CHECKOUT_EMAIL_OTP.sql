-- 082: shop checkout email OTP
-- Paste in Supabase SQL Editor after 081.

create table if not exists public.shop_checkout_email_otps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified_at timestamptz,
  proof_token text,
  proof_expires_at timestamptz,
  session_key text,
  created_at timestamptz not null default now()
);

create index if not exists shop_checkout_email_otps_lookup_idx
  on public.shop_checkout_email_otps (project_id, email, created_at desc);

create index if not exists shop_checkout_email_otps_proof_idx
  on public.shop_checkout_email_otps (project_id, proof_token)
  where proof_token is not null;

alter table public.shop_checkout_email_otps enable row level security;

revoke all on public.shop_checkout_email_otps from anon, authenticated;
grant all on public.shop_checkout_email_otps to service_role;

notify pgrst, 'reload schema';
