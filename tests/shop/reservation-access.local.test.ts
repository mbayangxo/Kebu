import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Db = { exec(sql: string): Promise<unknown>; query<T>(sql: string): Promise<{ rows: T[] }>; close(): Promise<void> };
let db: Db;
const migration = readFileSync(resolve("supabase/migrations/20261010003722_qa_checkout_reservation_access.sql"), "utf8");
const names = ["reserve_multi_shop_checkout", "commit_shop_checkout", "release_shop_checkout", "complete_shop_payment", "cancel_shop_order", "create_cart_order_atomic"];
let bodies: unknown[];
async function asRole(role: string, sql: string) {
  await db.exec("begin; set local role " + role);
  try { return await db.query(sql); } finally { await db.exec("rollback"); }
}
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("checkout reservation PostgreSQL access boundary", () => {
  beforeAll(async () => {
    const { PGlite } = await import(pathToFileURL(resolve(process.env.KEBU_LOCAL_PGLITE_ROOT!, "dist/index.js")).href);
    db = new PGlite();
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;");
    await db.exec(migration); // Optional legacy objects absent.
    await db.exec("create table shop_checkout_reservations(id integer primary key, quantity integer); insert into shop_checkout_reservations values(1,1); grant all on shop_checkout_reservations to anon,authenticated; grant select(quantity),update(quantity) on shop_checkout_reservations to anon,authenticated;");
    for (const name of names) await db.exec("create function " + name + "(integer) returns integer language sql security definer as $$ update public.shop_checkout_reservations set quantity=quantity+1 where id=$1 returning quantity $$; grant execute on function " + name + "(integer) to anon,authenticated;");
    await db.exec("create function unrelated_checkout_probe() returns integer language sql as $$ select 7 $$;");
    expect((await asRole("anon", "select commit_shop_checkout(1) as value")).rows).toEqual([{ value: 2 }]);
    bodies = (await db.query("select proname,prosrc from pg_proc where proname in (" + names.map(n => "'" + n + "'").join(",") + ") order by proname")).rows;
    await db.exec(migration);
  }, 60000);
  afterAll(async () => { if (db) await db.close(); });
  const direct = ["select * from shop_checkout_reservations", "select quantity from shop_checkout_reservations", "insert into shop_checkout_reservations values(2,9)", "update shop_checkout_reservations set quantity=99 where id=1", "delete from shop_checkout_reservations where id=1"];
  for (const role of ["anon", "authenticated"]) {
    for (const sql of direct) it(role + " denies " + sql, async () => {
      await expect(asRole(role, sql)).rejects.toMatchObject({ code: "42501" });
      expect((await db.query("select * from shop_checkout_reservations")).rows).toEqual([{ id: 1, quantity: 1 }]);
    });
    for (const name of names) it(role + " denies privileged " + name, async () => {
      await expect(asRole(role, "select " + name + "(1)")).rejects.toMatchObject({ code: "42501" });
      expect((await db.query("select * from shop_checkout_reservations")).rows).toEqual([{ id: 1, quantity: 1 }]);
    });
  }
  it("RLS still hides rows after accidental SELECT regrant", async () => {
    await db.exec("grant select on shop_checkout_reservations to anon,authenticated");
    try { for (const role of ["anon", "authenticated"]) expect((await asRole(role, "select * from shop_checkout_reservations")).rows).toEqual([]); }
    finally { await db.exec(migration); }
  });
  it("retains service CRUD, every privileged RPC and unchanged bodies after repeated repair", async () => {
    await db.exec(migration);
    expect((await db.query("select proname,prosrc from pg_proc where proname in (" + names.map(n => "'" + n + "'").join(",") + ") order by proname")).rows).toEqual(bodies);
    expect((await asRole("service_role", "insert into shop_checkout_reservations values(2,3) returning quantity")).rows).toEqual([{ quantity: 3 }]);
    expect((await asRole("service_role", "update shop_checkout_reservations set quantity=4 where id=1 returning quantity")).rows).toEqual([{ quantity: 4 }]);
    expect((await asRole("service_role", "delete from shop_checkout_reservations where id=1 returning id")).rows).toEqual([{ id: 1 }]);
    for (const name of names) expect((await asRole("service_role", "select " + name + "(1) as value")).rows).toEqual([{ value: 2 }]);
    expect((await db.query("select * from shop_checkout_reservations")).rows).toEqual([{ id: 1, quantity: 1 }]);
  });
  it("preserves unrelated browser RPC access", async () => {
    for (const role of ["anon", "authenticated"]) expect((await asRole(role, "select unrelated_checkout_probe() as value")).rows).toEqual([{ value: 7 }]);
  });
});
