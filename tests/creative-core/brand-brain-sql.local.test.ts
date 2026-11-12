import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {brandBrainFromRow,brandBrainStoredFields,newBrandBrain} from "@/lib/create/brand-brain";
const root=process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db={exec:(s:string)=>Promise<unknown>;query:<T=Record<string,unknown>>(s:string,a?:unknown[])=>Promise<{rows:T[]}>;close:()=>Promise<void>};
let db:Db;
const owner="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222",id="33333333-3333-4333-8333-333333333333",business="44444444-4444-4444-8444-444444444444";
async function role(user=owner){await db.exec(`reset role;set request.jwt.claim.sub='${user}';set role authenticated;`);}
const fields=()=>brandBrainStoredFields(newBrandBrain());
async function save(revision:number,p=fields(),profileId=id){return (await db.query<{saved:Record<string,unknown>}>("select public.save_brand_brain($1,$2,$3) as saved",[profileId,revision,p])).rows[0].saved;}
describe.skipIf(!root)("Brand Brain real PostgreSQL revision and owner checks",()=>{
 beforeAll(async()=>{
  const {PGlite}=await import(pathToFileURL(resolve(root!,"dist/index.js")).href);const {pgcrypto}=await import(pathToFileURL(resolve(root!,"dist/contrib/pgcrypto.js")).href);db=new PGlite({extensions:{pgcrypto}});
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create role authenticated;create role anon;create role service_role bypassrls;
   grant usage on schema public,auth to authenticated,anon;
   alter default privileges in schema public grant all on tables to authenticated,anon;
   create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
   create table public.businesses(id uuid primary key,created_by uuid references auth.users(id));
   alter table public.businesses enable row level security;create policy business_owner on public.businesses for select to authenticated using(created_by=auth.uid());`);
  const legacy=readFileSync(resolve("supabase/migrations_archive/legacy/064_creation_stack_slices.sql"),"utf8"),start=legacy.indexOf("create table if not exists public.business_brand_kits"),end=legacy.indexOf("alter table public.project_products",start);expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);await db.exec(legacy.slice(start,end));
  const dna=readFileSync(resolve("supabase/migrations_archive/legacy/076_brand_dna_campaign_projects.sql"),"utf8");await db.exec(dna.slice(0,dna.indexOf("-- ── Creative Director")));
  await db.exec(readFileSync(resolve("supabase/migrations/20261008194553_brand_brain_profiles.sql"),"utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations_archive/legacy/004_create_projects.sql"),"utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261009011958_brand_brain_site_binding.sql"),"utf8"));
  await db.query("insert into auth.users(id) values($1),($2)",[owner,other]);await db.query("insert into public.businesses values($1,$2)",[business,other]);
  await db.query("insert into projects(id,owner_id,title) values($1,$2,'Owner site'),($3,$4,'Other site')",[business,owner,other,other]);await role();
 },60000);
 afterAll(async()=>{if(db)await db.close();});
 it("creates and reloads a profile on the existing DNA row",async()=>{const row=await save(0);expect(row.owner_id).toBe(owner);expect(brandBrainFromRow(row).revision).toBe(1);expect((await db.query("select id from business_brand_kits")).rows).toHaveLength(1);});
 it("updates all profiles and rejects stale writes atomically",async()=>{const p=fields();p.brain_profile.creative.composition="editorial";const row=await save(1,p);expect(brandBrainFromRow(row).profile.creative.composition).toBe("editorial");expect(row.brain_revision).toBe(2);await expect(save(1)).rejects.toThrow(/changed/);expect((await db.query("select brain_revision from business_brand_kits where id=$1",[id])).rows[0].brain_revision).toBe(2);});
 it("legacy DNA updates advance revision even after legacy version cap",async()=>{await db.query("update business_brand_kits set voice_tone='Warm',dna_version=100 where id=$1",[id]);await expect(save(2)).rejects.toThrow(/changed/);const row=await save(3);expect(row.brain_revision).toBe(4);expect(row.dna_version).toBe(100);});
 it("denies foreign business association and owner-field injection",async()=>{await expect(save(4,{...fields(),business_id:business})).rejects.toThrow(/Business not found/);await expect(save(4,{...fields(),owner_id:other} as never)).rejects.toThrow(/Invalid Brand Brain fields/);});
 it("RLS blocks another user's read/update and RPC save",async()=>{await role(other);expect((await db.query("select * from business_brand_kits where id=$1",[id])).rows).toHaveLength(0);expect((await db.query("update business_brand_kits set name='Hijack' where id=$1 returning id",[id])).rows).toHaveLength(0);await expect(save(4)).rejects.toThrow(/not found/);await role();expect((await db.query("select name from business_brand_kits where id=$1",[id])).rows[0].name).toBe("Brand DNA");});
 it("anonymous read and RPC invocation are denied",async()=>{await db.exec("reset role;set request.jwt.claim.sub='';set role anon;");expect((await db.query("select * from business_brand_kits")).rows).toHaveLength(0);await expect(save(4)).rejects.toThrow(/permission denied/);await role();});
 it("rejects unknown stored profile versions",async()=>{const p=fields();p.brain_profile.version=2;await expect(save(4,p)).rejects.toThrow(/Invalid Brand Brain version/);});
 it("accepts schema-valid large UTF-8 direction and approved imagery without truncation",async()=>{
  const profile=newBrandBrain();profile.creative.rules="é".repeat(1000);profile.taste.likes="é".repeat(1000);profile.motion.notes="é".repeat(1000);
  profile.taste.references=Array.from({length:12},(_,i)=>({url:`https://example.com/${"x".repeat(460)}${i}`,label:"é".repeat(120),reason:"é".repeat(400)}));
  profile.brand.approvedImagery=Array.from({length:24},(_,i)=>({url:`https://example.com/${"x".repeat(460)}${i}`,label:"é".repeat(80)}));
  const p=brandBrainStoredFields(profile);expect(Buffer.byteLength(JSON.stringify(p))).toBeGreaterThan(24000);
  const row=await save(0,p,"55555555-5555-4555-8555-555555555555");expect(brandBrainFromRow(row).profile.brand.approvedImagery).toHaveLength(24);expect(brandBrainFromRow(row).profile.taste.references).toHaveLength(12);
 });
 it("attaches and reloads private site direction; replay/stale writes cannot overwrite it",async()=>{
  const attach=()=>db.query<{saved:Record<string,unknown>}>("select save_project_brand_brain($1,$2,$3) saved",[business,id,0]);
  expect((await attach()).rows[0].saved).toMatchObject({project_id:business,profile_id:id,revision:1});await expect(attach()).rejects.toThrow(/changed/);
  expect((await db.query("select profile_id,revision from project_brand_brains where project_id=$1",[business])).rows[0]).toMatchObject({profile_id:id,revision:1});
 });
 it("attachment denies foreign project/profile and direct identity reassignment",async()=>{
  await role(other);await save(0,fields(),"66666666-6666-4666-8666-666666666666");expect((await db.query("select * from project_brand_brains")).rows).toHaveLength(0);
  await expect(db.query("select save_project_brand_brain($1,$2,1)",[business,id])).rejects.toThrow(/Site not found/);await role();
  await expect(db.query("select save_project_brand_brain($1,$2,1)",[business,"66666666-6666-4666-8666-666666666666"])).rejects.toThrow(/Profile not found/);
  await expect(db.query("update project_brand_brains set owner_id=$1 where project_id=$2",[other,business])).rejects.toThrow(/immutable/);
  await expect(db.query("update project_brand_brains set profile_id=$1 where project_id=$2",["66666666-6666-4666-8666-666666666666",business])).rejects.toThrow(/foreign key/);
 });
 it("anonymous attachment reads/RPC are denied",async()=>{
  await db.exec("reset role;set request.jwt.claim.sub='';set role anon;");await expect(db.query("select * from project_brand_brains")).rejects.toThrow(/permission denied/);
  await expect(db.query("select save_project_brand_brain($1,$2,1)",[business,id])).rejects.toThrow(/permission denied/);await role();
 });
 it("direct edits advance revision; detach keeps profile; profile deletion clears pointer",async()=>{
  await db.query("update project_brand_brains set profile_id=profile_id,revision=1 where project_id=$1",[business]);await expect(db.query("select save_project_brand_brain($1,null,1)",[business])).rejects.toThrow(/changed/);
  expect((await db.query<{saved:Record<string,unknown>}>("select save_project_brand_brain($1,null,2) saved",[business])).rows[0].saved).toMatchObject({profile_id:null,revision:3});
  expect((await db.query("select id from business_brand_kits where id=$1",[id])).rows).toHaveLength(1);await db.query("select save_project_brand_brain($1,$2,3)",[business,id]);await db.query("delete from business_brand_kits where id=$1",[id]);
  expect((await db.query("select profile_id,revision from project_brand_brains where project_id=$1",[business])).rows[0]).toMatchObject({profile_id:null,revision:5});
 });
});
