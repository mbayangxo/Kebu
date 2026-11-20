import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {expect,it} from "vitest";
const root=process.env.KEBU_LOCAL_PGLITE_ROOT;
it.skipIf(!root)("Code workspace insert, revision update and read are confined to the signed-in owner",async()=>{
 const {PGlite}=await import(pathToFileURL(resolve(root!,"dist/index.js")).href);
 const db=new PGlite();
 try{
  await db.exec(`
  CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  GRANT USAGE ON SCHEMA auth TO authenticated,anon;
  INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
  `);
  await db.exec(readFileSync("supabase/migrations/20261120051423_kebu_code_workspaces.sql","utf-8"));
  await db.exec("SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';");
  const created=await db.query("INSERT INTO kebu_code_workspaces(title,files) VALUES ('App','{}') RETURNING id,revision");
  expect(created.rows[0].revision).toBe(1);
  expect((await db.query("UPDATE kebu_code_workspaces SET revision=2 WHERE revision=1 RETURNING revision")).rows).toEqual([{revision:2}]);
  expect((await db.query("UPDATE kebu_code_workspaces SET revision=3 WHERE revision=1 RETURNING revision")).rows).toEqual([]);
  await expect(db.exec("UPDATE kebu_code_workspaces SET owner_id='22222222-2222-4222-8222-222222222222'")).rejects.toThrow();
  await db.exec("SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'");
  expect((await db.query("SELECT id FROM kebu_code_workspaces")).rows).toEqual([]);
  expect((await db.query("UPDATE kebu_code_workspaces SET revision=3 RETURNING revision")).rows).toEqual([]);
  await db.exec("RESET ROLE; SET ROLE anon;");
  await expect(db.query("SELECT * FROM kebu_code_workspaces")).rejects.toThrow();
 }finally{await db.close();}
},20000);
