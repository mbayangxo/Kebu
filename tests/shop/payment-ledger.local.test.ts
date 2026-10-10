import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
type Db={exec(sql:string):Promise<unknown>;query<T>(sql:string):Promise<{rows:T[]}>;close():Promise<void>};
let db:Db;
const one="b1000000-0000-4000-8000-000000000001",two="b1000000-0000-4000-8000-000000000002";
const migration=readFileSync(resolve("supabase/migrations/20261010021100_reconcile_shop_payment_ledger.sql"),"utf8");
async function as(role:string,user:string,sql:string){await db.exec("begin;set local role "+role+";select set_config('request.jwt.claim.sub','"+user+"',true)");try{return await db.query(sql);}finally{await db.exec("rollback");}}
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("reconciled payment ledger PostgreSQL access",()=>{
 beforeAll(async()=>{const {PGlite}=await import(pathToFileURL(resolve(process.env.KEBU_LOCAL_PGLITE_ROOT!,"dist/index.js")).href);db=new PGlite();await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to anon,authenticated,service_role;create table projects(id uuid primary key,owner_id uuid);grant select on projects to authenticated;alter table projects enable row level security;create policy owned on projects for select to authenticated using(owner_id=auth.uid());create table shop_orders(id uuid primary key);insert into projects values('"+one+"','"+one+"'),('"+two+"','"+two+"');");await db.exec(migration);},60000);
 beforeEach(async()=>{await db.exec("truncate shop_payment_ledger_events;insert into shop_payment_ledger_events(project_id,rail,event_type) values('"+one+"','joko','paid'),('"+two+"','manual','intent')");});
 afterAll(async()=>{if(db)await db.close();});
 it("shows the owner only their own events",async()=>{expect((await as("authenticated",one,"select project_id from shop_payment_ledger_events")).rows).toEqual([{project_id:one}]);});
 it("isolates another owner's events",async()=>{expect((await as("authenticated",two,"select project_id from shop_payment_ledger_events")).rows).toEqual([{project_id:two}]);});
 it("denies anonymous ledger reads",async()=>{await expect(as("anon","","select * from shop_payment_ledger_events")).rejects.toMatchObject({code:"42501"});});
 for(const sql of ["insert into shop_payment_ledger_events(project_id,rail,event_type) values('"+one+"','joko','refunded')","update shop_payment_ledger_events set event_type='refunded'","delete from shop_payment_ledger_events"])
 it("denies owner mutation "+sql.split(" ")[0],async()=>{await expect(as("authenticated",one,sql)).rejects.toMatchObject({code:"42501"});expect((await db.query("select * from shop_payment_ledger_events")).rows).toHaveLength(2);});
 it("retains server inserts and reads",async()=>{expect((await as("service_role","","insert into shop_payment_ledger_events(project_id,rail,event_type,amount_xof,currency) values('"+one+"','joko','refunded',20,'CAURIS') returning amount_xof")).rows).toEqual([{amount_xof:20}]);expect((await as("service_role","","select * from shop_payment_ledger_events")).rows).toHaveLength(2);});
 it("validates actual rails/events and nonnegative amounts",async()=>{for(const column of ["rail","event_type","amount_xof"]){await expect(db.exec("insert into shop_payment_ledger_events(project_id,rail,event_type,amount_xof) values('"+one+"',"+(column==="rail"?"'invalid'":"'joko'")+","+(column==="event_type"?"'invalid'":"'paid'")+","+(column==="amount_xof"?"-1":"1")+")")).rejects.toMatchObject({code:"23514"});}});
 it("repeated reconciliation preserves stored rows and owner isolation",async()=>{await db.exec(migration);expect((await db.query("select * from shop_payment_ledger_events")).rows).toHaveLength(2);expect((await as("authenticated",one,"select project_id from shop_payment_ledger_events")).rows).toEqual([{project_id:one}]);});
});
