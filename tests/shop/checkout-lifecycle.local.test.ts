import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { saveShopCheckout, markVerifiedShopPayment } from "@/lib/shop/checkout-persistence";
type Db = { exec(sql: string): Promise<unknown>; query<T>(sql: string, args?: unknown[]): Promise<{ rows: T[] }>; close(): Promise<void> };
let db: Db;
const project = "ab000000-0000-4000-8000-000000000001";
const product = "ab000000-0000-4000-8000-000000000002";
const second = "ab000000-0000-4000-8000-000000000003";
const variant = "ab000000-0000-4000-8000-000000000004";
const discount = "ab000000-0000-4000-8000-000000000005";
const gift = "ab000000-0000-4000-8000-000000000006";
const user = "ab000000-0000-4000-8000-000000000007";
async function rpc(name: string, args: Record<string, unknown>, role = "service_role") {
  const values = Object.values(args).map(value => typeof value === "object" && value !== null ? JSON.stringify(value) : value);
  await db.exec("begin; set local role " + role);
  try {
    const result = await db.query<{ value: unknown }>("select public." + name + "(" + Object.keys(args).map((key, i) => key + " => $" + (i + 1)).join(",") + ") as value", values);
    await db.exec("commit");
    return { data: result.rows[0].value, error: null };
  } catch (error) {
    await db.exec("rollback");
    return { data: null, error: error as { message: string; code: string } };
  }
}
const admin = { rpc } as unknown as SupabaseClient;
const header = (quantity = 2): Record<string, unknown> => ({ project_id: project, product_id: product, product_name: "Tee", price_label: "1000 XOF", quantity, customer_name: "Awa", customer_phone: "221770000000", order_number: "ORD-TEST", amount_xof: 2000 });
const item = (id = product, quantity = 2) => ({ product_id: id, product_name: "Tee", price_label: "1000 XOF", price_xof: 1000, quantity, line_amount_xof: quantity * 1000 });
const save = (h = header(), items: Record<string, unknown>[] = [item()], tender = {}) => saveShopCheckout(admin, h, items, tender);
const cancel = (id: string, p = project) => rpc("cancel_saved_shop_checkout", { p_order_id: id, p_project_id: p });
const scalar = async (sql: string) => (await db.query<{ value: number }>(sql)).rows[0].value;
const qty = () => scalar("select stock_qty as value from project_products where id='" + product + "'");
const orderCount = () => scalar("select count(*)::int as value from shop_orders");
const mustSave = async (h = header(), items: Record<string, unknown>[] = [item()], tender = {}) => {
  const result = await save(h, items, tender);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(result.error);
  return result.order.id;
};
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("checkout lifecycle through actual PostgreSQL RPC transactions", () => {
  beforeAll(async () => {
    const { PGlite } = await import(pathToFileURL(resolve(process.env.KEBU_LOCAL_PGLITE_ROOT!, "dist/index.js")).href);
    db = new PGlite();
    await db.exec("create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;");
    await db.exec(readFileSync(resolve("tests/shop/fixtures/checkout-schema.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010040345_shop_checkout_lifecycle.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010041659_shop_checkout_tender_integrity.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010043141_shop_payment_provider_binding.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010050241_shop_gift_refunds_and_returns.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010050611_shop_checkout_retry_receipts.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010051138_shop_cancelled_gift_ledger.sql"), "utf8"));
    await db.exec(`create schema storage; create table storage.buckets(id text primary key,name text,public boolean);
      create table public.shop_digital_downloads(id uuid primary key default gen_random_uuid(),
      order_id uuid not null references public.shop_orders(id) on delete cascade,project_id uuid not null,
      product_id uuid not null,token text not null unique check(char_length(token)=64),file_path text not null,
      file_name text not null default 'download',expires_at timestamptz not null,download_count int not null default 0,
      max_downloads int not null default 5,created_at timestamptz not null default now());
      alter table public.shop_digital_downloads enable row level security;`);
    await db.exec(readFileSync(resolve("supabase/migrations/20261010055208_shop_paid_digital_delivery.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010055739_shop_paypal_amount_binding.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010060127_shop_provider_checkout_expiry.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261010060730_shop_restoration_scope_integrity.sql"), "utf8"));
  }, 60000);
  beforeEach(async () => {
    await db.exec("truncate shop_checkout_requests,shop_order_returns,shop_external_refund_receipts,shop_checkout_effects,shop_order_items,shop_payment_ledger_events,shop_orders,project_product_variants,project_products,shop_discount_codes,shop_gift_cards,projects,auth.users cascade;");
    await db.query("insert into projects(id) values($1);", [project]);
    await db.query("insert into auth.users values($1)", [user]);
    for (const id of [product, second]) await db.query("insert into project_products(id,project_id,name,track_stock,stock_qty) values($1,$2,'Tee',true,10)", [id, project]);
    await db.query("insert into project_product_variants(id,product_id,project_id,name,stock_qty) values($1,$2,$3,'Small',5)", [variant, product, project]);
    await db.query("insert into shop_discount_codes(id,project_id,code,percent_off,max_uses) values($1,$2,'SAVE',10,1)", [discount, project]);
    await db.query("insert into shop_gift_cards(id,project_id,code,initial_balance_xof,balance_xof) values($1,$2,'GIFT01',1000,1000)", [gift, project]);
  });
  afterAll(async () => { if (db) await db.close(); });
  it("persists all lines, stock provenance and header together", async () => {
    await mustSave();
    expect(await qty()).toBe(8);
    expect(await orderCount()).toBe(1);
    expect(await scalar("select count(*)::int as value from shop_order_items")).toBe(1);
    expect(await scalar("select count(*)::int as value from shop_checkout_effects")).toBe(1);
  });
  it("replays the original checkout before depleted stock and tender validation", async () => {
    const h = { ...header(), _request_id: second, _request_fingerprint: "a".repeat(64),
      gift_card_code:"GIFT01",gift_card_amount_xof:1000,discount_code:"SAVE",discount_percent:10 };
    const tender = {giftCardId:gift,expectedGiftBalance:1000,discountId:discount};
    const first = await save(h,[item()],tender);
    expect(first.ok).toBe(true);
    await db.query("update project_products set stock_qty=0 where id=$1",[product]);
    const replay = await save({...h,order_number:"OTHER"},[item()],tender);
    expect(replay.ok && replay.order.replayed).toBe(true);
    expect(first.ok && replay.ok && replay.order.id===first.order.id).toBe(true);
    expect(await orderCount()).toBe(1);
    expect(await scalar("select balance_xof as value from shop_gift_cards")).toBe(0);
    expect(await scalar("select uses_count as value from shop_discount_codes")).toBe(1);
    expect((await save({...h,_request_fingerprint:"b".repeat(64)},[item()],tender)).ok).toBe(false);
  });
  it("rolls back attempt claims and refuses browser receipt access", async () => {
    const h = {...header(),_request_id:second,_request_fingerprint:"c".repeat(64)};
    expect((await save(h,[{...item(),product_name:""}])).ok).toBe(false);
    expect(await scalar("select count(*)::int as value from shop_checkout_requests")).toBe(0);
    const id = await mustSave(h);
    for (const role of ["anon","authenticated"]) {
      expect((await rpc("lookup_shop_checkout_request",{p_project_id:project,p_request_id:second,p_fingerprint:"c".repeat(64)},role)).error?.code).toBe("42501");
    }
    await expect(db.query("delete from shop_orders where id=$1",[id])).rejects.toThrow(/foreign key/);
  });
  const fullGiftHeader = () => ({ ...header(1), amount_xof: 0, gift_card_code: "GIFT01", gift_card_amount_xof: 1000 });
  const giftTender = () => ({ giftCardId: gift, expectedGiftBalance: 1000 });
  const returnArgs = (id: string, reference = "return-123") => ({ p_order_id: id, p_project_id: project, p_recorded_by: user, p_reference: reference });
  it("settles full gift credit atomically and refunds it once without restocking", async () => {
    const saved = await save(fullGiftHeader(), [item(product,1)], giftTender());
    expect(saved.ok && saved.order.paid).toBe(true);
    if (!saved.ok) throw Error(saved.error);
    const args = { p_order_id: saved.order.id, p_project_id: project };
    expect((await db.query("select status,payment_status from shop_orders")).rows[0]).toEqual({status:"contacted",payment_status:"paid"});
    expect(await scalar("select balance_xof as value from shop_gift_cards")).toBe(0);
    expect((await cancel(saved.order.id)).error).not.toBeNull();
    expect((await rpc("refund_gift_paid_shop_order", args)).error).toBeNull();
    expect((await rpc("refund_gift_paid_shop_order", args)).error).toBeNull();
    expect(await scalar("select balance_xof as value from shop_gift_cards")).toBe(1000);
    expect(await qty()).toBe(9);
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events where event_type='refunded'")).toBe(1);
  });
  it("rolls back the entire gift settlement when items fail", async () => {
    expect((await save(fullGiftHeader(), [{...item(product,1), product_name:""}], giftTender())).ok).toBe(false);
    expect(await scalar("select balance_xof as value from shop_gift_cards")).toBe(1000);
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events")).toBe(0);
    expect(await qty()).toBe(10);
  });
  it("refunds mixed gift and returned cash together once, keeping disabled and expired restrictions", async () => {
    const id = await mustSave({...header(),amount_xof:1500,gift_card_code:"GIFT01",gift_card_amount_xof:500}, [item()], giftTender());
    expect((await rpc("refund_gift_paid_shop_order", {p_order_id:id,p_project_id:project})).error).not.toBeNull();
    expect((await db.query("select payment_status from shop_orders")).rows[0]).toEqual({payment_status:"unpaid"});
    await db.query("update shop_orders set payment_status='paid' where id=$1",[id]);
    await db.exec("update shop_gift_cards set status='disabled',expires_at='2020-01-01'");
    const args = {...returnArgs(id),p_reference:"cash-receipt"};
    expect((await rpc("record_external_shop_refund",args)).error).toBeNull();
    expect((await rpc("record_external_shop_refund",args)).error).toBeNull();
    expect((await db.query("select balance_xof,status,expires_at<'2021-01-01' as expired from shop_gift_cards")).rows[0]).toEqual({balance_xof:1000,status:"disabled",expired:true});
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events where event_type='refunded'")).toBe(2);
    expect(await qty()).toBe(8);
  });
  it("restocks refunded variants once and prevents returned orders reopening", async () => {
    const id = await mustSave(fullGiftHeader(), [{...item(product,1),variant_id:variant}],giftTender());
    expect((await rpc("record_resalable_shop_return", returnArgs(id))).error).not.toBeNull();
    await rpc("refund_gift_paid_shop_order",{p_order_id:id,p_project_id:project});
    expect((await rpc("record_resalable_shop_return", returnArgs(id))).error).toBeNull();
    expect((await rpc("record_resalable_shop_return", returnArgs(id))).error).toBeNull();
    expect((await rpc("record_resalable_shop_return", returnArgs(id,"other-receipt"))).error?.message).toContain("different return");
    expect(await qty()).toBe(10);
    expect(await scalar("select stock_qty as value from project_product_variants")).toBe(5);
    await expect(db.query("update shop_orders set status='fulfilled' where id=$1",[id])).rejects.toThrow(/returned order/);
    expect(await scalar("select count(*)::int as value from shop_order_returns")).toBe(1);
  });
  it("rolls back partial restocking when a variant was removed", async () => {
    const id = await mustSave(fullGiftHeader(),[{...item(product,1),variant_id:variant}],giftTender());
    await rpc("refund_gift_paid_shop_order",{p_order_id:id,p_project_id:project});
    await db.query("delete from project_product_variants where id=$1",[variant]);
    expect((await rpc("record_resalable_shop_return",returnArgs(id))).error?.message).toContain("variant needs");
    expect(await qty()).toBe(9);
    expect(await scalar("select count(*)::int as value from shop_order_returns")).toBe(0);
  });
  it("rejects refund and return access outside the project and direct private helper calls", async () => {
    const id = await mustSave(fullGiftHeader(),[item(product,1)],giftTender());
    expect((await rpc("refund_gift_paid_shop_order",{p_order_id:id,p_project_id:second})).error).not.toBeNull();
    expect((await rpc("record_resalable_shop_return",{...returnArgs(id),p_project_id:second})).error).not.toBeNull();
    expect((await rpc("refund_shop_gift_tender",{p_order_id:id,p_project_id:project})).error?.code).toBe("42501");
    for (const role of ["anon","authenticated"]) {
      expect((await rpc("refund_gift_paid_shop_order",{p_order_id:id,p_project_id:project},role)).error?.code).toBe("42501");
      expect((await rpc("record_resalable_shop_return",returnArgs(id),role)).error?.code).toBe("42501");
    }
  });
  it("rolls back stock, header, discount and gift when an item fails", async () => {
    const result = await save({ ...header(), discount_code: "SAVE", discount_percent: 10, gift_card_code: "GIFT01", gift_card_amount_xof: 500 }, [{ ...item(), product_name: "" }],
      { discountId: discount, giftCardId: gift, expectedGiftBalance: 1000 });
    expect(result.ok).toBe(false);
    expect(await qty()).toBe(10);
    expect(await orderCount()).toBe(0);
    expect(await scalar("select uses_count as value from shop_discount_codes")).toBe(0);
    expect(await scalar("select balance_xof as value from shop_gift_cards")).toBe(1000);
  });
  it("rolls back header constraint failures", async () => {
    expect((await save({ ...header(), customer_name: "" })).ok).toBe(false);
    expect(await qty()).toBe(10);
    expect(await orderCount()).toBe(0);
  });
  it("refuses insufficient later cart lines without partial deductions", async () => {
    expect((await save(header(13), [item(product, 2), item(second, 11)])).ok).toBe(false);
    expect(await qty()).toBe(10);
    expect(await orderCount()).toBe(0);
  });
  it("aggregates duplicates before checking stock", async () => {
    expect((await save(header(12), [item(product, 6), item(product, 6)])).ok).toBe(false);
    expect(await qty()).toBe(10);
  });
  it("supports cart totals above 20 while retaining per-item limits", async () => {
    await db.exec("update project_products set stock_qty=30");
    await mustSave(header(30), [item(product, 15), item(second, 15)]);
    expect(await qty()).toBe(15);
    expect((await save(header(21), [item(product, 21)])).ok).toBe(false);
  });
  it("checks product ownership and missing variants", async () => {
    await db.exec("update project_products set has_variants=true where id='" + product + "'");
    expect((await save()).ok).toBe(false);
    expect((await save({ ...header(), project_id: second })).ok).toBe(false);
    expect(await qty()).toBe(10);
  });
  it("checks aggregate variant stock and restores it once", async () => {
    const line = { ...item(product, 3), variant_id: variant };
    expect((await save(header(6), [line, line])).ok).toBe(false);
    const id = await mustSave(header(3), [line]);
    expect(await scalar("select stock_qty as value from project_product_variants")).toBe(2);
    expect((await cancel(id)).error).toBeNull();
    expect((await cancel(id)).error).toBeNull();
    expect(await scalar("select stock_qty as value from project_product_variants")).toBe(5);
    expect(await qty()).toBe(10);
  });
  it("revalidates discount use limits at commit", async () => {
    const h = { ...header(), discount_code: "SAVE", discount_percent: 10 };
    await mustSave(h, [item()], { discountId: discount });
    expect((await save(h, [item()], { discountId: discount })).ok).toBe(false);
    expect(await qty()).toBe(8);
    expect(await orderCount()).toBe(1);
  });
  it("rejects stale gift balances and restores committed tender only once", async () => {
    const h = { ...header(), gift_card_code: "GIFT01", gift_card_amount_xof: 500 };
    const tender = { giftCardId: gift, expectedGiftBalance: 1000 };
    const id = await mustSave(h, [item()], tender);
    expect((await save(h, [item()], tender)).ok).toBe(false);
    await cancel(id); await cancel(id);
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events where provider='gift_card' and event_type='refunded'")).toBe(1);
    expect(await scalar("select balance_xof as value from shop_gift_cards")).toBe(1000);
    expect(await qty()).toBe(10);
  });
  it("cannot erase a used gift balance account or reactivate a disabled card on cancellation", async () => {
    const id = await mustSave({ ...header(), gift_card_code: "GIFT01", gift_card_amount_xof: 1000 },
      [item()], { giftCardId: gift, expectedGiftBalance: 1000 });
    await expect(db.query("delete from shop_gift_cards where id=$1", [gift])).rejects.toThrow(/foreign key/);
    await db.query("update shop_gift_cards set status='disabled' where id=$1", [gift]);
    await cancel(id);
    expect((await db.query<{balance_xof:number;status:string}>("select balance_xof,status from shop_gift_cards")).rows[0]).toEqual({balance_xof:1000,status:"disabled"});
  });
  it("restores only stock actually deducted despite tracking changes", async () => {
    await db.exec("update project_products set track_stock=false where id='" + product + "'");
    const untracked = await mustSave();
    await db.exec("update project_products set track_stock=true where id='" + product + "'");
    await cancel(untracked);
    expect(await qty()).toBe(10);
    const tracked = await mustSave();
    await db.exec("update project_products set track_stock=false where id='" + product + "'");
    await cancel(tracked);
    expect(await qty()).toBe(10);
  });
  for (const state of ["paid", "awaiting_payment"]) it("does not cancel " + state + " payments", async () => {
    const id = await mustSave();
    await db.query("update shop_orders set payment_status=$1 where id=$2", [state, id]);
    expect((await cancel(id)).error?.message).toContain("Resolve");
    expect(await qty()).toBe(8);
  });
  it("rejects cancellation outside the authorized project", async () => {
    const id = await mustSave();
    expect((await cancel(id, second)).error?.message).toContain("not found");
    expect(await qty()).toBe(8);
  });
  it("blocks direct status cancellation, reopening and late paid callbacks", async () => {
    const id = await mustSave();
    await expect(db.query("update shop_orders set status='cancelled' where id=$1", [id])).rejects.toThrow(/reconciliation/);
    await cancel(id);
    await expect(db.query("update shop_orders set status='pending' where id=$1", [id])).rejects.toThrow(/reopened/);
    await expect(db.query("update shop_orders set payment_status='paid',status='contacted' where id=$1", [id])).rejects.toThrow(/paid/);
    expect(await qty()).toBe(10);
  });
  it("refuses to guess legacy stock provenance", async () => {
    const id = await mustSave();
    await db.query("delete from shop_checkout_effects where order_id=$1", [id]);
    expect((await cancel(id)).error?.message).toContain("older order");
    expect(await qty()).toBe(8);
  });
  it("records externally returned refunds atomically and idempotently without restocking", async () => {
    const id = await mustSave();
    const args = { p_order_id: id, p_project_id: project, p_recorded_by: user, p_reference: "receipt-123" };
    expect((await rpc("record_external_shop_refund", args)).error?.message).toContain("paid order");
    await db.query("update shop_orders set payment_status='paid' where id=$1", [id]);
    expect((await rpc("record_external_shop_refund", args)).error).toBeNull();
    expect((await rpc("record_external_shop_refund", args)).error).toBeNull();
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events where event_type='refunded'")).toBe(1);
    expect(await qty()).toBe(8);
    await expect(db.query("update shop_orders set payment_status='paid' where id=$1", [id])).rejects.toThrow(/refunded/);
  });
  for (const role of ["anon", "authenticated"]) it(role + " cannot call lifecycle RPCs or alter provenance", async () => {
    const id = await mustSave();
    expect((await rpc("save_shop_checkout_atomic", { p_order: header(), p_items: [item()] }, role)).error?.code).toBe("42501");
    expect((await rpc("cancel_saved_shop_checkout", { p_order_id: id, p_project_id: project }, role)).error?.code).toBe("42501");
    expect((await rpc("record_external_shop_refund", { p_order_id: id, p_project_id: project, p_recorded_by: user, p_reference: "receipt" }, role)).error?.code).toBe("42501");
    expect((await rpc("mark_verified_shop_payment", { p_reference: "ref", p_provider: "wave", p_payment_id: null }, role)).error?.code).toBe("42501");
    await db.exec("begin;set local role " + role);
    await expect(db.exec("update shop_checkout_effects set cancelled_at=now()")).rejects.toThrow(/permission denied/);
    await db.exec("rollback");
  });
  it("records verified payment and one ledger event on replay, preserving fulfillment", async () => {
    const id = await mustSave();
    await db.query("update shop_orders set provider_reference='ref',payment_provider='wave',status='fulfilled' where id=$1", [id]);
    const opts = { reference: "ref", provider: "wave", paymentId: "payment-1" };
    expect((await markVerifiedShopPayment(admin, opts)).ok).toBe(true);
    expect((await markVerifiedShopPayment(admin, opts)).ok).toBe(true);
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events where event_type='paid'")).toBe(1);
    expect((await db.query<{status:string}>("select status from shop_orders")).rows[0].status).toBe("fulfilled");
    expect(await qty()).toBe(8);
  });
  it("rejects provider mismatch and ambiguous references", async () => {
    const id = await mustSave();
    await db.query("update shop_orders set provider_reference='ref',payment_provider='wave' where id=$1", [id]);
    expect((await markVerifiedShopPayment(admin, { reference: "ref", provider: "paypal" })).ok).toBe(false);
    expect((await markVerifiedShopPayment(admin, { reference: "ref" })).ok).toBe(false);
    expect((await rpc("mark_verified_shop_payment", { p_reference: "ref", p_provider: null, p_payment_id: null })).error?.message).toContain("provider");
    const other = await mustSave();
    await db.query("update shop_orders set provider_reference='ref',payment_provider='wave' where id=$1", [other]);
    expect((await markVerifiedShopPayment(admin, { reference: "ref", provider: "wave" })).ok).toBe(false);
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events")).toBe(0);
  });
  it("does not accept payment after cancellation", async () => {
    const id = await mustSave();
    await db.query("update shop_orders set provider_reference='ref',payment_provider='wave' where id=$1", [id]);
    await cancel(id);
    expect((await markVerifiedShopPayment(admin, { reference: "ref", provider: "wave" })).ok).toBe(false);
    expect(await qty()).toBe(10);
  });
  const digital = async (id = product) => db.query("update project_products set is_digital=true,digital_file_path=$2,digital_file_name='book.pdf',digital_dl_limit=1 where id=$1",[id,`${project}/${id}/original-book.pdf`]);
  const beginProvider = (id:string) => rpc("begin_shop_provider_checkout",{p_order_id:id,p_project_id:project,p_provider:"wave",p_reference:"held-ref",p_amount_xof:2000});
  it("rolls back expiry if a purchased variant disappeared instead of claiming restored stock",async()=>{
    await db.query("update project_products set has_variants=true where id=$1",[product]);
    const id=await mustSave(header(),[{...item(),variant_id:variant}]);await beginProvider(id);await finishProvider(id);
    await db.query("delete from project_product_variants where id=$1",[variant]);
    expect((await expireProvider(id)).error?.message).toContain("Recorded variant");expect(await qty()).toBe(8);
    expect((await db.query<{payment_status:string}>("select payment_status from shop_orders where id=$1",[id])).rows[0].payment_status).toBe("awaiting_payment");
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events where event_type='cancelled'")).toBe(0);
  });
  const finishProvider = (id:string) => rpc("finish_shop_provider_checkout",{p_order_id:id,p_project_id:project,p_provider:"wave",p_reference:"held-ref",p_payment_id:"cos-owned",p_checkout_url:"https://pay.wave.com/fixture",p_amount_value:"2000",p_currency:"XOF",p_expires_at:"2020-01-01T00:00:00Z"});
  const expireProvider = (id:string,reference="held-ref") => rpc("expire_verified_wave_checkout",{p_order_id:id,p_project_id:project,p_reference:reference,p_payment_id:"cos-owned"});
  it("claims provider initiation once and prevents cancellation while creating a session",async()=>{
    const id=await mustSave();expect((await beginProvider(id)).data).toBe(true);
    expect((await beginProvider(id)).error).toBeTruthy();expect((await cancel(id)).error).toBeTruthy();
    expect(await qty()).toBe(8);
  });
  it("preserves a paid callback that wins before the initiation response",async()=>{
    const id=await mustSave();await beginProvider(id);
    expect((await markVerifiedShopPayment(admin,{reference:"held-ref",provider:"wave",paymentId:"cos-owned"})).ok).toBe(true);
    expect((await finishProvider(id)).data).toBe(true);
    expect((await db.query<{payment_status:string}>("select payment_status from shop_orders where id=$1",[id])).rows[0].payment_status).toBe("paid");
    expect((await expireProvider(id)).error).toBeTruthy();expect(await qty()).toBe(8);
  });
  it("restores stock and mixed tender once after exact verified provider expiry",async()=>{
    const id=await mustSave({...header(),gift_card_code:"GIFT01",gift_card_amount_xof:1000},[item()],{giftCardId:gift,expectedGiftBalance:1000});
    await beginProvider(id);await finishProvider(id);
    expect((await expireProvider(id,"wrong-session")).error).toBeTruthy();expect(await qty()).toBe(8);
    expect((await expireProvider(id)).data).toBe(true);expect((await expireProvider(id)).data).toBe(true);
    expect(await qty()).toBe(10);expect(await scalar("select balance_xof as value from shop_gift_cards")).toBe(1000);
    expect(await scalar("select count(*)::int as value from shop_payment_ledger_events where provider='wave' and event_type='cancelled'")).toBe(1);
    expect((await markVerifiedShopPayment(admin,{reference:"held-ref",provider:"wave",paymentId:"cos-owned"})).ok).toBe(false);
  });
  it("refuses unknown expiry and browser access to provider lifecycle RPCs",async()=>{
    const id=await mustSave();await beginProvider(id);
    expect((await expireProvider(id)).error).toBeTruthy();expect(await qty()).toBe(8);
    for(const role of ["anon","authenticated"]) {
      expect((await rpc("begin_shop_provider_checkout",{p_order_id:id,p_project_id:project,p_provider:"wave",p_reference:"r",p_amount_xof:2000},role)).error?.code).toBe("42501");
      expect((await rpc("expire_verified_wave_checkout",{p_order_id:id,p_project_id:project,p_reference:"held-ref",p_payment_id:"cos-owned"},role)).error?.code).toBe("42501");
    }
  });
  const downloads = () => scalar("select count(*)::int as value from shop_digital_downloads");
  const token = async () => (await db.query<{token:string}>("select token from shop_digital_downloads order by created_at limit 1")).rows[0].token;
  const paid = async (id: string) => {
    await db.query("update shop_orders set provider_reference='digital-ref',payment_provider='wave' where id=$1",[id]);
    expect((await markVerifiedShopPayment(admin,{reference:"digital-ref",provider:"wave"})).ok).toBe(true);
  };
  it("creates no digital access before payment and preserves the purchased snapshot", async () => {
    await digital();
    const id = await mustSave({...header(),customer_email:"buyer@example.com"});
    expect(await downloads()).toBe(0);
    await db.query("update project_products set digital_file_path=$2 where id=$1",[product,`${project}/${product}/replacement.pdf`]);
    await paid(id); await paid(id);
    expect(await downloads()).toBe(1);
    const d=(await db.query<{file_path:string;recipient_email:string}>("select file_path,recipient_email from shop_digital_downloads")).rows[0];
    expect(d).toEqual({file_path:`${project}/${product}/original-book.pdf`,recipient_email:"buyer@example.com"});
  });
  it("issues every distinct digital cart line once and keeps physical lines out", async () => {
    await digital();await digital(second);
    const id=await mustSave(header(3),[item(product,1),item(second,1),item(product,1)]);
    await paid(id);await paid(id);
    expect(await downloads()).toBe(2);
  });
  it("issues full gift-credit delivery to the gift recipient inside settlement", async () => {
    await digital();
    await mustSave({...header(1),amount_xof:0,gift_card_code:"GIFT01",gift_card_amount_xof:1000,
      customer_email:"buyer@example.com",is_gift:true,recipient_name:"Moussa",recipient_phone:"221770000001",recipient_email:"recipient@example.com"},[item(product,1)],{giftCardId:gift,expectedGiftBalance:1000});
    expect(await downloads()).toBe(1);
    expect((await db.query<{recipient_email:string}>("select recipient_email from shop_digital_downloads")).rows[0].recipient_email).toBe("recipient@example.com");
  });
  it("withholds mixed-tender access until cash is verified and blocks refunded tokens", async () => {
    await digital();
    const id=await mustSave({...header(),gift_card_code:"GIFT01",gift_card_amount_xof:1000},[item()],{giftCardId:gift,expectedGiftBalance:1000});
    expect(await downloads()).toBe(0);await paid(id);
    const t=await token();
    expect((await rpc("resolve_paid_shop_download",{p_token:t})).data).toBeTruthy();
    expect((await rpc("record_external_shop_refund",{p_order_id:id,p_project_id:project,p_recorded_by:user,p_reference:"returned-cash"})).error).toBeNull();
    expect((await rpc("resolve_paid_shop_download",{p_token:t})).data).toBeNull();
    expect((await rpc("consume_paid_shop_download",{p_token:t})).data).toBe(false);
  });
  it("atomically consumes quota and denies expired, malformed and legacy tokens", async () => {
    await digital();const id=await mustSave();await paid(id);const t=await token();
    expect((await rpc("consume_paid_shop_download",{p_token:t})).data).toBe(true);
    expect((await rpc("consume_paid_shop_download",{p_token:t})).data).toBe(false);
    expect((await rpc("resolve_paid_shop_download",{p_token:t})).data).toBeNull();
    await db.exec("update shop_digital_downloads set download_count=0,expires_at=now()-interval '1 second'");
    expect((await rpc("consume_paid_shop_download",{p_token:t})).data).toBe(false);
    await db.exec("update shop_digital_downloads set expires_at=now()+interval '1 hour',delivery_version=0");
    expect((await rpc("resolve_paid_shop_download",{p_token:t})).data).toBeNull();
    expect((await rpc("consume_paid_shop_download",{p_token:"malformed"})).data).toBe(false);
  });
  it("leases emails once, retries failures and stops outside the deduplication window", async () => {
    await digital();const id=await mustSave({...header(),customer_email:"buyer@example.com"});await paid(id);
    const first=await rpc("claim_shop_digital_emails",{p_limit:5});
    expect((first.data as unknown[]).length).toBe(1);
    expect((await rpc("claim_shop_digital_emails",{p_limit:5})).data).toEqual([]);
    await db.exec("update shop_digital_downloads set notification_lease_until=now()-interval '1 second'");
    expect(((await rpc("claim_shop_digital_emails",{p_limit:5})).data as unknown[]).length).toBe(1);
    await db.exec("update shop_digital_downloads set notification_started_at=now()-interval '24 hours',notification_lease_until=now()-interval '1 second'");
    expect((await rpc("claim_shop_digital_emails",{p_limit:5})).data).toEqual([]);
  });
  it("refuses wrong-project files and grants no browser access to digital RPCs", async () => {
    await digital();await db.query("update project_products set digital_file_path='other/file.pdf' where id=$1",[product]);
    expect((await save()).ok).toBe(false);expect(await qty()).toBe(10);
    for(const role of ["anon","authenticated"]) for(const name of ["resolve_paid_shop_download","consume_paid_shop_download"]) {
      expect((await rpc(name,{p_token:"a".repeat(64)},role)).error?.code).toBe("42501");
    }
    for(const role of ["anon","authenticated"]) expect((await rpc("claim_shop_digital_emails",{p_limit:5},role)).error?.code).toBe("42501");
  });
  it("persists supported Mbolo, acquisition channel, gift email and shipping fields", async () => {
    await mustSave({ ...header(), payment_preference: "mbolo", channel: "social", buyer_country_code: "GH", shipping_amount_xof: 500, shipping_corridor: "SN-GH", shipping_trust_label: "estimate", is_gift: true, recipient_name: "Moussa", recipient_phone: "221770000001", recipient_email: "moussa@example.com" });
    expect((await db.query<{recipient_email:string;shipping_amount_xof:number}>("select recipient_email,shipping_amount_xof from shop_orders")).rows[0]).toEqual({recipient_email:"moussa@example.com",shipping_amount_xof:500});
  });
});
