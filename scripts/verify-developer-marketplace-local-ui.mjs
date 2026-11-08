/** Actual browser → Next routes → supabase-js → local PostgreSQL/RLS.
 * Only Auth and the REST transport are fixture adapters; no hosted calls. */
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,createWriteStream,mkdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {setupMarketplace,sqlAs} from './verify-developer-marketplace-sql.mjs';
const root=resolve('.');
if(!process.env.KEBU_CHROMIUM_EXECUTABLE_PATH||!process.env.KEBU_PGLITE_MODULE_PATH)throw Error('Local Chromium and PGlite paths required.');
const {PGlite}=await import(pathToFileURL(process.env.KEBU_PGLITE_MODULE_PATH));
const db=new PGlite();await setupMarketplace(db);
const serviceKey='marketplace-fixture-service-key',output=process.env.KEBU_MARKETPLACE_OUTPUT_DIR??mkdtempSync(join(tmpdir(),'kebu-marketplace-ui-'));
mkdirSync(output,{recursive:true});
const allowed=['developer_apps','developer_app_reviews','developer_app_installs'];
const columns={};
for(const table of allowed)columns[table]=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1",[table])).rows.map(r=>r.column_name);
let queries=0;
function identity(req){
 const token=(req.headers.authorization??'').replace(/^Bearer /,'');
 if(token===serviceKey)return 'service';
 try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub??null;}catch{return null;}
}
async function payload(req){const chunks=[];for await(const x of req)chunks.push(x);return chunks.length?JSON.parse(Buffer.concat(chunks)):{};}
const backend=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:38521');
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
  if(url.pathname==='/__qa/state'){
    send(200,{apps:(await db.query('select * from developer_apps')).rows,installs:(await db.query('select * from developer_app_installs')).rows,reviews:(await db.query('select * from developer_app_reviews')).rows,queries});return;
  }
  if(url.pathname==='/__qa/reset'){await db.exec('truncate developer_app_reviews,developer_app_installs,developer_apps cascade');send(200,{ok:true});return;}
  const uid=identity(req);
  if(url.pathname.startsWith('/auth/')){
    if(!uid||uid==='service'){send(401,{message:'Fixture session missing'});return;}
    send(200,{id:uid,email:uid+'@example.test',aud:'authenticated',role:'authenticated',is_anonymous:false,app_metadata:{},user_metadata:{},created_at:'2026-11-08T12:00:00Z'});return;
  }
  if(url.pathname.startsWith('/rest/v1/rpc/')){
    const fn=url.pathname.split('/').at(-1);
    if(!['marketplace_install_app','marketplace_review_app'].includes(fn))throw Error('Unsupported fixture RPC');
    const args=await payload(req),keys=Object.keys(args);
    const result=await sqlAs(db,uid,`select ${fn}(${keys.map((key,i)=>`${key} := $${i+1}`).join(',')}) as value`,keys.map(k=>args[k]));
    queries++;send(200,result.rows[0].value);return;
  }
  if(!url.pathname.startsWith('/rest/v1/')){send(404,{error:'Unknown fixture URL'});return;}
  const table=url.pathname.slice('/rest/v1/'.length);
  if(!allowed.includes(table)){
    if(req.method!=='GET') {send(404,{code:'42P01',message:'Fixture table does not exist'});return;}
    if((req.headers.accept??'').includes('object+json')) {send(406,{code:'PGRST116',message:'No fixture row',details:'The result contains 0 rows'});return;}
    send(200,[]);return;
  } // Unrelated shell queries return empty; no invented identity rows.
  const values=[],filters=[];let order='',limit='';
  for(const [key,value]of url.searchParams){
    if(key==='select')continue;
    if(key==='order'){const [col,dir]=value.split('.');if(!columns[table].includes(col))throw Error('Invalid order');order=` order by "${col}" ${dir==='desc'?'desc':'asc'}`;continue;}
    if(key==='limit'){limit=' limit '+Math.min(100,Math.max(0,Number(value)));continue;}
    if(!columns[table].includes(key))throw Error('Invalid fixture column');
    if(value.startsWith('eq.')){values.push(value.slice(3));filters.push(`"${key}"=$${values.length}`);}
    else if(value.startsWith('in.(')&&value.endsWith(')')){
      const list=value.slice(4,-1).split(',');
      filters.push(`"${key}" in (${list.map(v=>{values.push(v);return '$'+values.length;}).join(',')})`);
    }else throw Error('Unsupported fixture filter');
  }
  const where=filters.length?' where '+filters.join(' and '):'';
  const row=['POST','PATCH'].includes(req.method)?await payload(req):{};
  const keys=Object.keys(row);
  if(keys.some(k=>!columns[table].includes(k)))throw Error('Invalid fixture write');
  let sql;
  if(req.method==='GET')sql=`select row_to_json(t) as row from ${table} t${where}${order}${limit}`;
  else if(req.method==='POST')sql=`insert into ${table}(${keys.map(k=>'"'+k+'"').join(',')}) values(${keys.map(k=>{values.push(row[k]);return '$'+values.length;}).join(',')}) returning row_to_json(${table}) as row`;
  else if(req.method==='PATCH')sql=`update ${table} set ${keys.map(k=>{values.push(row[k]);return '"'+k+'"=$'+values.length;}).join(',')}${where} returning row_to_json(${table}) as row`;
  else if(req.method==='DELETE')sql=`delete from ${table}${where} returning row_to_json(${table}) as row`;
  else throw Error('Unsupported method');
  const result=await sqlAs(db,uid,sql,values);queries++;
  const rows=result.rows.map(x=>x.row);
  if((req.headers.accept??'').includes('object+json')){
    if(rows.length!==1){send(406,{code:'PGRST116',message:'Object not found',details:'The result contains '+rows.length+' rows'});return;}
    send(200,rows[0]);return;
  }
  send(req.method==='POST'?201:200,rows);
 }catch(error){send(error.code==='42501'?403:error.code==='23505'?409:400,{code:error.code??'fixture_error',message:error.message});}
});
await new Promise(done=>backend.listen(38521,'127.0.0.1',done));
const temp=mkdtempSync(join(tmpdir(),'kebu-marketplace-config-')),config=join(temp,'playwright.config.mjs');
writeFileSync(config,`import{defineConfig}from${JSON.stringify(join(root,'node_modules/playwright/test.mjs'))};export default defineConfig({testDir:${JSON.stringify(join(root,'tests/marketplace'))},testMatch:'marketplace.local.spec.ts',workers:1,retries:0,maxFailures:1,timeout:120000,outputDir:${JSON.stringify(join(output,'traces'))},reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output,'results.json'))}}]],use:{actionTimeout:15000,baseURL:'http://127.0.0.1:38520',launchOptions:{executablePath:${JSON.stringify(process.env.KEBU_CHROMIUM_EXECUTABLE_PATH)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:38521',NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-local-fixture',NEXT_PUBLIC_APP_URL:'http://127.0.0.1:38520',SUPABASE_SERVICE_ROLE_KEY:serviceKey,KEBU_APP_MARKETPLACE_QA:'true',KEBU_PUBLIC_LIVE_QA:'false',ADMIN_SESSION_SECRET:'marketplace-local-fixture-admin-secret',ADMIN_PASSWORD:'fixture-password-not-for-production',VERCEL_ENV:'',DATABASE_URL:'',KEBU_MARKETPLACE_SCREENSHOTS:output,NEXT_TELEMETRY_DISABLED:'1'};
rmSync(join(root,".next/dev"),{recursive:true,force:true});
let server,tests;
async function stop(child){if(!child||child.exitCode!==null)return;await new Promise(done=>{const t=setTimeout(()=>child.kill('SIGKILL'),5000);child.once('close',()=>{clearTimeout(t);done();});child.kill();});}
try{
 const log=createWriteStream(join(output,'server.log'));
 server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','38520'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
 server.stdout.pipe(log);server.stderr.pipe(log);
 await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('Local startup timeout')),60000);server.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);done();}});server.once('exit',code=>{clearTimeout(timer);fail(Error('Next exited '+code));});});
 tests=spawn(process.execPath,[join(root,'node_modules/playwright/cli.js'),'test','--config',config],{cwd:root,env,stdio:'inherit'});
 const code=await new Promise(done=>tests.once('exit',done));
 console.log('MARKETPLACE_BROWSER_RESULT',JSON.stringify({exitCode:code,sqlQueries:queries,output,hosted:false}));
 if(code!==0)throw Error('Local browser verification failed.');
}finally{await stop(tests);await stop(server);await new Promise(done=>backend.close(done));await db.close();rmSync(temp,{recursive:true,force:true});}
