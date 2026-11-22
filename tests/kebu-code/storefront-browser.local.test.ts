import { expect, it } from "vitest";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import JSZip from "jszip";
import { starterFiles } from "@/lib/kebu-code/workspace";

const executablePath = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
it.skipIf(!executablePath)("rechecks the storefront at export and follows the downloaded link at phone width", async () => {
  const server = await createServer({
    configFile: false, resolve: { alias: { "@": resolve(".") } },
    define: { "process.env.NODE_ENV": '"development"' },
    css: { postcss: { plugins: [] } },
    cacheDir: "node_modules/.vite-storefront-acceptance",
    optimizeDeps: { include: ["react", "react-dom/client", "react/jsx-dev-runtime", "next/link", "zod", "jszip"] },
    server: { host: "127.0.0.1", port: 0, hmr: false, watch: null },
    plugins: [{ name: "storefront-acceptance", configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/fixture") return next();
        res.setHeader("Content-Type", "text/html");
        res.end(await vite.transformIndexHtml(req.url, '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/kebu-code/storefront-browser-fixture.tsx"></script>'));
      });
    } }],
  });
  await server.listen();
  try {
    const address = server.httpServer!.address();
    if (!address || typeof address === "string") throw new Error("Fixture is not listening");
    const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
      page.setDefaultTimeout(8000);
      const id = "11111111-1111-4111-8111-111111111111";
      const productId = "44444444-4444-4444-8444-444444444444";
      const storefront = {subdomain:"test-store",url:"https://shop.test/sites/test-store/catalog",products:[{id:productId,name:"Ginger tea"}]};
      const project = {id,title:"Store project",revision:1,files:starterFiles,history:[],updated_at:"2026-11-21",
        store_project_id:"22222222-2222-4222-8222-222222222222"};
      let verified = 0;
      await page.route("**/api/code**", async route => {
        const query = new URL(route.request().url()).searchParams;
        if(query.has("storefront")){
          verified++;
          await route.fulfill({json:{storefront}});
        }else await route.fulfill({json:query.has("id")?{workspace:project}:{workspaces:[project],assistantAvailable:false}});
      });
      await page.goto(`http://127.0.0.1:${address.port}/fixture`);
      await page.getByRole("button",{name:"Store project · v1"}).click();
      await page.getByRole("button",{name:"Get storefront link"}).click();
      const anchor=page.getByRole("link",{name:/Open published storefront/});
      expect(await anchor.getAttribute("href")).toBe(storefront.url);
      await page.getByLabel("Link destination").selectOption(productId);
      expect(await page.getByLabel("Link to paste inside index.html").inputValue()).toContain("#product-"+productId);
      await page.getByLabel("Suggested quantity").fill("3");
      const selection = new URL(await page.getByLabel("Product and quantity link").inputValue());
      expect(selection.searchParams.get("kebu_qty")).toBe("3");
      const download=page.waitForEvent("download");
      await page.getByRole("button",{name:"Export with storefront page"}).click();
      const zip=await JSZip.loadAsync(await readFile((await (await download).path())!));
      const shop=await zip.file("shop.html")!.async("string");
      expect(await zip.file("index.html")!.async("string")).toBe(starterFiles["index.html"]);
      expect(verified).toBe(2);
      await page.route("https://shop.test/sites/test-store/catalog",target=>target.fulfill({contentType:"text/html",body:`<h1>Test storefront</h1><article id="product-${productId}"><h2>Ginger tea</h2></article>`}));
      await page.setContent(shop);
      await page.getByRole("link",{name:"Shop Ginger tea"}).click();
      await page.getByRole("heading",{name:"Ginger tea"}).waitFor();
      expect(new URL(page.url()).hash).toBe("#product-"+productId);
      await page.goto(`http://127.0.0.1:${address.port}/fixture?shop=1&kebu_qty=3${selection.hash}`);
      await page.getByText(/Requested: 3 × Ginger tea/).waitFor();
      const cart = () => page.evaluate(() => JSON.parse(localStorage.getItem("kebu_shop_cart_v1_test-store") ?? "[]"));
      expect(await cart()).toEqual([]);
      await page.getByRole("button", { name: "Add requested quantity to cart" }).click();
      await page.getByRole("status").filter({ hasText: "Added to your cart" }).waitFor();
      expect(await cart()).toMatchObject([{ productId, quantity: 3, priceLabel: "1200 FCFA" }]);
      await page.reload();
      expect(await page.getByRole("button", { name: "Add requested quantity to cart" }).count()).toBe(0);
      expect(await cart()).toMatchObject([{ quantity: 3 }]);
      await page.goto(`http://127.0.0.1:${address.port}/fixture?review=1`);
      await page.getByRole("heading", { name: "Review items from Test Shop" }).waitFor();
      expect(await cart()).toMatchObject([{ quantity: 3 }]);
      await page.getByRole("button", { name: "Add these items to my cart" }).click();
      await page.getByRole("status").filter({ hasText: "Items added" }).waitFor();
      expect(await cart()).toMatchObject([{ quantity: 5 }]);
      expect(await page.getByRole("button", { name: "Add these items to my cart" }).isDisabled()).toBe(true);
    } finally { await browser.close(); }
  } finally { await server.close(); }
}, 30000);
