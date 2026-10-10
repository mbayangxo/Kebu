-- Preserve the balance account used by a checkout until its tender can be reconciled.
-- Deleting it must not silently erase the evidence needed for cancellation.
alter table public.shop_checkout_effects drop constraint shop_checkout_effects_gift_card_id_fkey;
alter table public.shop_checkout_effects add constraint shop_checkout_effects_gift_card_id_fkey
 foreign key(gift_card_id) references public.shop_gift_cards(id) on delete restrict;
create index shop_checkout_effects_project_idx on public.shop_checkout_effects(project_id);
create index shop_checkout_effects_discount_idx on public.shop_checkout_effects(discount_id);
create index shop_checkout_effects_gift_card_idx on public.shop_checkout_effects(gift_card_id);
create index shop_external_refund_receipts_project_idx on public.shop_external_refund_receipts(project_id);
create index shop_external_refund_receipts_recorder_idx on public.shop_external_refund_receipts(recorded_by);
