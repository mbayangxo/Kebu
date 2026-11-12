import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import pg from "pg";
import {setupWaveDatabase} from "../tests/payments/fixtures/wave-database.ts";
const url=new URL(process.env.KEBU_TEMPLATE_SOURCE_POSTGRES_URL??"");
assert.equal(process.env.KEBU_TEMPLATE_SOURCE_REST_ISOLATED,"1");
assert(["127.0.0.1","localhost"].includes(url.hostname));
assert.equal(url.pathname,"/kebu_template_source_ci");
assert.equal(url.password,"kebu_disposable_ci_only");
const db=new pg.Client({connectionString:url.toString()});await db.connect();
try{
 await setupWaveDatabase({exec:sql=>db.query(sql),query:(sql,args)=>db.query(sql,args)});
 await db.query(readFileSync("supabase/migrations/20261021223430_marketplace_template_source_boundary.sql","utf8"));
 await db.query("revoke all on public.developer_profiles from anon");
 await db.query(`create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
 $$;
 create role kebu_rest_authenticator noinherit login password 'kebu_disposable_rest_only';
 grant anon,authenticated,service_role to kebu_rest_authenticator;
 notify pgrst,'reload schema';`);
 console.log(JSON.stringify({scope:"isolated actual PostgREST/PG fixture; synthetic JWTs, not GoTrue or managed hosted acceptance",migration:"supabase/migrations/20261021223430_marketplace_template_source_boundary.sql",postgres:(await db.query("show server_version")).rows[0].server_version}));
}finally{await db.end();}
