import assert from 'node:assert/strict';
/** Real Library UI → Next API → supabase-js → isolated SQL/RLS. Loopback Auth/REST fixture only. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, createWriteStream, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const chromium=process.env.KEBU_CHROMIUM_EXECUTABLE_PATH, modulePath=process.env.KEBU_PGLITE_MODULE_PATH;
if(!chromium||!modulePath) throw Error('Set local Chromium and PGlite module paths. No hosted fallback.');
const {PGlite}=await import(pathToFileURL(modulePath).href), db=new PGlite();
const owner='33333333-3333-4333-8333-333333333333', other='44444444-4444-4444-8444-444444444444';
const output=process.env.KEBU_WORK_UI_OUTPUT_DIR??mkdtempSync(join(tmpdir(),'kebu-work-ui-'));mkdirSync(output,{recursive:true});
const read=path=>readFileSync(join(root,path),'utf8');
await db.exec(`create role authenticated; create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.businesses(id uuid primary key); create table public.business_members(business_id uuid,user_id uuid,status text);
 grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated;
 grant select on public.business_members to authenticated;`);
for(const id of [owner,other]) await db.query('insert into auth.users values($1)',[id]);
await db.exec(read('supabase/migrations/20260920081000_workspace_items.sql'));
await db.exec('alter table workspace_items add column room_id uuid; grant select,insert,update,delete on workspace_items to authenticated; create function public.can_access_room(uuid) returns boolean language sql as $$select false$$;');
const scoped=read('supabase/migrations/20260920086000_room_scope_hardening.sql');
await db.exec(scoped.slice(scoped.indexOf('drop policy if exists "Workspace members read items"')));
const business='55555555-5555-4555-8555-555555555555', item='66666666-6666-4666-8666-666666666666';
await db.query('insert into businesses values($1)',[business]);
for(const uid of [owner,other])await db.query("insert into business_members values($1,$2,'active')",[business,uid]);
await db.query("insert into workspace_items(id,owner_id,business_id,kind,title) values($1,$2,$3,'doc','Permission fixture')",[item,owner,business]);
async function asUser(uid,sql,params=[]) {return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return tx.query(sql,params);});}
let sqlAssertions=0;
assert.equal((await asUser(other,'update workspace_items set owner_id=$1 where id=$2 returning id',[other,item])).rows.length,1);
await db.query('update workspace_items set owner_id=$1 where id=$2',[owner,item]);
await db.exec(read('supabase/migrations/20261014043916_workspace_item_identity_guard.sql'));
await assert.rejects(asUser(other,'update workspace_items set owner_id=$1 where id=$2',[other,item]),e=>e.code==='42501');sqlAssertions++;
assert.equal((await asUser(other,"update workspace_items set body='Collaborative content' where id=$1 returning id",[item])).rows.length,1);sqlAssertions++;
await assert.rejects(asUser(other,'update workspace_items set business_id=null where id=$1',[item]),e=>e.code==='42501');sqlAssertions++;
await assert.rejects(asUser(other,'update workspace_items set room_id=$1 where id=$2',[business,item]),e=>e.code==='42501');sqlAssertions++;
await assert.rejects(asUser(owner,'update workspace_items set owner_id=$1 where id=$2',[other,item]),e=>e.code==='42501');sqlAssertions++;
await db.query("update business_members set status='revoked' where user_id=$1",[other]);
assert.equal((await asUser(other,'select id from workspace_items where id=$1',[item])).rows.length,0);sqlAssertions++;
assert.equal((await asUser(other,"update workspace_items set body='Revoked' where id=$1 returning id",[item])).rows.length,0);sqlAssertions++;
assert.equal((await asUser(owner,'select id from workspace_items where id=$1',[item])).rows.length,1);sqlAssertions++;
await db.exec('truncate workspace_items,business_members,businesses cascade');
const columns=new Set(['id','owner_id','business_id','room_id','kind','title','body','status','due_at','start_at','end_at','created_at','updated_at']);
let queries=0, totalQueries=0;
function identity(req) { try{const raw=(req.headers.authorization??'').split(' ')[1];const id=JSON.parse(Buffer.from(raw.split('.')[1],'base64url').toString()).sub;return [owner,other].includes(id)?id:null;}catch{return null;} }
async function payload(req) { let body='';for await(const bytes of req)body+=bytes;return body?JSON.parse(body):{}; }
const backend=createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:38426');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,x-client-info,content-type');res.setHeader('Content-Type','application/json');
 const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
 if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
 const url=new URL(req.url,'http://127.0.0.1:38427');
 try {
  if(url.pathname==='/__qa/reset'&&req.method==='POST'){await db.exec('truncate workspace_items');queries=0;send(200,{ok:true});return;}
  if(url.pathname==='/__qa/state'){const result=await db.query('select row_to_json(w) as row from workspace_items w order by created_at');send(200,{items:result.rows.map(x=>x.row),queries});return;}
  const uid=identity(req);
  if(url.pathname.startsWith('/auth/')){if(!uid){send(401,{message:'Fixture session missing'});return;}send(200,{id:uid,email:uid===owner?'qa@example.test':'other@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-14T12:00:00Z'});return;}
  if(!url.pathname.startsWith('/rest/v1/')){send(404,{error:'Fixture endpoint missing'});return;}
  if(url.pathname!=='/rest/v1/workspace_items'){send(200,[]);return;}
  if(!uid){send(401,{code:'42501',message:'No fixture identity'});return;}
  const values=[],clauses=[];
  for(const [key,value] of url.searchParams){if(!columns.has(key))continue;if(value.startsWith('eq.')){values.push(value.slice(3));clauses.push(`"${key}"=$${values.length}`);}else if(value==='is.null'){clauses.push(`"${key}" is null`);}else throw Error('Unsupported fixture filter');}
  const where=clauses.length?' where '+clauses.join(' and '):'';
  const raw=['POST','PATCH'].includes(req.method)?await payload(req):{};
  const row=Array.isArray(raw)?raw[0]:raw;
  let sql;
  if(req.method==='GET') sql=`select row_to_json(w) as row from workspace_items w${where} order by updated_at desc limit 200`;
  else if(req.method==='POST') {const keys=Object.keys(row);if(!keys.length||keys.some(key=>!columns.has(key)))throw Error('Invalid fixture columns');const vals=keys.map(key=>{values.push(row[key]);return '$'+values.length;});sql=`insert into workspace_items(${keys.map(key=>'"'+key+'"').join(',')}) values(${vals.join(',')}) returning row_to_json(workspace_items) as row`;}
  else if(req.method==='PATCH') {const keys=Object.keys(row);if(!keys.length||keys.some(key=>!columns.has(key)))throw Error('Invalid fixture columns');const patch=keys.map(key=>{values.push(row[key]);return `"${key}"=$${values.length}`;});sql=`update workspace_items set ${patch.join(',')}${where} returning row_to_json(workspace_items) as row`;}
  else if(req.method==='DELETE') sql=`delete from workspace_items${where} returning row_to_json(workspace_items) as row`;
  else {send(405,{error:'Unsupported fixture method'});return;}
  const result=await db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return tx.query(sql,values);});queries++;totalQueries++;
  const rows=result.rows.map(x=>x.row);
  if((req.headers.accept??'').includes('object+json')) {
    if(rows.length!==1){send(406,{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned',details:`The result contains ${rows.length} rows`});return;}
    send(200,rows[0]);return;
  }
  send(req.method==='POST'?201:200,rows);
 }catch(cause){send(cause.code==='23505'?409:400,{code:cause.code??'fixture_error',message:cause.message});}
});
await new Promise(done=>backend.listen(38427,'127.0.0.1',done));
const temp=mkdtempSync(join(tmpdir(),'kebu-work-config-')),config=join(temp,'playwright.config.mjs');
writeFileSync(config,`import{defineConfig}from${JSON.stringify(join(root,'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root,'tests/platform'))},testMatch:'work-documents.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output,'results.json'))}}]],outputDir:${JSON.stringify(join(output,'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38426',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:38427',NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-local-fixture',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_SECRET_KEY:'',SUPABASE_URL:'',DATABASE_URL:'',ANTHROPIC_API_KEY:'',VERCEL_ENV:''};
rmSync(join(root,'.next/dev'),{recursive:true,force:true});
async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(done => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.once("close", () => { clearTimeout(timer); done(); }); child.kill();
  });
}
let server,tests;
try {
 const log=createWriteStream(join(output,'server.log'));server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','38426'],{cwd:root,env,stdio:['ignore','pipe','pipe']});server.stdout.pipe(log);server.stderr.pipe(log);
 await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('Startup timeout')),30000);server.stdout.on('data',bytes=>{if(bytes.toString().includes('Ready')){clearTimeout(timer);done();}});server.on('exit',code=>fail(Error('Server exit '+code)));});
 tests=spawn(process.execPath,[join(root,'node_modules/playwright/cli.js'),'test','--config',config],{cwd:root,env,stdio:'inherit'});
 const code=await new Promise(done=>tests.on('exit',done));const report=JSON.parse(readFileSync(join(output,'results.json'),'utf8'));const receipt={...report.stats,sqlQueries:totalQueries,sqlAssertions,reproducedOwnershipEscalationBeforeGuard:true};writeFileSync(join(output,'verification.json'),JSON.stringify(receipt,null,2));console.log('WORK_UI_RESULT',JSON.stringify(receipt));
 if(code!==0||report.stats.unexpected||report.stats.expected<10||report.stats.skipped)throw Error('Work browser gate failed');
}finally{await stopChild(tests);await stopChild(server);await new Promise(done=>backend.close(done));await db.close();rmSync(temp,{recursive:true,force:true});}
