import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {randomUUID} from "node:crypto";
export type WaveDb={exec:(sql:string)=>Promise<unknown>;query:<T=Record<string,unknown>>(sql:string,args?:unknown[])=>Promise<{rows:T[]}>;close?:()=>Promise<void>};
export type WaveKind="creative_asset_purchase"|"aesthetic_purchase"|"shop_order";
export const buyer="11111111-1111-4111-8111-111111111111", developer="22222222-2222-4222-8222-222222222222", other="33333333-3333-4333-8333-333333333333", project="44444444-4444-4444-8444-444444444444";
export async function role(db:WaveDb,name:"postgres"|"service_role"|"authenticated"|"anon",user=buyer){
 await db.exec("reset role");
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
 await db.exec("set role "+name);
}
export async function setupWaveDatabase(db:WaveDb){
 await db.exec([
 "create extension if not exists pgcrypto;create schema auth;",
 "create table auth.users(id uuid primary key,email text,created_at timestamptz default now());",
 "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
 "do $$begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;end$$;",
 "alter default privileges in schema public grant all on tables to authenticated,anon,service_role;",
 "grant usage on schema public,auth to authenticated,anon,service_role;grant execute on all functions in schema auth to authenticated,anon,service_role;",
 "create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;",
 ].join("\n"));
 for(const name of ["20261020030000_studio_creative_assets_marketplace.sql","20261020040000_developer_payout_settings.sql","20261021010000_creative_asset_buyer_checkout.sql","20261021020000_aesthetics_marketplace_canonical.sql","20261021030000_kebu_checkout_multi_provider.sql","20261021030002_marketplace_paid_ownership_boundary.sql"])await db.exec(readFileSync(resolve("supabase/migrations",name),"utf8"));
 // Minimal typed Shop fixtures; stock and payment RPC bodies below are verbatim canonical SQL.
 // This does not certify the wider Shop schema or hosted JWT/RLS.
 await db.exec([
 "create table public.shop_orders(id uuid primary key default gen_random_uuid(),project_id uuid not null,payment_status text not null default 'unpaid',payment_provider text,provider_reference text,provider_payment_id text,amount_xof integer,status text not null default 'new',updated_at timestamptz not null default now());",
 "create table public.project_products(id uuid primary key default gen_random_uuid(),track_stock boolean not null default false,stock_qty integer,updated_at timestamptz not null default now());",
 "create table public.shop_discount_codes(id uuid primary key default gen_random_uuid(),uses_count integer not null default 0,is_active boolean not null default true,starts_at timestamptz,ends_at timestamptz,max_uses integer,updated_at timestamptz not null default now());",
 "create table public.shop_checkout_reservations(id uuid primary key default gen_random_uuid(),order_id uuid not null unique,product_id uuid not null,quantity integer not null,discount_id uuid,status text not null default 'active',expires_at timestamptz not null default now()+interval '1 hour',released_at timestamptz,committed_at timestamptz);",
 "create table public.shop_payment_ledger_events(id uuid primary key default gen_random_uuid(),project_id uuid not null,order_id uuid,rail text,event_type text,amount_xof integer,currency text,provider text,provider_reference text,meta jsonb,created_at timestamptz not null default now());",
 ].join("\n"));
 const commerce=readFileSync(resolve("supabase/migrations_archive/legacy/101_security_remediation_atomic_commerce.sql"),"utf8");
 const start=commerce.indexOf("create or replace function public.commit_shop_checkout("),end=commerce.indexOf("create or replace function public.release_shop_checkout(",start);
 if(start<0||end<start)throw Error("Canonical stock function boundaries changed");
 await db.exec(commerce.slice(start,end));
 await db.exec(readFileSync(resolve("supabase/migrations/20260920012000_complete_shop_payment_atomically.sql"),"utf8"));
 await db.exec(readFileSync(resolve("supabase/migrations/20261021214459_verified_wave_settlement.sql"),"utf8"));
 await db.query("insert into auth.users(id) values($1),($2),($3)",[buyer,developer,other]);
 await db.query("insert into developer_profiles(user_id,display_name,status,reviewed_at,payout_method,payout_phone,payout_account_name) values($1,'Fixture developer','approved',now(),'wave','+221700000000','Fixture developer')",[developer]);
}
export async function openWaveDatabase(){
 const root=process.env.KEBU_LOCAL_PGLITE_ROOT;if(!root)throw Error("Set isolated PGlite root; no persistence substitute");
 const {PGlite}=await import(pathToFileURL(resolve(root,"dist/index.js")).href);
 const {pgcrypto}=await import(pathToFileURL(resolve(root,"dist/contrib/pgcrypto.js")).href);
 const db:WaveDb&{close:()=>Promise<void>}=new PGlite({extensions:{pgcrypto}});
 await setupWaveDatabase(db);return db;
}
export type Purchase={kind:WaveKind;id:string;reference:string;checkoutId:string;transactionId:string;eventId:string;sourceAmount:number;sourceCurrency:"USD"|"XOF";chargeAmount:number;assetId:string|null;productId:string|null};
export async function seedWavePurchase(db:WaveDb,kind:WaveKind,options:{owner?:string;catalog?:boolean}={}):Promise<Purchase>{
 await role(db,"postgres");
 const p:Purchase={kind,id:"",reference:"wave-ref-"+randomUUID(),checkoutId:"cos-"+randomUUID(),transactionId:"TX-"+randomUUID(),eventId:"EV-"+randomUUID(),sourceAmount:kind==="aesthetic_purchase"?500:2000,sourceCurrency:kind==="aesthetic_purchase"?"USD":"XOF",chargeAmount:kind==="aesthetic_purchase"?3000:2000,assetId:null,productId:null};
 const owner=options.owner??buyer, dev=(await db.query<{id:string}>("select id from developer_profiles where user_id=$1",[developer])).rows[0]!.id;
 if(kind==="creative_asset_purchase"){
  p.assetId=(await db.query<{id:string}>("insert into marketplace_creative_assets(developer_id,slug,kind,name,file_url,price_cents,status) values($1,$2,'photo','Fixture paid photo','https://assets.example/fixture.png',2000,'published') returning id",[dev,"asset-"+randomUUID()])).rows[0]!.id;
  p.id=(await db.query<{id:string}>("insert into creative_asset_library(owner_id,asset_id,status,amount_cents,provider,provider_reference) values($1,$2,'pending',2000,'wave',$3) returning id",[owner,p.assetId,p.reference])).rows[0]!.id;
 }else if(kind==="aesthetic_purchase"){
  if(options.catalog){
   p.id=(await db.query<{id:string}>("insert into aesthetic_library(owner_id,kind,catalog_slug,name,definition,status,amount_usd_cents,provider,provider_reference) values($1,'catalog',$2,'Fixture catalog','{}','pending',500,'wave',$3) returning id",[owner,"fixture-"+randomUUID(),p.reference])).rows[0]!.id;
  }else{
   p.assetId=(await db.query<{id:string}>("insert into marketplace_templates(developer_id,slug,name,price_cents,definition,status) values($1,$2,'Fixture template',500,'{}','published') returning id",[dev,"template-"+randomUUID()])).rows[0]!.id;
   p.id=(await db.query<{id:string}>("insert into aesthetic_library(owner_id,kind,marketplace_id,name,definition,status,amount_usd_cents,provider,provider_reference) values($1,'marketplace',$2,'Fixture template','{}','pending',500,'wave',$3) returning id",[owner,p.assetId,p.reference])).rows[0]!.id;
  }
 }else{
  p.productId=(await db.query<{id:string}>("insert into project_products(track_stock,stock_qty) values(true,3) returning id")).rows[0]!.id;
  p.id=(await db.query<{id:string}>("insert into shop_orders(project_id,amount_xof) values($1,2000) returning id",[project])).rows[0]!.id;
  await db.query("insert into shop_checkout_reservations(order_id,product_id,quantity) values($1,$2,1)",[p.id,p.productId]);
 }
 return p;
}
export const quoteArgs=(p:Purchase)=>[p.kind,p.id,p.reference,p.checkoutId,p.sourceAmount,p.sourceCurrency,p.chargeAmount,"XOF"];
export const proofArgs=(p:Purchase)=>[p.reference,p.checkoutId,p.transactionId,p.eventId,p.chargeAmount,"XOF"];
export async function recordQuote(db:WaveDb,p:Purchase){
 await role(db,"service_role");
 return (await db.query<{result:{quote_id:string}}>("select record_wave_checkout_quote($1,$2,$3,$4,$5,$6,$7,$8) as result",quoteArgs(p))).rows[0]!.result;
}
export async function completeQuote(db:WaveDb,p:Purchase){
 await role(db,"service_role");
 return (await db.query<{result:Record<string,unknown>}>("select complete_verified_wave_payment($1,$2,$3,$4,$5,$6) as result",proofArgs(p))).rows[0]!.result;
}
export async function paymentState(db:WaveDb,p:Purchase){
 await role(db,"postgres");
 if(p.kind==="shop_order")return (await db.query<{status:string;session:string}>("select payment_status as status,provider_payment_id as session from shop_orders where id=$1",[p.id])).rows[0]!;
 return (await db.query<{status:string;session:string}>("select status,provider_payment_id as session from "+(p.kind==="creative_asset_purchase"?"creative_asset_library":"aesthetic_library")+" where id=$1",[p.id])).rows[0]!;
}
export async function counter(db:WaveDb,p:Purchase){
 await role(db,"postgres");
 if(p.kind==="shop_order")return (await db.query<{count:number}>("select stock_qty as count from project_products where id=$1",[p.productId])).rows[0]!.count;
 if(!p.assetId)return null;
 return (await db.query<{count:number}>("select "+(p.kind==="creative_asset_purchase"?"acquire_count":"sales_count")+" as count from "+(p.kind==="creative_asset_purchase"?"marketplace_creative_assets":"marketplace_templates")+" where id=$1",[p.assetId])).rows[0]!.count;
}
