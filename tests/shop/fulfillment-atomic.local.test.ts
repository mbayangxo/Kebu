/** Actual migration SQL in disposable PGlite; fixture schema is not hosted Auth. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec(sql: string): Promise<unknown>; query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>; close(): Promise<void> };
let db: Db;
const project = randomUUID();
const otherProject = randomUUID();
const option = randomUUID();
function order() {
  return { id: randomUUID(), project_id: project, shipping_option_id: option,
    product_name: "Book", customer_name: "Awa", customer_phone: "221770000000",
    amount_xof: 11000, shipping_amount_xof: 1000, order_number: randomUUID() };
}
async function create(row = order(), commission = 1500) {
  return db.query<{ result: { id: string; gift_public_id: string } }>(
    "select public.create_shop_order_with_fulfillment($1::jsonb, $2) as result", [JSON.stringify(row), commission]);
}
describe.skipIf(!root)("atomic fulfillment checkout (actual SQL, isolated fixture)", () => {
  beforeAll(async () => {
    const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
    const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
    db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(`
      create extension pgcrypto;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create role authenticated; create role anon; create role service_role bypassrls;
      grant usage on schema public, auth to authenticated, anon, service_role;
      alter default privileges in schema public grant all on tables to service_role;
      create table public.projects(id uuid primary key, owner_id uuid);
      create table public.shop_orders(
        id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id),
        product_name text not null, customer_name text not null, customer_phone text not null,
        amount_xof integer, shipping_amount_xof integer, order_number text,
        gift_public_id text default 'database-default', is_gift boolean default false,
        recipient_name text, recipient_phone text, recipient_email text, gift_message text
      );
      insert into public.projects values ('${project}',null), ('${otherProject}',null);
    `);
    for (const name of ["20261103135000_shop_shipping_options.sql", "20261104020000_shop_joko_fulfillment.sql", "20261105185404_shop_order_fulfillment_atomic.sql"]) {
      await db.exec(readFileSync(resolve("supabase/migrations", name), "utf8"));
    }
    await db.query("insert into public.shop_shipping_options(id, project_id, label, amount_xof, fulfillment_type, commission_bps) values($1,$2,'Pickup',1000,'joko_fulfillment',1500)", [option, project]);
    await db.exec("set role service_role");
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it("commits both records with the real column defaults and a goods-only commission", async () => {
    const row = order();
    const result = await create(row);
    expect(result.rows[0].result).toEqual({ id: row.id, order_number: row.order_number, gift_public_id: "database-default" });
    const saved = await db.query("select commission_xof,status from public.shop_fulfillment_orders where order_id=$1", [row.id]);
    expect(saved.rows).toEqual([{ commission_xof: 1500, status: "awaiting_pickup" }]);
  });
  it("rolls back the order when the fulfillment table is missing, then permits a safe retry", async () => {
    const row = order();
    await db.exec("reset role; alter table public.shop_fulfillment_orders rename to temporarily_unavailable; set role service_role");
    try {
      await expect(create(row)).rejects.toThrow();
      expect((await db.query("select id from public.shop_orders where id=$1", [row.id])).rows).toEqual([]);
    } finally {
      await db.exec("reset role; alter table public.temporarily_unavailable rename to shop_fulfillment_orders; set role service_role");
    }
    expect((await create(row)).rows[0].result.id).toBe(row.id);
  });
  it("rolls back on a fulfillment write failure after inserting the order", async () => {
    const row = order();
    await db.exec("reset role; alter table public.shop_fulfillment_orders add constraint forced_write_failure check (commission_xof = 0) not valid; set role service_role");
    try {
      await expect(create(row)).rejects.toThrow();
      expect((await db.query("select id from public.shop_orders where id=$1", [row.id])).rows).toEqual([]);
    } finally {
      await db.exec("reset role; alter table public.shop_fulfillment_orders drop constraint forced_write_failure; set role service_role");
    }
  });
  it("same-id replay preserves a human's progress and the original commission after prices change", async () => {
    const row = order(); await create(row);
    await db.query("update public.shop_fulfillment_orders set status='picked_up',note='Collected by ops' where order_id=$1", [row.id]);
    await db.query("update public.shop_shipping_options set commission_bps=2000 where id=$1", [option]);
    try {
      await create(row);
      expect((await db.query("select status,note,commission_xof from public.shop_fulfillment_orders where order_id=$1", [row.id])).rows)
        .toEqual([{ status: "picked_up", note: "Collected by ops", commission_xof: 1500 }]);
      expect(Number((await db.query<{ n: number }>("select count(*) as n from public.shop_orders where id=$1", [row.id])).rows[0].n)).toBe(1);
      await expect(create(row, 2000)).rejects.toThrow(/conflicts/);
    } finally { await db.query("update public.shop_shipping_options set commission_bps=1500 where id=$1", [option]); }
  });
  it("rejects altered amounts and cross-project options before creating an order", async () => {
    await expect(create(order(), 1650)).rejects.toThrow(/pricing changed/);
    await expect(create({ ...order(), project_id: otherProject })).rejects.toThrow(/option unavailable/);
    await expect(create({ ...order(), shipping_amount_xof: 1 })).rejects.toThrow(/pricing changed/);
  });
  it("keeps gift checkout fields and rejects arbitrary fields", async () => {
    const gift = { ...order(), is_gift: true, recipient_name: "May", recipient_phone: "221770000001", recipient_email: "may@example.test", gift_message: "For you", gift_public_id: "gift-test" };
    expect((await create(gift)).rows[0].result.gift_public_id).toBe("gift-test");
    await expect(create({ ...order(), payment_status: "paid" } as ReturnType<typeof order>)).rejects.toThrow(/Unsupported/);
  });
  it("denies the checkout RPC and fulfillment writes to anonymous users and sellers", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      try {
        await expect(create()).rejects.toThrow(/permission denied/);
        await expect(db.query("insert into public.shop_fulfillment_orders(order_id,project_id,commission_xof) values($1,$2,0)", [randomUUID(), project])).rejects.toThrow(/permission denied/);
      } finally { await db.exec("reset role; set role service_role"); }
    }
  });
  it("does not silently fill an old orphan from today's rates", async () => {
    const row = order();
    await db.query("insert into public.shop_orders(id,project_id,product_name,customer_name,customer_phone) values($1,$2,'Old','Awa','221770000000')", [row.id, project]);
    await expect(create(row)).rejects.toThrow(/manual reconciliation/);
    expect((await db.query("select id from public.shop_fulfillment_orders where order_id=$1", [row.id])).rows).toEqual([]);
  });
});
