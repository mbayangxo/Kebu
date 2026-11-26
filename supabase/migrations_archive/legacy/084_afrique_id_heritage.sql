-- 084: Heritage notes for African ID verification
-- Stores ancestry/heritage data submitted with verification requests.

alter table public.afrique_ids
  add column if not exists heritage_notes jsonb default null,
  add column if not exists updated_at timestamptz default now();

comment on column public.afrique_ids.heritage_notes is
  'Ancestry data submitted during verification: type, country_of_origin, region, ethnic_group, etc.';
