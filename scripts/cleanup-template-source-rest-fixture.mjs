import assert from "node:assert/strict";
import pg from "pg";
const url=new URL(process.env.KEBU_TEMPLATE_SOURCE_POSTGRES_URL??"");
assert.equal(process.env.KEBU_TEMPLATE_SOURCE_REST_ISOLATED,"1");assert(["127.0.0.1","localhost"].includes(url.hostname));assert.equal(url.pathname,"/kebu_template_source_ci");assert.equal(url.password,"kebu_disposable_ci_only");
url.pathname="/postgres";const db=new pg.Client({connectionString:url.toString()});await db.connect();
try{const sessions=await db.query("select pid from pg_stat_activity where datname='kebu_template_source_ci'");assert.equal(sessions.rows.length,0,"Refuse forced cleanup while a real backend is live");await db.query('drop database kebu_template_source_ci');const remaining=await db.query("select datname from pg_database where datname='kebu_template_source_ci'");assert.equal(remaining.rows.length,0);console.log(JSON.stringify({restStopped:true,normalDrop:true,fixtureDatabaseCleaned:true}));}finally{await db.end();}
