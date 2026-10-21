import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — installed pg has no @types/pg project dependency
import { Pool } from "pg";
import { assertLocalPublishDatabase } from "./publish-db-setup";
import { dropNativeFixtureDatabase } from "./native-postgres-cleanup";
type Connection = { query: (sql: string, args?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>; release: () => void };
type DatabasePool = { query: Connection["query"]; connect: () => Promise<Connection>; end: () => Promise<void> };
const adminUrl = process.env.KEBU_PUBLISH_CONCURRENCY_DATABASE_URL;
const database = `_kebutest_publish_${randomUUID().replaceAll("-", "")}`;
let admin: DatabasePool | undefined, pool: DatabasePool | undefined, created = false;
describe.skipIf(!adminUrl)("native PostgreSQL teardown preserves active connections", () => {
  beforeAll(async () => {
    const url = assertLocalPublishDatabase(adminUrl!);
    admin = new Pool({ connectionString: url.href, max: 1 }) as DatabasePool;
    await admin.query(`create database "${database}"`); created = true;
    url.pathname = `/${database}`;
    pool = new Pool({ connectionString: url.href, max: 1 }) as DatabasePool;
  }, 60000);
  afterAll(async () => {
    try { if (pool) await pool.end(); }
    finally { try { if (created) await dropNativeFixtureDatabase(admin!, database); } finally { if (admin) await admin.end(); } }
  });
  it("refuses forced cleanup while a real backend is live, then drains and deletes normally", async () => {
    const held = await pool!.connect();
    try {
      await expect(dropNativeFixtureDatabase(admin!, database)).rejects.toThrow("refusing forced teardown");
      // The refused deletion must not terminate this session or remove its DB.
      expect((await held.query("select 1 as alive")).rows).toEqual([{ alive: 1 }]);
      expect((await admin!.query("select count(*)::int as total from pg_database where datname=$1", [database])).rows[0].total).toBe(1);
    } finally { held.release(); }
    await pool!.end(); pool = undefined;
    await dropNativeFixtureDatabase(admin!, database); created = false;
    expect((await admin!.query("select count(*)::int as total from pg_database where datname=$1", [database])).rows[0].total).toBe(0);
  }, 20000);
});
