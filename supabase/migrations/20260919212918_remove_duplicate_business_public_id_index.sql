-- Reconciled against the live Kebu database before application.
-- public_kebu_id already has a UNIQUE constraint-backed index:
-- businesses_public_kebu_id_key. Remove only the redundant duplicate.
drop index if exists public.businesses_public_kebu_id_uidx;
