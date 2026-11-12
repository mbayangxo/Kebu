/** Real Next handlers and SQL/RLS; loopback Auth/REST fixture, never hosted credentials. */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, constants, readdirSync, copyFileSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, createWriteStream, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
const source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suite = process.env.KEBU_PLATFORM_UI_SUITE ?? 'network';
if (!['network', 'login', 'preview'].includes(suite)) throw Error('Choose the network, login or preview local UI suite.');
const testMatch = {network:'network-persistence.local.spec.ts',login:'login.local.spec.ts',preview:'template-preview.local.spec.ts'}[suite];
const chromium = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH, modulePath = process.env.KEBU_PGLITE_MODULE_PATH;
if (!chromium || !modulePath) throw Error('Set local Chromium and PGlite paths. No hosted fallback.');
const output = process.env.KEBU_UI_OUTPUT_DIR ?? mkdtempSync(join(tmpdir(), 'kebu-network-results-'));
mkdirSync(output, { recursive: true });
const root = mkdtempSync(join(tmpdir(), 'kebu-network-source-'));
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const owner = '33333333-3333-4333-8333-333333333333', other = '44444444-4444-4444-8444-444444444444';
const read = path => readFileSync(join(source, path), 'utf8');
let backend, server, tests, log, queries = 0;
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(done => { const timer = setTimeout(() => child.kill('SIGKILL'), 5000); child.once('close', () => { clearTimeout(timer); done(); }); child.kill(); });
}
try {
 for (const directory of ['app','lib','public','scripts','supabase','tests','node_modules']) cpSync(join(source,directory),join(root,directory),{recursive:true,mode:constants.COPYFILE_FICLONE});
 for (const entry of readdirSync(source,{withFileTypes:true})) if(entry.isFile()&&!entry.name.startsWith('.')&&/\.(?:[cm]?[jt]sx?|json)$/.test(entry.name)) copyFileSync(join(source,entry.name),join(root,entry.name));
 // Browser auth uses a distinct loopback origin. Allow only that fixture in the
 // disposable copy; the real application's production CSP is never relaxed.
 const fixtureConfig = join(root, 'middleware.ts');
 const fixtureConfigSource = readFileSync(fixtureConfig, 'utf8');
 if (!fixtureConfigSource.includes("connect-src 'self' https:")) throw Error('Review the fixture CSP against the current Next configuration.');
 writeFileSync(fixtureConfig, fixtureConfigSource.replace("connect-src 'self' https:", "connect-src 'self' https: http://127.0.0.1:38437"));
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 create table user_profiles(id uuid primary key); insert into user_profiles values('${owner}'),('${other}');
 create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;
 create function update_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
 alter default privileges in schema public grant all on tables to anon,authenticated;`);
 await db.exec(read('supabase/migrations_archive/legacy/002_network.sql'));
 await db.exec(read('supabase/migrations/20261011005205_network_profile_ownership.sql'));
 const columns = new Set((await db.query("select column_name from information_schema.columns where table_name='network_profiles'")).rows.map(row=>row.column_name));
 function identity(req) {try {const raw=(req.headers.authorization??'').split(' ')[1];const id=JSON.parse(Buffer.from(raw.split('.')[1],'base64url').toString()).sub;return [owner,other].includes(id)?id:null;}catch{return null;}}
 backend=createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:38436');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,x-client-info,content-type');res.setHeader('Content-Type','application/json');
  const send=(status,data)=>{res.statusCode=status;res.end(JSON.stringify(data));};
  if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
  const url=new URL(req.url,'http://127.0.0.1:38437');
  try {
   if(url.pathname==='/__qa/reset'&&req.method==='POST'){await db.exec('truncate network_profiles');send(200,{ok:true});return;}
   if(url.pathname==='/__qa/state'){send(200,{profiles:(await db.query('select * from network_profiles order by joined_at,id')).rows,queries});return;}
   const uid=identity(req);
   if(url.pathname.startsWith('/auth/')){if(!uid){send(401,{message:'Fixture identity missing'});return;}send(200,{id:uid,email:'qa@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}});return;}
   if(url.pathname!=='/rest/v1/network_profiles'){send(404,{message:'Unsupported fixture endpoint'});return;}
   if(!uid){send(401,{code:'42501',message:'Fixture identity missing'});return;}
   const selected=(url.searchParams.get('select')??'*').split(',');
   if(selected.some(key=>key!=='*'&&!columns.has(key)))throw Error('Unsupported projection');
   const projection=selected.map(key=>key==='*'?'*':'"'+key+'"').join(',');
   const values=[],clauses=[];
   for(const [key,value] of url.searchParams){if(['select','order','limit'].includes(key))continue;if(!columns.has(key)||!value.startsWith('eq.'))throw Error('Unsupported filter');values.push(value.slice(3));clauses.push('"'+key+'"=$'+values.length);}
   let sql;
   if(req.method==='GET'){
    const order=(url.searchParams.get('order')??'joined_at.desc').split(',').map(part=>{const [key,direction]=part.split('.');if(!columns.has(key)||!['asc','desc'].includes(direction))throw Error('Unsupported order');return '"'+key+'" '+direction;});
    const limit=Number(url.searchParams.get('limit')??501);if(!Number.isInteger(limit)||limit<1||limit>501)throw Error('Unsupported limit');
    sql=`select ${projection} from network_profiles${clauses.length?' where '+clauses.join(' and '):''} order by ${order.join(',')} limit ${limit}`;
   }else if(req.method==='POST'){
    let bytes='';for await(const chunk of req)bytes+=chunk;const raw=JSON.parse(bytes),row=Array.isArray(raw)?raw[0]:raw;
    const keys=Object.keys(row);if(!keys.length||keys.some(key=>!columns.has(key)))throw Error('Unsupported insert');
    const params=keys.map(key=>{values.push(row[key]);return '$'+values.length;});sql=`insert into network_profiles(${keys.map(key=>'"'+key+'"').join(',')}) values(${params.join(',')}) returning ${projection}`;
   }else {send(405,{message:'Unsupported method'});return;}
   const result=await db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return tx.query(sql,values);});queries++;
   if((req.headers.accept??'').includes('object+json')){if(result.rows.length!==1){send(406,{code:'PGRST116',message:'Expected one row',details:`The result contains ${result.rows.length} rows`});return;}send(200,result.rows[0]);return;}
   send(req.method==='POST'?201:200,result.rows);
  }catch(error){send(error.code==='23505'?409:400,{code:error.code??'fixture_error',message:error.message});}
 });
 await new Promise((done,fail)=>{backend.once('error',fail);backend.listen(38437,'127.0.0.1',done);});
 const config=join(root,'scripts/network-ui-temporary.config.mjs');
 writeFileSync(config,`import{defineConfig}from'playwright/test';export default defineConfig({testDir:${JSON.stringify(join(root,'tests/platform'))},testMatch:${JSON.stringify(testMatch)},workers:1,retries:0,maxFailures:1,timeout:60000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(output,'results.json'))}}]],outputDir:${JSON.stringify(join(output,'traces'))},use:{actionTimeout:10000,baseURL:'http://127.0.0.1:38436',viewport:{width:1440,height:1000},launchOptions:{executablePath:${JSON.stringify(chromium)},args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote']}}});`);
 const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:38437',NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-local-fixture',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_SECRET_KEY:'',SUPABASE_URL:'',DATABASE_URL:'',ANTHROPIC_API_KEY:'',OPENAI_API_KEY:'',AI_GATEWAY_API_KEY:'',KEBU_REAL_PROVIDER_TEST:'',VERCEL_ENV:''};
 log=createWriteStream(join(output,'server.log'));server=spawn(process.execPath,[join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','38436'],{cwd:root,env,stdio:['ignore','pipe','pipe']});server.stdout.pipe(log);server.stderr.pipe(log);
 await new Promise((done,fail)=>{const timer=setTimeout(()=>fail(Error('Startup timeout')),30000);server.stdout.on('data',bytes=>{if(bytes.toString().includes('Ready')){clearTimeout(timer);done();}});server.once('exit',code=>{clearTimeout(timer);fail(Error('Server exit '+code));});});
 tests=spawn(process.execPath,[join(root,'node_modules/playwright/cli.js'),'test','--config',config],{cwd:root,env,stdio:'inherit'});
 const code=await new Promise((done,fail)=>{tests.once('exit',done);tests.once('error',fail);});
 const stats=JSON.parse(readFileSync(join(output,'results.json'),'utf8')).stats;
 writeFileSync(join(output,'verification.json'),JSON.stringify({...stats,sqlQueries:queries,transport:'loopback Auth/REST fixture; actual Next handlers and SQL/RLS'},null,2));
 console.log(suite === 'network' ? 'NETWORK_PERSISTENCE_RESULT' : suite.toUpperCase() + '_UI_RESULT',JSON.stringify({...stats,sqlQueries:queries}));
 if(code!==0||stats.unexpected||stats.skipped||stats.expected<1)throw Error('Network persistence gate failed');
}finally{
 await stop(tests);await stop(server);
 if(log&&!log.writableFinished)await new Promise(done=>log.end(done));
 if(backend?.listening)await new Promise(done=>backend.close(done));
 await db.close();rmSync(root,{recursive:true,force:true});
 const cleanup={sourceSandboxRemoved:!existsSync(root),serverStopped:!server||server.exitCode!==null||server.signalCode!==null,testsStopped:!tests||tests.exitCode!==null||tests.signalCode!==null};
 writeFileSync(join(output,'cleanup.json'),JSON.stringify(cleanup,null,2));console.log('NETWORK_CLEANUP',JSON.stringify(cleanup));
}
