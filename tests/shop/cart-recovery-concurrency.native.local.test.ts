/** Disposable local database only. Uses observed blocking PIDs, never sleep as proof. */
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error pg is present; @types/pg is not part of this repository.
import { Pool } from "pg";
import { setupCartDatabase, project, first, attempt } from "./cart-database-fixture";
import { startCartPostgres } from "./local-postgres";

const url = process.env.KEBU_CART_TEST_DATABASE_URL;
const bin = process.env.KEBU_CART_POSTGRES_BIN;
let local: Awaited<ReturnType<typeof startCartPostgres>> | undefined;
const name = `kebu_cart_${randomUUID().replaceAll("-", "")}`;
let admin: Pool, pool: Pool;
const placeSql = "select public.create_shop_cart_atomic($1,$2,$3,$4,null,null,null,null) as result";
const recoverSql = "select public.recover_shop_cart_attempt($1,$2) as result";
const variant = "00000000-0000-4000-8000-000000000011";
function args(id = attempt) {
  return [id, "a".repeat(64), JSON.stringify({ project_id: project, product_id: first, product_name: "Fixture", quantity: 1,
    customer_name: "Test", customer_phone: "00000000", status: "pending", order_number: id }),
  JSON.stringify([{ product_id: first, variant_id: variant, product_name: "Fixture", price_label: "100 XOF", quantity: 1, sort_order: 0 }])];
}
async function barrier(waiter: number, blocker: number) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const { rows } = await pool.query("select $1::int = any(pg_blocking_pids($2::int)) as blocked", [blocker, waiter]);
    if (rows[0].blocked) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected database lock was never observed");
}
async function sessions() {
  const a = await pool.connect(), b = await pool.connect();
  const aid = (await a.query("select pg_backend_pid() as pid")).rows[0].pid;
  const bid = (await b.query("select pg_backend_pid() as pid")).rows[0].pid;
  return { a, b, aid, bid, close: async () => {
    await a.query("rollback"); await b.query("rollback"); a.release(); b.release();
  } };
}
describe.skipIf(!url && !bin)("cart checkout, recovery and cancellation across independent PostgreSQL sessions", () => {
  beforeAll(async () => {
    if (bin) local = await startCartPostgres(bin);
    const connection = local?.url ?? url!;
    if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(connection).hostname)) {
      throw new Error("Cart concurrency tests require a local disposable PostgreSQL server");
    }
    admin = new Pool({ connectionString: connection });
    await admin.query(`create database "${name}"`);
    const target = new URL(connection); target.pathname = `/${name}`;
    pool = new Pool({ connectionString: target.href, max: 6 });
    await setupCartDatabase({ exec: (sql: string) => pool.query(sql) });
  }, 20000);
  afterAll(async () => {
    await pool?.end();
    if (admin) { await admin.query(`drop database if exists "${name}"`); await admin.end(); }
    await local?.stop();
  });
  beforeEach(async () => {
    await pool.query("truncate shop_orders cascade; truncate shop_cart_order_attempts,shop_cart_closed_attempts;");
    await pool.query("update project_products set stock_qty=1,track_stock=true,has_variants=true");
    await pool.query("delete from project_product_variants");
    await pool.query("insert into project_product_variants values($1,$2,$3,true,1)", [variant, project, first]);
  });

  it("serializes identical attempts and reserves both stock quantities only once", async () => {
    const s = await sessions();
    try {
      await s.a.query("begin");
      const firstOrder = (await s.a.query(placeSql, args())).rows[0].result;
      const pending = s.b.query(placeSql, args());
      await barrier(s.bid, s.aid);
      await s.a.query("commit");
      expect((await pending).rows[0].result).toEqual({ id: firstOrder.id, order_number: firstOrder.order_number, replayed: true });
      expect((await pool.query("select stock_qty from project_product_variants")).rows[0].stock_qty).toBe(0);
      expect((await pool.query("select count(*)::int as n from shop_orders")).rows[0].n).toBe(1);
    } finally { await s.close(); }
  });

  it("waits for an in-flight checkout before reporting its saved receipt", async () => {
    const s = await sessions();
    try {
      await s.a.query("begin"); await s.a.query(placeSql, args());
      const pending = s.b.query(recoverSql, [project, attempt]);
      await barrier(s.bid, s.aid); await s.a.query("commit");
      expect((await pending).rows[0].result).toEqual({ state: "saved", order_number: attempt });
    } finally { await s.close(); }
  });

  it("fences a delayed checkout when recovery closes its empty attempt first", async () => {
    const s = await sessions();
    try {
      await s.a.query("begin"); await s.a.query(recoverSql, [project, attempt]);
      // Capture rejection immediately so it cannot become an unhandled promise.
      const pending = s.b.query(placeSql, args()).then(() => null, (error: Error) => error);
      await barrier(s.bid, s.aid); await s.a.query("commit");
      expect((await pending)?.message).toContain("Checkout attempt is closed");
      expect((await pool.query("select count(*)::int as n from shop_orders")).rows[0].n).toBe(0);
      expect((await pool.query("select stock_qty from project_product_variants")).rows[0].stock_qty).toBe(1);
    } finally { await s.close(); }
  });

  it("does not oversell when two different attempts compete for the last variant", async () => {
    const s = await sessions();
    try {
      await s.a.query("begin"); await s.a.query(placeSql, args());
      const pending = s.b.query(placeSql, args(randomUUID())).then(() => null, (error: Error) => error);
      await barrier(s.bid, s.aid); await s.a.query("commit");
      expect((await pending)?.message).toContain("Insufficient stock");
      expect((await pool.query("select count(*)::int as n from shop_orders")).rows[0].n).toBe(1);
    } finally { await s.close(); }
  });

  it("cancels concurrently without restoring product or variant stock twice", async () => {
    const saved = (await pool.query(placeSql, args())).rows[0].result;
    const s = await sessions();
    try {
      await s.a.query("begin");
      await s.a.query("select * from cancel_shop_order_atomic($1,$2)", [saved.id, project]);
      const pending = s.b.query("select * from cancel_shop_order_atomic($1,$2)", [saved.id, project]);
      await barrier(s.bid, s.aid); await s.a.query("commit");
      expect((await pending).rows[0]).toMatchObject({ already_cancelled: true, restored: false });
      expect((await pool.query("select stock_qty from project_products where id=$1", [first])).rows[0].stock_qty).toBe(1);
      expect((await pool.query("select stock_qty from project_product_variants")).rows[0].stock_qty).toBe(1);
    } finally { await s.close(); }
  });
});
