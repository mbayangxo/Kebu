import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {expect,it} from "vitest";

const root=process.env.KEBU_LOCAL_PGLITE_ROOT;
import { setupCartDatabase, project, first, second, attempt, discount, gift } from "./cart-database-fixture";

it.skipIf(!root)("commits all cart writes together and makes an exact retry inert",async()=>{
  const {PGlite}=await import(pathToFileURL(resolve(root!,"dist/index.js")).href);
  const db=new PGlite();
  try{
    await setupCartDatabase(db);
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
    const recover = "select public.recover_shop_cart_attempt($1,$2) as result";
    expect((await db.query(recover,[project,attempt])).rows[0].result).toEqual({state:"saved",order_number:"TEST-1"});
    const closed = "00000000-0000-4000-8000-000000000010";
    expect((await db.query(recover,[project,closed])).rows[0].result).toEqual({state:"closed"});
    expect((await db.query(recover,[project,closed])).rows[0].result).toEqual({state:"closed"});
    await expect(db.query(query,[closed,...args.slice(1)])).rejects.toThrow(/Checkout attempt is closed/);

    // Aggregate stock and variant stock are distinct reservations. A failed
    // variant reservation rolls back an earlier product deduction.
    const variant = "00000000-0000-4000-8000-000000000011";
    const variantAttempt = "00000000-0000-4000-8000-000000000012";
    await db.exec(`UPDATE project_products SET has_variants=true WHERE id='${first}';
      INSERT INTO project_product_variants VALUES ('${variant}','${project}','${first}',true,1);`);
    const variantOrder = {...order,quantity:2,order_number:"VARIANT",gift_card_amount_xof:0};
    const variantLines = [{...lines[0],variant_id:variant}];
    const variantArgs = [variantAttempt,fingerprint,JSON.stringify(variantOrder),JSON.stringify(variantLines),null,null,null];
    await expect(db.query(query,variantArgs)).rejects.toThrow(/Insufficient variant stock/);
    expect(await stock()).toEqual([{stock_qty:3},{stock_qty:0}]);
    await expect(db.query(query,[...variantArgs.slice(0,3),JSON.stringify([lines[0]]),null,null,null])).rejects.toThrow(/Variant unavailable/);
    await db.exec(`UPDATE project_product_variants SET stock_qty=4 WHERE id='${variant}'`);
    const variantPlaced = (await db.query(query,variantArgs)).rows[0].result;
    expect(await stock()).toEqual([{stock_qty:1},{stock_qty:0}]);
    expect((await db.query("select stock_qty from project_product_variants")).rows).toEqual([{stock_qty:2}]);
    // Changing tracking settings after the sale must not change what gets restored.
    await db.exec(`UPDATE project_products SET track_stock=false WHERE id='${first}'`);
    const cancel = "select * from public.cancel_shop_order_atomic($1,$2)";
    expect((await db.query(cancel,[variantPlaced.id,project])).rows[0]).toMatchObject({ok:true,restored:true,already_cancelled:false});
    expect((await db.query(cancel,[variantPlaced.id,project])).rows[0]).toMatchObject({ok:true,restored:false,already_cancelled:true});
    expect(await stock()).toEqual([{stock_qty:3},{stock_qty:0}]);
    expect((await db.query("select stock_qty from project_product_variants")).rows).toEqual([{stock_qty:4}]);
    // Untracked product quantity is never restored via the legacy fallback.
    const untracked = (await db.query(query,["00000000-0000-4000-8000-000000000013",...variantArgs.slice(1)])).rows[0].result;
    await db.exec(`UPDATE project_products SET track_stock=true WHERE id='${first}'`);
    await db.query(cancel,[untracked.id,project]);
    expect(await stock()).toEqual([{stock_qty:3},{stock_qty:0}]);
    // Whole-cart totals can exceed the single-item 20-unit limit.
    await db.exec("UPDATE project_products SET stock_qty=100,has_variants=false");
    const large = (await db.query(query,["00000000-0000-4000-8000-000000000014",fingerprint,
      JSON.stringify({...variantOrder,quantity:30,order_number:"LARGE"}),
      JSON.stringify(lines.map(l=>({...l,quantity:15}))),null,null,null])).rows[0].result;
    expect(large).toMatchObject({order_number:"LARGE",replayed:false});
    expect(await stock()).toEqual([{stock_qty:85},{stock_qty:85}]);
    await db.query(cancel,[large.id,project]);
    expect(await stock()).toEqual([{stock_qty:100},{stock_qty:100}]);
    // A receipt from the previous migration lacks a snapshot and must retain
    // its legacy cancellation path rather than silently losing restored stock.
    const legacy = "00000000-0000-4000-8000-000000000015";
    await db.exec(`insert into shop_orders(id,project_id,product_id,product_name,quantity,customer_name,customer_phone)
      values('${legacy}','${project}','${first}','Legacy',1,'Fixture','00000000');
      insert into shop_cart_order_attempts(project_id,attempt_id,fingerprint,order_id,order_number)
      values('${project}','${legacy}','${fingerprint}','${legacy}','LEGACY');`);
    await db.query(cancel,[legacy,project]);
    expect(await stock()).toEqual([{stock_qty:101},{stock_qty:100}]);
    await db.exec("RESET ROLE; SET ROLE authenticated");
    await expect(db.query(recover,[project,attempt])).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from shop_cart_stock_reservations")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from shop_cart_closed_attempts")).rejects.toThrow(/permission denied/);
  }finally{await db.close();}
},20000);
