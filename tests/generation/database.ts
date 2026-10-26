import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setupExperienceDatabase } from "../creative-core/experience-db-setup";
import { owner,other,target,studioDocument } from "./fixtures";
export const runtime=process.env.KEBU_LOCAL_PGLITE_ROOT;
export type Db={exec(sql:string):Promise<unknown>;query<T=Record<string,unknown>>(sql:string,args?:unknown[]):Promise<{rows:T[]}>;close():Promise<void>};
export async function setupGenerationDatabase():Promise<Db>{
 const {PGlite}=await import(pathToFileURL(resolve(runtime!,"dist/index.js")).href),{pgcrypto}=await import(pathToFileURL(resolve(runtime!,"dist/contrib/pgcrypto.js")).href);const db:Db=new PGlite({extensions:{pgcrypto}});await setupExperienceDatabase(db);
 await db.exec(`alter table create_designs add column if not exists updated_at timestamptz default now();
 create table studio_design_collaborators(design_id uuid,user_id uuid,status text,role text);
 create table business_members(id uuid default gen_random_uuid(),business_id uuid,user_id uuid,status text);
 create table studio_design_versions(id uuid default gen_random_uuid(),design_id uuid,created_by uuid,canvas jsonb,source text,label text);
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema storage to authenticated,service_role;grant select on storage.objects to authenticated;`);
 await db.exec(readFileSync("supabase/migrations/20261026001108_creative_generation_pipeline.sql","utf8"));
 await db.query("insert into auth.users(id) values($1),($2)",[owner,other]);await db.query("insert into projects(id,owner_id,title,document_schema_version) values($1,$2,'Generation fixture','kcd-1')",[target,owner]);
 await db.query("insert into create_designs(id,owner_id,title,design_type,canvas,updated_at) values($1,$2,'Generation fixture','social_square',$3,'2026-10-26T00:00:00Z')",[target,owner,studioDocument()]);return db;
}
export async function role(db:Db,name="service_role",actor=owner){await db.exec(`reset role;set request.jwt.claim.sub='${actor}';set role ${name}`);}
