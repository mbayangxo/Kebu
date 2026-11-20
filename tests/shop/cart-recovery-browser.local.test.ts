/** Real cart UI -> real recovery route -> real local PostgreSQL -> reload.
 * The fixture does not simulate a payment provider or certify hosted Supabase.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { chromium, type Browser } from "playwright";
import { createServer, type ViteDevServer } from "vite";
// @ts-expect-error pg is present; @types/pg is not part of this repository.
import { Pool } from "pg";
import { setupCartDatabase, project, first, attempt } from "./cart-database-fixture";
import { startCartPostgres } from "./local-postgres";
import { checkoutRecoveryKey } from "@/lib/create/shop-checkout-recovery";

const mocks = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: mocks.admin }));
vi.mock("@/lib/api-guard", () => ({ shopOrderRateLimit: () => null }));
import { POST } from "@/app/api/public/sites/[subdomain]/cart/recover/route";

const bin = process.env.KEBU_CART_POSTGRES_BIN, executablePath = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
let local: Awaited<ReturnType<typeof startCartPostgres>>, pool: Pool, server: ViteDevServer, browser: Browser;
let origin = "", unavailable = false;
describe.skipIf(!bin || !executablePath)("cart recovery in a real browser with native SQL", () => {
  beforeAll(async () => {
    local = await startCartPostgres(bin!);
    pool = new Pool({ connectionString: local.url });
    await setupCartDatabase({ exec: (sql: string) => pool.query(sql) });
    mocks.admin.mockImplementation(() => ({
      from: () => ({ select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { project_id: project }, error: null }; } }),
      rpc: async (_name: string, args: { p_project: string; p_attempt: string }) => unavailable
        ? { data: null, error: { message: "Fixture connection failure" } }
        : { data: (await pool.query("select recover_shop_cart_attempt($1,$2) as result", [args.p_project, args.p_attempt])).rows[0].result, error: null },
    }));
    server = await createServer({ configFile: false, root: process.cwd(),
      resolve: { alias: { "@": resolve(".") } }, define: { "process.env": "{}" },
      css: { postcss: { plugins: [] } }, server: { host: "127.0.0.1", port: 0 },
      plugins: [{ name: "local-cart-acceptance", configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          try {
            if (req.url === "/cart-fixture") {
              res.setHeader("Content-Type", "text/html");
              res.end(await vite.transformIndexHtml(req.url, '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;margin:0}button,input,select,textarea{font:inherit;padding:8px}button{cursor:pointer}.kebu-cta{background:#111;color:white;border:0;border-radius:20px}</style><div id="root"></div><script type="module" src="/tests/shop/cart-browser-fixture.tsx"></script>')); return;
            }
            if (req.url?.includes("/cart/recover")) {
              const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
              const request = new Request(`${origin}${req.url}`, { method: "POST", headers: req.headers as Record<string, string>, body: Buffer.concat(chunks) });
              const response = await POST(request, { params: Promise.resolve({ subdomain: "store" }) });
              res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
            }
            if (req.url?.startsWith("/api/")) { res.setHeader("Content-Type", "application/json"); res.end("{}"); return; }
            next();
          } catch (error) { next(error as Error); }
        });
      } }],
    });
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === "string") throw new Error("No server address");
    origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
  }, 30000);
  afterAll(async () => { await browser?.close(); await server?.close(); await pool?.end(); await local?.stop(); });
  beforeEach(async () => {
    unavailable = false;
    await pool.query("truncate shop_orders cascade; truncate shop_cart_order_attempts,shop_cart_closed_attempts; update project_products set stock_qty=5;");
  });

  async function pageWithPending(width = 390) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(`${origin}/cart-fixture`);
    await page.evaluate(({ key, id, product }) => {
      localStorage.setItem(key, id);
      localStorage.setItem("kebu_shop_cart_v1_store", JSON.stringify([{ productId: product, productName: "Fixture", priceLabel: "100 XOF", quantity: 1 }]));
    }, { key: checkoutRecoveryKey("store"), id: attempt, product: first });
    await page.reload();
    await page.getByRole("button", { name: "Check previous checkout" }).waitFor();
    return page;
  }

  it("recovers a saved order after reload, keeps payment uncertain, then explicitly clears the cart", async () => {
    await pool.query("select create_shop_cart_atomic($1,$2,$3,$4,null,null,null,null)", [attempt, "a".repeat(64),
      JSON.stringify({ project_id: project, product_id: first, product_name: "Fixture", quantity: 1, customer_name: "Fixture", customer_phone: "00000000", status: "pending", order_number: "RECOVER-1" }),
      JSON.stringify([{ product_id: first, product_name: "Fixture", price_label: "100 XOF", quantity: 1, sort_order: 0 }])]);
    const page = await pageWithPending();
    try {
      await page.getByRole("button", { name: "Check previous checkout" }).click();
      await page.getByText(/does not confirm payment/).waitFor();
      if (process.env.KEBU_CART_SCREENSHOT_PATH) await page.screenshot({path:process.env.KEBU_CART_SCREENSHOT_PATH});
      expect(await page.getByRole("button", { name: "Place cart order" }).count()).toBe(0);
      await page.reload();
      await page.getByRole("button", { name: "Check previous checkout" }).click();
      await page.getByRole("button", { name: "Clear cart and finish" }).click();
      expect(await page.evaluate(key => localStorage.getItem(key), checkoutRecoveryKey("store"))).toBe(null);
      expect((await pool.query("select count(*)::int as n from shop_orders")).rows[0].n).toBe(1);
      expect((await pool.query("select stock_qty from project_products where id=$1", [first])).rows[0].stock_qty).toBe(4);
      expect(await page.locator(".kebu-shop-cart-panel").evaluate(el => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
    } finally { await page.close(); }
  }, 30000);

  it("fences a missing attempt before allowing a new checkout on desktop", async () => {
    const page = await pageWithPending(1280);
    try {
      await page.getByRole("button", { name: "Check previous checkout" }).click();
      await page.getByText(/previous attempt was not saved and is now closed/).waitFor();
      await page.getByRole("button", { name: "Place cart order" }).waitFor();
      expect((await pool.query("select count(*)::int as n from shop_cart_closed_attempts")).rows[0].n).toBe(1);
      expect(await page.evaluate(key => localStorage.getItem(key), checkoutRecoveryKey("store"))).toBe(null);
    } finally { await page.close(); }
  }, 30000);

  it("retains uncertainty and the receipt capability when the recovery backend fails", async () => {
    unavailable = true;
    const page = await pageWithPending();
    try {
      await page.getByRole("button", { name: "Check previous checkout" }).click();
      await page.getByRole("alert").filter({ hasText: /still uncertain/ }).waitFor();
      expect(await page.evaluate(key => localStorage.getItem(key), checkoutRecoveryKey("store"))).toBe(attempt);
      expect(await page.getByRole("button", { name: "Place cart order" }).count()).toBe(0);
      await page.reload();
      await page.getByRole("button", { name: "Check previous checkout" }).waitFor();
    } finally { await page.close(); }
  }, 30000);

  it("blocks offline recovery without discarding the pending attempt", async () => {
    const page = await pageWithPending();
    try {
      await page.context().setOffline(true);
      await page.getByText("Reconnect to check your order safely.").waitFor();
      expect(await page.getByRole("button", { name: "Check previous checkout" }).isDisabled()).toBe(true);
      expect(await page.evaluate(key => localStorage.getItem(key), checkoutRecoveryKey("store"))).toBe(attempt);
    } finally { await page.context().setOffline(false); await page.close(); }
  }, 30000);

  it("persists the actual checkout attempt before a lost response and finds it again on reload", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let sent: { attemptId: string; customerName: string } | null = null;
    try {
      await page.goto(`${origin}/cart-fixture`);
      await page.evaluate(product => localStorage.setItem("kebu_shop_cart_v1_store", JSON.stringify([
        { productId: product, productName: "Fixture", priceLabel: "100 XOF", quantity: 1 },
      ])), first);
      await page.reload();
      await page.getByRole("button", { name: /Open cart/ }).click();
      await page.getByPlaceholder("Your name", { exact: true }).fill("Fixture Buyer");
      await page.getByPlaceholder("WhatsApp / phone (for delivery texts)").fill("00000000");
      await page.route("**/cart/checkout", async route => { sent = route.request().postDataJSON(); await route.abort("failed"); });
      await page.getByRole("button", { name: "Place cart order" }).click();
      await page.getByRole("alert").waitFor();
      const pending = await page.evaluate(key => localStorage.getItem(key), checkoutRecoveryKey("store"));
      expect(sent).toMatchObject({ attemptId: pending, customerName: "Fixture Buyer" });
      expect(pending).toMatch(/^[0-9a-f-]{36}$/);
      await page.reload();
      await page.getByRole("button", { name: "Check previous checkout" }).waitFor();
      expect(await page.getByPlaceholder("Your name", { exact: true }).count()).toBe(0);
    } finally { await page.close(); }
  }, 30000);

  it("does not send a checkout when its recovery marker cannot be saved", async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let requests = 0;
    try {
      await page.goto(`${origin}/cart-fixture`);
      await page.evaluate(product => localStorage.setItem("kebu_shop_cart_v1_store", JSON.stringify([
        { productId: product, productName: "Fixture", priceLabel: "100 XOF", quantity: 1 },
      ])), first);
      await page.reload();
      await page.getByRole("button", { name: /Open cart/ }).click();
      await page.getByPlaceholder("Your name", { exact: true }).fill("Fixture Buyer");
      await page.getByPlaceholder("WhatsApp / phone (for delivery texts)").fill("00000000");
      await page.route("**/cart/checkout", async route => { requests++; await route.abort(); });
      await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Quota", "QuotaExceededError"); }; });
      await page.getByRole("button", { name: "Place cart order" }).click();
      await page.getByRole("alert").filter({ hasText: /No order was sent/ }).waitFor();
      expect(requests).toBe(0);
    } finally { await page.close(); }
  }, 30000);
});
