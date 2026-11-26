import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
if (!process.env.KEBU_PGLITE_MODULE_PATH) throw Error('Set KEBU_PGLITE_MODULE_PATH to the installed PGlite module.');
const { PGlite } = await import(pathToFileURL(process.env.KEBU_PGLITE_MODULE_PATH).href);
const db = new PGlite();
const ids = { owner:'11111111-1111-4111-8111-111111111111', editor:'22222222-2222-4222-8222-222222222222', viewer:'33333333-3333-4333-8333-333333333333', stranger:'44444444-4444-4444-8444-444444444444', design:'55555555-5555-4555-8555-555555555555' };
let passed = 0;
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
try {
  // Isolated prerequisites; production policy/trigger SQL below is loaded verbatim.
  await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to authenticated,anon,service_role;
    grant execute on function auth.uid() to authenticated,anon,service_role;
    create table public.create_designs(id uuid primary key, owner_id uuid not null references auth.users(id), business_id uuid, folder_id uuid, canvas jsonb not null default '{}', title text default 'Original', updated_at timestamptz not null default now());
    alter table public.create_designs enable row level security;
    grant all on public.create_designs to authenticated,service_role;
    grant select on public.create_designs to anon;
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;`);
  for(const key of ['owner','editor','viewer','stranger']) await db.query('insert into auth.users values ($1)',[ids[key]]);
  await db.query('insert into create_designs(id,owner_id) values ($1,$2)',[ids.design,ids.owner]);
  for(const path of [
    'supabase/migrations_archive/legacy/071_studio_design_collaborators.sql',
    'supabase/migrations/20260922012000_fix_studio_design_rls_recursion.sql',
    'supabase/migrations/20260922014500_fix_studio_design_owner_returning_rls.sql',
    'supabase/migrations_archive/legacy/078_studio_design_versions.sql',
  ]) await db.exec(read(path));
  await db.query(`insert into studio_design_collaborators(design_id,user_id,email,role) values ($1,$2,'editor@example.test','editor'),($1,$3,'viewer@example.test','viewer')`,[ids.design,ids.editor,ids.viewer]);
  async function asUser(key, sql, params=[]) {
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[key]]);
    try { return await db.query(sql,params); } finally { await db.exec('reset role'); }
  }
  // Reproduce the old direct-access defect before installing the guard locally.
  await asUser('editor','update create_designs set owner_id=$1 where id=$2',[ids.editor,ids.design]);
  assert.equal((await db.query('select owner_id from create_designs')).rows[0].owner_id,ids.editor);
  await db.query('update create_designs set owner_id=$1',[ids.owner]);
  await db.exec(read('supabase/migrations/20261014033708_studio_design_identity_guard.sql'));
  for(const key of ['owner','editor','viewer']) { assert.equal((await asUser(key,'select id from create_designs')).rows.length,1); passed++; }
  assert.equal((await asUser('stranger','select id from create_designs')).rows.length,0); passed++;
  assert.equal((await asUser('editor',"update create_designs set title='Edited' returning id")).rows.length,1); passed++;
  assert.equal((await asUser('viewer',"update create_designs set title='Forbidden' returning id")).rows.length,0); passed++;
  for(const key of ['editor','owner']) { await assert.rejects(asUser(key,'update create_designs set owner_id=$1',[ids.stranger]),e=>e.code==='42501'); passed++; }
  await assert.rejects(asUser('editor','update create_designs set business_id=$1',[ids.stranger]),e=>e.code==='42501'); passed++;
  await assert.rejects(asUser('editor','update create_designs set folder_id=$1',[ids.stranger]),e=>e.code==='42501'); passed++;
  assert.equal((await asUser('owner','update create_designs set folder_id=$1 returning id',[ids.stranger])).rows.length,1); passed++;
  await asUser('editor',"insert into studio_design_versions(design_id,created_by,canvas,source) values ($1,$2,'{}','manual')",[ids.design,ids.editor]); passed++;
  assert.equal((await asUser('viewer','select id from studio_design_versions')).rows.length,1); passed++;
  assert.equal((await asUser('stranger','select id from studio_design_versions')).rows.length,0); passed++;
  await assert.rejects(asUser('viewer',"insert into studio_design_versions(design_id,created_by,canvas,source) values ($1,$2,'{}','manual')",[ids.design,ids.viewer]),e=>e.code==='42501'); passed++;
  await asUser('owner',"update studio_design_collaborators set status='revoked' where user_id=$1",[ids.editor]);
  assert.equal((await asUser('editor','select id from create_designs')).rows.length,0); passed++;
  assert.equal((await asUser('editor','select id from studio_design_versions')).rows.length,0); passed++;
  // Database predicate rejects an outdated exact timestamp rather than rounding precision.
  await db.query("update create_designs set updated_at='2026-10-13T18:00:00.000456Z'");
  assert.equal((await asUser('owner',"update create_designs set title='Stale' where updated_at='2026-10-13T18:00:00.000123Z' returning id")).rows.length,0); passed++;
  await db.exec(`create table public.rooms(id uuid primary key);
    create table public.room_members(room_id uuid, user_id uuid, role text);
    grant select on public.rooms,public.room_members to authenticated;
    create function public.can_access_room(p_room uuid) returns boolean language sql stable security definer set search_path='' as $$
      select exists(select 1 from public.room_members where room_id=p_room and user_id=auth.uid()) $$;`);
  await db.query('insert into rooms values ($1)',[ids.design]);
  for(const [key,role] of [['owner','owner'],['editor','member'],['viewer','member']]) await db.query('insert into room_members values ($1,$2,$3)',[ids.design,ids[key],role]);
  await db.exec(read('supabase/migrations/20260920090000_room_files.sql'));
  await db.exec('grant select,insert,delete on public.room_files to authenticated');
  // Reproduce a forged metadata pointer accepted by the former policy.
  await asUser('editor',"insert into room_files(room_id,uploaded_by,file_name,storage_path,byte_size) values ($1,$2,'Forged.pdf','someone-else/private.pdf',100)",[ids.design,ids.editor]);
  assert.equal((await db.query("delete from room_files where storage_path='someone-else/private.pdf' returning id")).rows.length,1);
  await db.exec(read('supabase/migrations/20261014034852_room_file_storage_identity.sql'));
  await assert.rejects(asUser('editor',"insert into room_files(room_id,uploaded_by,file_name,storage_path,byte_size) values ($1,$2,'Forged.pdf','someone-else/private.pdf',100)",[ids.design,ids.editor]),e=>e.code==='42501'); passed++;
  await asUser('editor',"insert into room_files(room_id,uploaded_by,file_name,storage_path,byte_size) values ($1,$2,'Private.pdf',$3,100)",[ids.design,ids.editor,`${ids.editor}/rooms/${ids.design}/private.pdf`]);
  assert.equal((await asUser('viewer','select id from room_files')).rows.length,1); passed++;
  assert.equal((await asUser('viewer','delete from room_files returning id')).rows.length,0); passed++;
  assert.equal((await asUser('stranger','select id from room_files')).rows.length,0); passed++;
  assert.equal((await asUser('owner','delete from room_files returning id')).rows.length,1); passed++;
  console.log(JSON.stringify({ passed, reproducedOwnershipEscalationBeforeFix:true, reproducedForgedRoomPointerBeforeFix:true, engine:'PGlite', hosted:false }));
} finally { await db.close(); }
