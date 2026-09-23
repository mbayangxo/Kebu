-- African ID (AID): product rename from "Afrique ID".
-- Table `afrique_ids` kept for compatibility; public brand = African ID / AID.
-- Types: indigenous (Indigenous African person) | visitor.

alter table public.afrique_ids
  add column if not exists identity_type text not null default 'visitor';

alter table public.afrique_ids
  drop constraint if exists afrique_ids_identity_type_check;

alter table public.afrique_ids
  add constraint afrique_ids_identity_type_check
  check (identity_type in ('indigenous', 'visitor'));

-- Public IDs: legacy AFRI-… still valid; new allocations use AID-… (see app).
-- Slightly widen length check for AID-V-CC-01-XXXXXX style if used later.
alter table public.afrique_ids
  drop constraint if exists afrique_ids_public_afrique_id_check;

alter table public.afrique_ids
  add constraint afrique_ids_public_afrique_id_check
  check (char_length(public_afrique_id) between 12 and 28);

comment on table public.afrique_ids is
  'African ID (AID) — personal identity on Kebu (not Kebu ID / business). identity_type: indigenous|visitor.';

comment on column public.afrique_ids.identity_type is
  'indigenous = Indigenous African person; visitor = visitor / non-indigenous account type.';

comment on column public.afrique_ids.public_afrique_id is
  'Public African ID string. New: AID-{CC}-01-XXXXXX (legacy AFRI-… still accepted).';
