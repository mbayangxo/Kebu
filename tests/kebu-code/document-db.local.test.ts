import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
it.skipIf(!root)("applies the document migration and protects saved documents and revisions", async () => {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
    `);
    await db.exec(readFileSync("supabase/migrations/20261121222835_kebu_code_documents.sql", "utf8"));
    await db.exec("SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';");
    expect((await db.query("INSERT INTO kebu_code_documents(title) VALUES ('Proposal') RETURNING content,revision")).rows).toEqual([{ content: "", revision: 1 }]);
    expect((await db.query("UPDATE kebu_code_documents SET content='First draft',revision=2,history='[{\"revision\":1,\"content\":\"\"}]' WHERE revision=1 RETURNING revision")).rows).toEqual([{ revision: 2 }]);
    expect((await db.query("UPDATE kebu_code_documents SET revision=2 WHERE revision=1 RETURNING revision")).rows).toEqual([]);
    await expect(db.exec("UPDATE kebu_code_documents SET content=repeat('x',24001)")).rejects.toThrow(/check constraint/);
    await expect(db.exec("UPDATE kebu_code_documents SET owner_id='22222222-2222-4222-8222-222222222222'")).rejects.toThrow(/permission denied/);
    await db.exec("SET request.jwt.claims = '{\"is_anonymous\":true}'");
    expect((await db.query("SELECT content FROM kebu_code_documents")).rows).toEqual([]);
    await expect(db.exec("INSERT INTO kebu_code_documents(title) VALUES ('Anonymous')")).rejects.toThrow(/row-level security/);
    await db.exec("RESET request.jwt.claims; SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'");
    expect((await db.query("SELECT * FROM kebu_code_documents")).rows).toEqual([]);
    expect((await db.query("DELETE FROM kebu_code_documents RETURNING id")).rows).toEqual([]);
    await db.exec("RESET ROLE; SET ROLE anon");
    await expect(db.query("SELECT * FROM kebu_code_documents")).rejects.toThrow(/permission denied/);
    await db.exec("RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';");
    expect((await db.query("DELETE FROM kebu_code_documents RETURNING content")).rows).toEqual([{ content: "First draft" }]);
  } finally { await db.close(); }
}, 20000);
