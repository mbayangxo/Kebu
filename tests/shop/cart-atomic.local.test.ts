import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {expect,it} from "vitest";

const root=process.env.KEBU_LOCAL_PGLITE_ROOT;
const project="00000000-0000-4000-8000-000000000001",first="00000000-0000-4000-8000-000000000002",second="00000000-0000-4000-8000-000000000003";
const attempt="00000000-0000-4000-8000-000000000004";
const discount="00000000-0000-4000-8000-000000000005",gift="00000000-0000-4000-8000-000000000006";
const sql=(path:string)=>readFileSync(path,"utf8");

it.skipIf(!root)("commits all cart writes together and makes an exact retry inert",async()=>{
  const {PGlite}=await import(pathToFileURL(resolve(root!,"dist/index.js")).href);
  const db=new PGlite();
  try{
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$select null::uuid$$;
      CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at:=now(); RETURN NEW; END$$;
      CREATE TABLE projects(id uuid primary key, owner_id uuid);
      CREATE TABLE project_products(id uuid primary key, project_id uuid, is_active boolean, track_stock boolean, stock_qty integer, updated_at timestamptz);
      CREATE TABLE project_product_variants(id uuid primary key, project_id uuid, product_id uuid, is_active boolean, stock_qty integer);
      CREATE TABLE shop_discount_codes(id uuid primary key, project_id uuid, code text, percent_off integer,is_active boolean,starts_at timestamptz,ends_at timestamptz,max_uses integer,uses_count integer,updated_at timestamptz);
      CREATE TABLE shop_gift_cards(id uuid primary key,project_id uuid,code text,balance_xof integer,status text,expires_at timestamptz,updated_at timestamptz);
      INSERT INTO projects VALUES ('${project}',NULL);
      INSERT INTO project_products VALUES ('${first}','${project}',true,true,5,NULL),('${second}','${project}',true,true,1,NULL);
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
    const query="select public.create_shop_cart_atomic($1,$2,$3,$4,$5,$6,$7,null) as result";
    const order={project_id:project,product_id:first,product_name:"Cart",quantity:3,customer_name:"Test Buyer",customer_phone:"00000000",
      status:"pending",order_number:"TEST-1",discount_code:"SAVE",discount_percent:10,gift_card_code:"GIFT",gift_card_amount_xof:50};
    const lines=[{product_id:first,quantity:2,product_name:"First",price_label:"100 XOF",sort_order:0},
      {product_id:second,quantity:1,product_name:"Second",price_label:"100 XOF",sort_order:1}];
    const fingerprint="a".repeat(64);
    const args=[attempt,fingerprint,JSON.stringify(order),JSON.stringify(lines),discount,gift,100];
    const stock=async()=>(await db.query("select stock_qty from project_products order by id")).rows;
    const counts=async()=>(await db.query("select (select count(*)::int from shop_orders) as orders,(select count(*)::int from shop_order_items) as items,(select uses_count from shop_discount_codes) as uses,(select balance_xof from shop_gift_cards) as credit")).rows[0];
    await db.exec("SET ROLE authenticated");
    await expect(db.query(query,args)).rejects.toThrow(/permission denied/);
    await db.exec("SET ROLE service_role");

    await expect(db.query(query,[...args.slice(0,2),JSON.stringify({...order,quantity:4}),JSON.stringify([lines[0],{...lines[1],quantity:2}]),...args.slice(4)])).rejects.toThrow(/Insufficient stock/);
    expect(await stock()).toEqual([{stock_qty:5},{stock_qty:1}]);
    // Reject the second order line after stock, credit and header work has already run.
    await expect(db.query(query,[...args.slice(0,3),JSON.stringify([lines[0],{...lines[1],price_label:"x".repeat(61)}]),...args.slice(4)])).rejects.toThrow(/check constraint/);
    expect(await stock()).toEqual([{stock_qty:5},{stock_qty:1}]);
    expect(await counts()).toEqual({orders:0,items:0,uses:0,credit:100});
    const placed=(await db.query(query,args)).rows[0].result;
    expect(placed).toMatchObject({order_number:"TEST-1",replayed:false});
    expect((await db.query(query,args)).rows[0].result).toEqual({id:placed.id,order_number:"TEST-1",replayed:true});
    await expect(db.query(query,[attempt,"b".repeat(64),...args.slice(2)])).rejects.toThrow(/Checkout details changed/);
    expect(await stock()).toEqual([{stock_qty:3},{stock_qty:0}]);
    expect(await counts()).toEqual({orders:1,items:2,uses:1,credit:50});
  }finally{await db.close();}
},20000);
