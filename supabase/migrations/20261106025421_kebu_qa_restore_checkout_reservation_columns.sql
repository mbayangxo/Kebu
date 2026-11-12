-- Restore columns expected by existing checkout reservation routines.
alter table public.shop_checkout_reservations
  add column if not exists project_id uuid,
  add column if not exists discount_id uuid references public.shop_discount_codes(id),
  add column if not exists committed_at timestamptz;
notify pgrst, 'reload schema';
