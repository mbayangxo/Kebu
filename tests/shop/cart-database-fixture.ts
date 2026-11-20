import {readFileSync} from "node:fs";

export const project="00000000-0000-4000-8000-000000000001",first="00000000-0000-4000-8000-000000000002",second="00000000-0000-4000-8000-000000000003";
export const attempt="00000000-0000-4000-8000-000000000004";
export const discount="00000000-0000-4000-8000-000000000005",gift="00000000-0000-4000-8000-000000000006";
const sql=(path:string)=>readFileSync(path,"utf8");

export async function setupCartDatabase(db: {exec: (sql: string) => Promise<unknown>}) {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$select null::uuid$$;
      CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at:=now(); RETURN NEW; END$$;
      CREATE TABLE projects(id uuid primary key, owner_id uuid);
      CREATE TABLE project_products(id uuid primary key, project_id uuid, is_active boolean, track_stock boolean, stock_qty integer, updated_at timestamptz, has_variants boolean default false);
      CREATE TABLE project_product_variants(id uuid primary key, project_id uuid, product_id uuid, is_active boolean, stock_qty integer);
      CREATE TABLE shop_discount_codes(id uuid primary key, project_id uuid, code text, percent_off integer,is_active boolean,starts_at timestamptz,ends_at timestamptz,max_uses integer,uses_count integer,updated_at timestamptz);
      CREATE TABLE shop_gift_cards(id uuid primary key,project_id uuid,code text,balance_xof integer,status text,expires_at timestamptz,updated_at timestamptz);
      INSERT INTO projects VALUES ('${project}',NULL);
      INSERT INTO project_products VALUES ('${first}','${project}',true,true,5,NULL,false),('${second}','${project}',true,true,1,NULL,false);
      INSERT INTO shop_discount_codes VALUES ('${discount}','${project}','SAVE',10,true,NULL,NULL,1,0,NULL);
      INSERT INTO shop_gift_cards VALUES ('${gift}','${project}','GIFT',100,'active',NULL,NULL);
    `);
    await db.exec(sql("supabase/migrations_archive/legacy/039_shop_orders.sql"));
    await db.exec(sql("supabase/migrations_archive/legacy/046_shop_cart_order_items.sql"));
    await db.exec(`ALTER TABLE shop_orders ADD order_number text, ADD gift_public_id text,
      ADD discount_code text,ADD discount_percent integer,ADD gift_card_code text,ADD gift_card_amount_xof integer;
      ALTER TABLE shop_order_items ADD variant_id uuid, ADD variant_name text;
      GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO service_role;`);
    await db.exec(sql("supabase/migrations/20261106060000_restore_product_stock_atomic_functions.sql"));
    await db.exec(sql("supabase/migrations/20261120060705_shop_cart_atomic_order.sql"));
    await db.exec(sql("supabase/migrations/20261120202038_shop_cart_recovery.sql"));
}
