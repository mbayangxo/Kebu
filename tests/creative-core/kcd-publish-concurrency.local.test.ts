import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error — pg is installed; @types/pg is not a project dependency
import { Pool } from "pg";
import { createKcdPublishedSnapshot } from "@/lib/create/kcd-published-snapshot";
import { kcdPublishDocument } from "@/lib/create/kcd-publish";
import { assertLocalPublishDatabase, setupPublishDatabase } from "./publish-db-setup";

type Connection={processID:number;query:<T=Record<string,unknown>>(sql:string,args?:unknown[])=>Promise<{rows:T[]}>;release:()=>void};
type DatabasePool={query:Connection["query"];connect:()=>Promise<Connection>;end:()=>Promise<void>};
type Source=Parameters<typeof kcdPublishDocument>[0];
const adminUrl=process.env.KEBU_PUBLISH_CONCURRENCY_DATABASE_URL;
const database=`_kebutest_publish_${randomUUID().replaceAll("-","")}`;
const owner="11111111-1111-4111-8111-111111111111";
const project="22222222-2222-4222-8222-222222222222";
const other="44444444-4444-4444-8444-444444444444";
const page="33333333-3333-4333-8333-333333333333";
let admin:DatabasePool|undefined,pool:DatabasePool|undefined,created=false;

async function connection(){const c=await pool!.connect();await c.query("set role service_role;set statement_timeout='10s'");return c;}
async function source(c:Connection,id=project){return (await c.query<{source:Source}>("select public.kcd_publish_source($1,$2) as source",[id,owner])).rows[0].source;}
async function publish(c:Connection,id:string,slug:string,staged:Source){
 const prepared=createKcdPublishedSnapshot(kcdPublishDocument(staged));
 return c.query("select public.publish_kcd_document($1,$2,$3,$4,$5,$6) as result",[id,owner,slug,staged,prepared.snapshot,prepared.canonicalPayload]);
}
function settle<T>(promise:Promise<T>){return promise.then(value=>({ok:true as const,value}),error=>({ok:false as const,error}));}
async function blocked(waiter:Connection,holder:Connection){
 const deadline=Date.now()+5000;
 while(Date.now()<deadline){
  // A queued row-lock waiter can be blocked by the preceding waiter, which is
  // itself blocked by the holder. Require an observed chain to the holder.
  const row=(await pool!.query<{path:number[]|null}>(`with recursive blockers(pid,path) as (
   select pid,array[$1::int,pid] from unnest(pg_blocking_pids($1)) as pid
   union all
   select next_pid,path||next_pid from blockers
   cross join lateral unnest(pg_blocking_pids(blockers.pid)) as next_pid
   where not next_pid=any(path)
  ) select (select path from blockers where pid=$2 limit 1) as path`,[waiter.processID,holder.processID])).rows[0];
  if(row.path){if(row.path.length>2)console.info("Observed queued PostgreSQL lock chain",row.path);return;}
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 throw new Error("Expected a real blocked PostgreSQL connection; race barrier was not reached");
}
async function release(...clients:Connection[]){for(const c of clients){try{await c.query("rollback;reset role");}finally{c.release();}}}

/** A real server and separate backend PIDs are mandatory; PGlite is not a concurrency substitute. */
describe.skipIf(!adminUrl)("S7 disposable PostgreSQL multi-connection publish races",()=>{
 beforeAll(async()=>{
  const url=assertLocalPublishDatabase(adminUrl!);
  admin=new Pool({connectionString:url.href,max:1}) as DatabasePool;
  await admin.query(`create database "${database}"`);created=true;
  url.pathname=`/${database}`;
  pool=new Pool({connectionString:url.href,max:6}) as DatabasePool;
  await setupPublishDatabase({exec:sql=>pool!.query(sql)});
 },60000);
 beforeEach(async()=>{
  await pool!.query("truncate projects,auth.users cascade");
  await pool!.query("insert into auth.users(id) values($1)",[owner]);
  await pool!.query("insert into projects(id,owner_id,title,document_schema_version) values($1,$3,'Native first','kcd-1'),($2,$3,'Native second','kcd-1')",[project,other,owner]);
  await pool!.query("insert into project_pages(id,project_id,slug,title,sort_order,order_key) values($1,$2,'home','Home',0,'V'),($3,$4,'home','Home',0,'V')",[page,project,randomUUID(),other]);
  await pool!.query("insert into project_sections(page_id,section_type,sort_order,order_key,props) select id,'section',0,'V','{}' from project_pages");
 });
 afterAll(async()=>{
  try{if(pool)await pool.end();}finally{
   try{if(created)await admin!.query(`drop database "${database}" with (force)`);}finally{if(admin)await admin.end();}
  }
 });
 it("serializes same-project publishes and history versions under a real row-lock barrier",async()=>{
  const holder=await connection(),a=await connection(),b=await connection();
  try{
   expect(new Set([holder.processID,a.processID,b.processID]).size).toBe(3);
   const staged=await source(a);
   await holder.query("begin");await holder.query("select 1 from projects where id=$1 for update",[project]);
   const first=settle(publish(a,project,"race-first",staged));await blocked(a,holder);
   const second=settle(publish(b,project,"race-second",staged));await blocked(b,holder);
   await holder.query("commit");
   expect((await first).ok).toBe(true);expect((await second).ok).toBe(true);
   expect((await pool!.query("select version_number from website_versions order by version_number")).rows).toEqual([{version_number:1},{version_number:2}]);
   expect((await pool!.query("select count(*)::int as total from deployments where status='live'")).rows[0].total).toBe(1);
   expect((await pool!.query("select d.subdomain=p.subdomain as equal from deployments d join projects p on p.id=d.project_id where d.status='live'")).rows[0].equal).toBe(true);
  }finally{await release(holder,a,b);}
 },20000);
 it("allows exactly one of two projects to claim a domain and preserves the losing project's live site",async()=>{
  const holder=await connection(),a=await connection(),b=await connection();
  try{
   const firstSource=await source(a),secondSource=await source(b,other);
   await publish(a,project,"old-first",firstSource);await publish(b,other,"old-second",secondSource);
   await holder.query("begin;select pg_advisory_xact_lock(hashtextextended('kcd-domain:shared-race',0))");
   const first=settle(publish(a,project,"shared-race",firstSource));await blocked(a,holder);
   const second=settle(publish(b,other,"shared-race",secondSource));await blocked(b,holder);
   await holder.query("commit");
   const results=await Promise.all([first,second]);
   expect(results.filter(r=>r.ok)).toHaveLength(1);
   expect(results.find(r=>!r.ok)).toMatchObject({ok:false,error:{code:"23505"}});
   const live=(await pool!.query<{project_id:string;subdomain:string}>("select project_id,subdomain from deployments where status='live'")).rows;
   expect(live).toHaveLength(2);expect(live.filter(r=>r.subdomain==="shared-race")).toHaveLength(1);
   const loser=results[0].ok?other:project;
   expect(live.find(r=>r.project_id===loser)?.subdomain).toBe(loser===other?"old-second":"old-first");
   expect((await pool!.query("select count(*)::int as total from website_versions")).rows[0].total).toBe(3);
  }finally{await release(holder,a,b);}
 },20000);
 it("rechecks the draft after waiting for a committed section writer",async()=>{
  const writer=await connection(),publisher=await connection();
  try{
   const staged=await source(publisher);await publish(publisher,project,"prior-live",staged);
   await writer.query("begin");await writer.query("update project_sections set props=props||'{\"label\":\"New draft\"}'::jsonb where page_id=$1",[page]);
   const pending=settle(publish(publisher,project,"stale-race",staged));await blocked(publisher,writer);
   await writer.query("commit");
   expect(await pending).toMatchObject({ok:false,error:{code:"40001"}});
   expect((await pool!.query("select subdomain from deployments where status='live'")).rows).toEqual([{subdomain:"prior-live"}]);
   expect((await pool!.query("select count(*)::int as total from website_versions")).rows[0].total).toBe(1);
  }finally{await release(writer,publisher);}
 },20000);
 it("blocks a draft writer until publication commits and keeps the published snapshot detached",async()=>{
  const publisher=await connection(),writer=await connection();
  try{
   const staged=await source(publisher);await publisher.query("begin");
   await publish(publisher,project,"snapshot-race",staged);
   const pending=settle(writer.query("update project_sections set props=props||'{\"label\":\"Later draft\"}'::jsonb where page_id=$1",[page]));
   await blocked(writer,publisher);await publisher.query("commit");expect((await pending).ok).toBe(true);
   const snapshot=(await pool!.query<{snapshot:{contentHash:string;document:{title:string;nodes:Record<string,{props:Record<string,unknown>}>}};content_hash:string}>("select snapshot,content_hash from deployments where status='live'")).rows[0];
   expect(snapshot.snapshot.contentHash).toBe(snapshot.content_hash);
   expect(Object.values(snapshot.snapshot.document.nodes).some(node=>node.props.label==="Later draft")).toBe(false);
   expect((await pool!.query<{props:{label:string}}>("select props from project_sections where page_id=$1",[page])).rows[0].props.label).toBe("Later draft");
  }finally{await release(publisher,writer);}
 },20000);
});
