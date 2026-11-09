import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
if (!process.env.KEBU_PGLITE_MODULE_PATH) throw Error('Set KEBU_PGLITE_MODULE_PATH. No hosted fallback.');
const {PGlite}=await import(pathToFileURL(process.env.KEBU_PGLITE_MODULE_PATH));
export async function setupMarketplace(db, legacy = false) {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    insert into auth.users values ('11111111-1111-4111-8111-111111111111','developer@example.test'),
      ('22222222-2222-4222-8222-222222222222','buyer@example.test'),
      ('33333333-3333-4333-8333-333333333333','other@example.test');
  `);
  if(legacy) await db.exec(`
    create table developer_apps(
      id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
      name text not null, tagline text, category text not null, pricing text not null default 'free',
      price_xof integer, status text not null default 'draft' check(status in ('draft','review','published')),
      installs integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
    );
    insert into developer_apps(owner_id,name,category,status,installs)
      values('11111111-1111-4111-8111-111111111111','Legacy app preserved','business_tool','published',7);
  `);
  await db.exec(readFileSync(resolve('supabase/migrations/20261108220614_developer_app_marketplace.sql'),'utf8'));
}
export async function sqlAs(db, uid, sql, values=[]) {
  return db.transaction(async tx=>{
    await tx.exec(`set local role ${uid==='service'?'service_role':uid?'authenticated':'anon'}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid==='service'?'':uid??'']);
    return tx.query(sql,values);
  });
}
const main=process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href;
if(main){
  const db=new PGlite();
  const developer='11111111-1111-4111-8111-111111111111', buyer='22222222-2222-4222-8222-222222222222', other='33333333-3333-4333-8333-333333333333';
  let checks=0;
  async function rejects(uid,sql,values,code){await assert.rejects(sqlAs(db,uid,sql,values),{code});checks++;}
  try{
    await setupMarketplace(db,true);
    assert.deepEqual((await db.query("select name,status,installs from developer_apps")).rows,
      [{name:'Legacy app preserved',status:'draft',installs:7}]);checks++;
    const input=['Working app','A usable free app','business_tool',developer];
    const saved=await sqlAs(db,developer,`insert into developer_apps(name,tagline,category,owner_id,description,launch_url,privacy_url,support_url)
      values($1,$2,$3,$4,'A real hosted app for local acceptance checks.','https://developer.example/app','https://developer.example/privacy','https://developer.example/support') returning id,revision`,input);
    const id=saved.rows[0].id;
    await rejects(developer,"update developer_apps set status='published' where id=$1",[id],'42501');
    await rejects(other,"insert into developer_apps(name,category,owner_id) values('Stolen app','business_tool',$1)",[developer],'42501');
    assert.equal((await sqlAs(db,other,"select * from developer_apps")).rows.length,0);checks++;
    await sqlAs(db,developer,"update developer_apps set status='review' where id=$1",[id]);
    await rejects(developer,"update developer_apps set name='Silent change' where id=$1",[id],'42501');
    await rejects(developer,"select marketplace_review_app($1,1,'published','Approved after review','self')",[id],'42501');
    await sqlAs(db,'service',"select marketplace_review_app($1,1,'published','Checked app, privacy and support','staff')",[id]);
    await rejects('service',"select marketplace_review_app($1,1,'published','Duplicate decision','staff')",[id],'40001');
    await sqlAs(db,buyer,"select marketplace_install_app($1,1)",[id]);
    await sqlAs(db,buyer,"select marketplace_install_app($1,1)",[id]);
    assert.equal((await sqlAs(db,buyer,"select * from developer_app_installs")).rows.length,1);checks++;
    assert.equal((await sqlAs(db,other,"select * from developer_app_installs")).rows.length,0);checks++;
    await rejects(other,"insert into developer_app_installs(user_id,app_id,revision,consent) values($1,$2,1,'launcher-only-v1')",[buyer,id],'42501');
    await sqlAs(db,'service',"select marketplace_review_app($1,1,'suspended','Policy issue confirmed','staff')",[id]);
    await rejects(other,"select marketplace_install_app($1,1)",[id],'40001');
    assert.equal((await sqlAs(db,buyer,"select * from developer_apps where id=$1",[id])).rows.length,0);checks++;
    assert.equal((await sqlAs(db,buyer,"select app_name from developer_app_installs where app_id=$1",[id])).rows[0].app_name,'Working app');checks++;
    await sqlAs(db,'service',"select marketplace_review_app($1,1,'rejected','Fix the support page','staff')",[id]);
    await sqlAs(db,developer,"update developer_apps set status='draft',name='Revised app' where id=$1",[id]);
    await sqlAs(db,developer,"update developer_apps set status='review' where id=$1",[id]);
    await rejects('service',"select marketplace_review_app($1,1,'published','Stale approval','staff')",[id],'40001');
    await sqlAs(db,'service',"select marketplace_review_app($1,2,'published','Rechecked revised app','staff')",[id]);
    const oldInstall=(await sqlAs(db,buyer,"select revision from developer_app_installs")).rows[0].revision;
    const published=(await sqlAs(db,buyer,"select revision from developer_apps where id=$1",[id])).rows[0].revision;
    assert.notEqual(oldInstall,published);checks++;
    await sqlAs(db,buyer,"select marketplace_install_app($1,2)",[id]);
    await sqlAs(db,buyer,"delete from developer_app_installs where app_id=$1",[id]);
    assert.equal((await sqlAs(db,buyer,"select * from developer_app_installs")).rows.length,0);checks++;
    await sqlAs(db,developer,"update developer_apps set status='draft' where id=$1",[id]);
    await rejects(buyer,"select marketplace_install_app($1,2)",[id],'40001');
    assert.equal((await sqlAs(db,developer,"select * from developer_app_reviews")).rows.length,4);checks++;
    assert.equal((await sqlAs(db,buyer,"select * from developer_app_reviews")).rows.length,0);checks++;
    await rejects(null,"select * from developer_apps",[],'42501');
    console.log('MARKETPLACE_SQL_RESULT',JSON.stringify({checks,status:'passed',hosted:false}));
  }finally{await db.close();}
}
