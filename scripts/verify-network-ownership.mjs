/* Run with an installed @electric-sql/pglite, or set PGLITE_MODULE to its absolute entry path. */
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const root = new URL("../", import.meta.url).pathname;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
await db.exec(`create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table user_profiles(id uuid primary key);
insert into user_profiles values ('${owner}'), ('${other}');
create function uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
create function update_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
alter default privileges in schema public grant all on tables to anon, authenticated;`);
await db.exec(readFileSync(root + "supabase/migrations/002_network.sql", "utf8"));
const fields = "user_id,name,location,country,sector,headline,building,offering,stage";
const values = user => `${user},'Awa','Dakar','Senegal','Design','Studio','Local studio','Design','Idea'`;
async function as(role, user, sql) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}; set local \"request.jwt.claim.sub\" = '${user ?? ""}'`);
    const result = await db.query(sql);
    await db.exec("commit");
    return result;
  } catch (error) { await db.exec("rollback"); throw error; }
}
let checks = 0;
async function denies(role,user,sql) {
  await assert.rejects(as(role,user,sql)); checks++;
}
await as('anon',null,`insert into network_profiles(${fields}) values (${values('null')})`);
console.log('Baseline reproduced: anonymous ownerless insert succeeds.');
await db.exec('delete from network_profiles');
const before = await db.query('select count(*)::int n from network_profiles');
await db.exec(readFileSync(root + "supabase/migrations/20261011005205_network_profile_ownership.sql", "utf8"));
await denies('anon',null,`insert into network_profiles(${fields}) values (${values('null')})`);
await denies('authenticated',owner,`insert into network_profiles(${fields}) values (${values('null')})`);
await denies('authenticated',owner,`insert into network_profiles(${fields}) values (${values(`'${other}'`)})`);
await as('authenticated',owner,`insert into network_profiles(${fields}) values (${values(`'${owner}'`)})`); checks++;
const row = (await as('authenticated',owner,'select id from network_profiles')).rows[0];
await denies('authenticated',owner,`update network_profiles set user_id='${other}' where id='${row.id}'`);
await denies('authenticated',owner,`update network_profiles set is_verified=true where id='${row.id}'`);
await denies('authenticated',owner,`update network_profiles set contact_count=100 where id='${row.id}'`);
await denies('authenticated',owner,`insert into network_profiles(${fields},is_verified) values (${values(`'${owner}'`)},true)`);
assert.equal((await as('authenticated',other,`update network_profiles set headline='Hacked' where id='${row.id}' returning id`)).rows.length,0); checks++;
await as('authenticated',owner,`update network_profiles set is_visible=false where id='${row.id}'`); checks++;
assert.equal((await as('authenticated',owner,`select id from network_profiles where id='${row.id}'`)).rows.length,1); checks++;
assert.equal((await as('authenticated',other,`select id from network_profiles where id='${row.id}'`)).rows.length,0); checks++;
await as('authenticated',owner,`update network_profiles set headline='Updated',is_visible=true where id='${row.id}'`); checks++;
assert.equal((await as('authenticated',other,`select id from network_profiles where id='${row.id}'`)).rows.length,1); checks++;
await denies('anon',null,'select * from network_profiles');
await denies('authenticated',owner,`delete from network_profiles where id='${row.id}'`);
await db.exec(readFileSync(root + "supabase/migrations/20261011005205_network_profile_ownership.sql", "utf8"));
assert.equal((await db.query('select count(*)::int n from network_profiles')).rows[0].n,1); checks++;
assert.equal(before.rows[0].n,0); checks++;
await db.close();
console.log(`${checks} actual PostgreSQL ownership/visibility/trust/retention checks passed.`);
