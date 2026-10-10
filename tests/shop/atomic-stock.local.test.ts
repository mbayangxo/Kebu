import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrementProductStock, decrementCartStock, restoreProductStock, isInStock } from "@/lib/shop/stock";
type Db = { exec(sql:string):Promise<unknown>; query<T>(sql:string,args?:unknown[]):Promise<{rows:T[]}>; close():Promise<void> };
let db:Db;
const a="a1000000-0000-4000-8000-000000000001", b="a1000000-0000-4000-8000-000000000002";
async function rpc(name:string,args:Record<string,unknown>,role="service_role") {
 await db.exec("begin; set local role "+role);
 try {
  const values=name==="decrement_shop_cart_stock_atomic"?[JSON.stringify(args.p_lines)]:[args.p_product_id,args.p_quantity];
  const result=await db.query<{value:unknown}>("select public."+name+"("+values.map((_,i)=>"$"+(i+1)).join(",")+") as value",values);
  await db.exec("commit"); return {data:result.rows[0].value,error:null};
 } catch(error) {await db.exec("rollback");return {data:null,error:error as {message:string;code:string}};}
}
const admin={rpc} as unknown as SupabaseClient;
const stock=async()=> (await db.query<{id:string;stock_qty:number}>("select id,stock_qty from project_products order by id")).rows.map(x=>x.stock_qty);
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("atomic stock through actual PostgreSQL server API",()=>{
 beforeAll(async()=>{
  const {PGlite}=await import(pathToFileURL(resolve(process.env.KEBU_LOCAL_PGLITE_ROOT!,"dist/index.js")).href);db=new PGlite();
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;create table project_products(id uuid primary key,updated_at timestamptz);");
  await db.exec(readFileSync(resolve("supabase/migrations/047_shop_product_stock.sql"),"utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261010020721_shop_atomic_stock.sql"),"utf8"));
 },60000);
 beforeEach(async()=>{await db.exec("truncate project_products;insert into project_products(id,track_stock,stock_qty) values('"+a+"',true,10),('"+b+"',true,2)");});
 afterAll(async()=>{if(db)await db.close();});
 it("decrements relative quantities across repeated checkouts",async()=>{expect(await decrementProductStock(admin,a,3)).toEqual({ok:true,remaining:7});expect(await decrementProductStock(admin,a,4)).toEqual({ok:true,remaining:3});});
 it("does not oversell",async()=>{expect((await decrementProductStock(admin,a,10)).ok).toBe(true);expect((await decrementProductStock(admin,a,1)).ok).toBe(false);expect(await stock()).toEqual([0,2]);});
 it("aggregates duplicate product lines",async()=>{expect((await decrementCartStock(admin,[{productId:a,quantity:3},{productId:a,quantity:4}])).ok).toBe(true);expect(await stock()).toEqual([3,2]);});
 it("rejects aggregate demand beyond stock without mutations",async()=>{expect((await decrementCartStock(admin,[{productId:a,quantity:6},{productId:a,quantity:6}])).ok).toBe(false);expect(await stock()).toEqual([10,2]);});
 it("rejects a later insufficient line atomically",async()=>{expect((await decrementCartStock(admin,[{productId:a,quantity:2},{productId:b,quantity:3}])).ok).toBe(false);expect(await stock()).toEqual([10,2]);});
 it("rejects missing product before decrementing others",async()=>{expect((await decrementCartStock(admin,[{productId:a,quantity:2},{productId:"ffffffff-ffff-4fff-8fff-ffffffffffff",quantity:1}])).ok).toBe(false);expect(await stock()).toEqual([10,2]);});
 it("restores relative quantities without dropping an earlier restore",async()=>{await restoreProductStock(admin,a,3);await restoreProductStock(admin,a,4);expect(await stock()).toEqual([17,2]);});
 it("leaves nontracking quantities unchanged",async()=>{await db.exec("update project_products set track_stock=false where id='"+a+"'");expect(await decrementProductStock(admin,a,30)).toEqual({ok:true,remaining:null});await restoreProductStock(admin,a,30);expect(await stock()).toEqual([10,2]);});
 for(const qty of [0,-1,1.5,2147483648])it("rejects invalid quantity "+qty,async()=>{expect((await decrementProductStock(admin,a,qty)).ok).toBe(false);await expect(restoreProductStock(admin,a,qty)).rejects.toThrow();expect(isInStock({trackStock:false,stockQty:null},qty)).toBe(false);expect(await stock()).toEqual([10,2]);});
 for(const role of ["anon","authenticated"])for(const [name,args] of [
  ["decrement_shop_stock_atomic",{p_product_id:a,p_quantity:1}],
  ["decrement_shop_cart_stock_atomic",{p_lines:[{product_id:a,quantity:1}]}],
  ["restore_shop_stock_atomic",{p_product_id:a,p_quantity:1}]
 ] as const)it(role+" cannot call "+name,async()=>{expect((await rpc(name,args,role)).error?.code).toBe("42501");expect(await stock()).toEqual([10,2]);});
 it("fails closed when the database RPC is unavailable",async()=>{const unavailable={rpc:async()=>({data:null,error:{message:"unknown function"}})} as unknown as SupabaseClient;expect((await decrementProductStock(unavailable,a,1)).ok).toBe(false);await expect(restoreProductStock(unavailable,a,1)).rejects.toThrow(/restore/);});
 it("reports malformed stock acknowledgement as failure",async()=>{const bad={rpc:async()=>({data:{ok:true},error:null})} as unknown as SupabaseClient;expect((await decrementProductStock(bad,a,1)).ok).toBe(false);});
 it("rejects malformed SQL quantities even if the server helper is bypassed",async()=>{for(const quantity of [0,-1,0.5,null,"2"]){expect((await rpc("decrement_shop_cart_stock_atomic",{p_lines:[{product_id:a,quantity}]})).data).toMatchObject({ok:false});}expect(await stock()).toEqual([10,2]);});
 it("repeated migration retains execution restrictions",async()=>{await db.exec(readFileSync(resolve("supabase/migrations/20261010020721_shop_atomic_stock.sql"),"utf8"));expect((await rpc("decrement_shop_stock_atomic",{p_product_id:a,p_quantity:1},"anon")).error?.code).toBe("42501");expect((await decrementProductStock(admin,a,1)).ok).toBe(true);});
});
