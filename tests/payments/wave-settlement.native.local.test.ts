/** Real PostgreSQL backend PIDs/locks; PGlite is not a concurrency substitute. */
import {randomUUID} from "node:crypto";
import {afterAll,beforeAll,describe,expect,it} from "vitest";
// @ts-expect-error pg is installed without an @types/pg project dependency
import {Pool} from "pg";
import {assertLocalPublishDatabase} from "../creative-core/publish-db-setup";
import {dropNativeFixtureDatabase} from "../creative-core/native-postgres-cleanup";
import {setupWaveDatabase,seedWavePurchase,recordQuote,proofArgs,type WaveDb} from "./fixtures/wave-database";
type Connection={processID:number;query:<T=Record<string,unknown>>(sql:string,args?:unknown[])=>Promise<{rows:T[]}>;release:()=>void};
type DbPool={query:Connection["query"];connect:()=>Promise<Connection>;end:()=>Promise<void>};
const url=process.env.KEBU_PUBLISH_CONCURRENCY_DATABASE_URL,database="_kebutest_payments_"+randomUUID().replaceAll("-","");
let admin:DbPool|undefined,pool:DbPool|undefined,created=false;
const wrap=(c:Connection):WaveDb=>({exec:sql=>c.query(sql),query:<T=Record<string,unknown>>(sql:string,args?:unknown[])=>c.query<T>(sql,args)});
const settle=<T>(promise:Promise<T>)=>promise.then(value=>({ok:true as const,value}),error=>({ok:false as const,error}));
async function blocked(waiter:Connection,holder:Connection){
 const deadline=Date.now()+5000;
 while(Date.now()<deadline){
  const row=(await pool!.query<{path:number[]|null}>("with recursive blockers(pid,path) as (select pid,array[$1::int,pid] from unnest(pg_blocking_pids($1)) as pid union all select next_pid,path||next_pid from blockers cross join lateral unnest(pg_blocking_pids(blockers.pid)) as next_pid where not next_pid=any(path)) select (select path from blockers where pid=$2 limit 1) as path",[waiter.processID,holder.processID])).rows[0]!;
  if(row.path)return;
  await new Promise(done=>setTimeout(done,25));
 }
 throw Error("Expected a real PostgreSQL lock barrier");
}
async function release(...clients:Connection[]){for(const c of clients){try{await c.query("rollback;reset role");}finally{c.release();}}}
describe.skipIf(!url)("Wave disposable native PostgreSQL settlement races",()=>{
 beforeAll(async()=>{
  const source=assertLocalPublishDatabase(url!);admin=new Pool({connectionString:source.href,max:1}) as DbPool;
  await admin.query('create database "'+database+'"');created=true;source.pathname="/"+database;pool=new Pool({connectionString:source.href,max:6}) as DbPool;
  const c=await pool.connect();try{await setupWaveDatabase(wrap(c));}finally{c.release();}
 },60000);
 afterAll(async()=>{try{if(pool)await pool.end();}finally{try{if(created)await dropNativeFixtureDatabase(admin!,database);}finally{if(admin)await admin.end();}}});
 it("two workers blocked on one receipt grant once and return one replay",async()=>{
  const holder=await pool!.connect(),a=await pool!.connect(),b=await pool!.connect();let first:ReturnType<typeof settle>|undefined,second:ReturnType<typeof settle>|undefined;
  try{
   expect(new Set([holder.processID,a.processID,b.processID]).size).toBe(3);
   const p=await seedWavePurchase(wrap(holder),"creative_asset_purchase");await recordQuote(wrap(holder),p);
   await holder.query("reset role;begin");await holder.query("select id from creative_asset_library where id=$1 for update",[p.id]);
   await a.query("set role service_role;set statement_timeout='10s'");await b.query("set role service_role;set statement_timeout='10s'");
   first=settle(a.query<{result:{already_paid:boolean}}>("select complete_verified_wave_payment($1,$2,$3,$4,$5,$6) as result",proofArgs(p)));await blocked(a,holder);
   second=settle(b.query<{result:{already_paid:boolean}}>("select complete_verified_wave_payment($1,$2,$3,$4,$5,$6) as result",proofArgs(p)));await blocked(b,holder);
   await holder.query("commit");
   const results=await Promise.all([first,second]);expect(results.map(r=>r.ok)).toEqual([true,true]);
   const replay=results.map(r=>r.ok?(r.value as {rows:{result:{already_paid:boolean}}[]}).rows[0]!.result.already_paid:null).sort();expect(replay).toEqual([false,true]);
   expect((await holder.query<{count:number}>("select acquire_count as count from marketplace_creative_assets where id=$1",[p.assetId])).rows[0]!.count).toBe(1);
   expect((await holder.query<{count:number}>("select count(*)::int as count from wave_payment_settlements")).rows[0]!.count).toBe(1);
  }finally{await holder.query("rollback");if(first)await first;if(second)await second;await release(holder,a,b);}
 },30000);
 it("two different receipts racing with one transaction identity cannot both grant ownership",async()=>{
  const holder=await pool!.connect(),a=await pool!.connect(),b=await pool!.connect();let first:ReturnType<typeof settle>|undefined,second:ReturnType<typeof settle>|undefined;
  try{
   const one=await seedWavePurchase(wrap(holder),"creative_asset_purchase"),two=await seedWavePurchase(wrap(holder),"creative_asset_purchase");two.transactionId=one.transactionId;
   await recordQuote(wrap(holder),one);await recordQuote(wrap(holder),two);
   await holder.query("reset role;begin");await holder.query("lock table wave_payment_settlements in share mode");
   await a.query("set role service_role;set statement_timeout='10s'");await b.query("set role service_role;set statement_timeout='10s'");
   first=settle(a.query("select complete_verified_wave_payment($1,$2,$3,$4,$5,$6)",proofArgs(one)));await blocked(a,holder);
   second=settle(b.query("select complete_verified_wave_payment($1,$2,$3,$4,$5,$6)",proofArgs(two)));await blocked(b,holder);
   await holder.query("commit");
   const results=await Promise.all([first,second]);expect(results.map(r=>r.ok).sort()).toEqual([false,true]);
   expect((await holder.query<{count:number}>("select count(*)::int as count from creative_asset_library where id=any($1::uuid[]) and status='owned'",[[one.id,two.id]])).rows[0]!.count).toBe(1);
   expect((await holder.query<{count:number}>("select sum(acquire_count)::int as count from marketplace_creative_assets where id=any($1::uuid[])",[[one.assetId,two.assetId]])).rows[0]!.count).toBe(1);
   expect((await holder.query<{count:number}>("select count(*)::int as count from wave_payment_settlements where transaction_id=$1",[one.transactionId])).rows[0]!.count).toBe(1);
  }finally{await holder.query("rollback");if(first)await first;if(second)await second;await release(holder,a,b);}
 },30000);
});
