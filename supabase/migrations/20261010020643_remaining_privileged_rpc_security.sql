-- Internal jobs/refunds/stock and auth trigger are not browser RPC endpoints.
do $security$
declare routine regprocedure;
begin
  for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.proname in
      ('claim_platform_jobs','create_shop_refund','complete_shop_refund','restore_product_stock_atomic','handle_new_user')
  loop
    execute format('revoke all on function %s from public, anon, authenticated',routine);
    execute format('grant execute on function %s to service_role',routine);
  end loop;
  -- Explicit pg_temp at the end prevents its implicit precedence for relations/types.
  for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.proname in
      ('update_updated_at','set_updated_at','kcd_order_key_valid','kcd_order_key_after','kcd_evenly_spaced_keys','kcd_bump_node_version','kcd_bump_layout_version','kcd__fail','kcd__read_path','kcd__write_path','kcd__parse_path','kcd__node','kcd__check_placement','kcd__slot','kcd__is_uuid','kcd__apply','kcd__composition','kcd__validate_page')
  loop
    execute format('alter function %s set search_path = public, pg_temp',routine);
  end loop;
end
$security$;
