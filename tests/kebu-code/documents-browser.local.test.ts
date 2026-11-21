import { expect, it } from "vitest";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import JSZip from "jszip";

const executablePath = process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
it.skipIf(!executablePath)("creates, drafts from an attachment, reviews, edits, saves, reopens and exports at phone width", async () => {
  const server = await createServer({
    configFile: false, resolve: { alias: { "@": resolve(".") } },
    define: { "process.env.NODE_ENV": '"development"' },
    css: { postcss: { plugins: [] } },
    cacheDir: "node_modules/.vite-documents-acceptance",
    optimizeDeps: { include: ["react", "react-dom/client", "react/jsx-dev-runtime", "next/link", "zod", "jszip"] },
    server: { host: "127.0.0.1", port: 0, hmr: false, watch: null },
    plugins: [{ name: "document-acceptance", configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (req.url !== "/fixture") return next();
        res.setHeader("Content-Type", "text/html");
        res.end(await vite.transformIndexHtml(req.url, '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/kebu-code/documents-browser-fixture.tsx"></script>'));
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
      let stored = { id, title: "Wholesale", content: "", revision: 1, history: [] as { revision: number; content: string }[], updated_at: "2026-11-21" };
      let exists = false;
      let reference = "";
      await page.route("**/api/code/documents**", async route => {
        const request = route.request();
        if (request.method() === "GET") {
          await route.fulfill({ json: new URL(request.url()).searchParams.has("id") ? { document: stored } :
            { documents: exists ? [stored] : [], hasMore: false, assistantAvailable: true } });
          return;
        }
        const action = request.postDataJSON();
        if (action.action === "create") {
          exists = true; stored = { ...stored, title: action.title };
          await route.fulfill({ status: 201, json: { document: stored } });
        } else if (action.action === "draft") {
          reference = action.references[0]?.text;
          await route.fulfill({ json: { base: stored.revision, content: "# Wholesale\nCoffee: 12.", missing: ["Confirm delivery."] } });
        } else if (action.action === "save") {
          stored = { ...stored, content: action.content, revision: stored.revision + 1, history: [{ revision: stored.revision, content: stored.content }] };
          await route.fulfill({ json: { document: stored } });
        } else await route.fulfill({ status: 400, json: { error: "Unexpected fixture action" } });
      });
      await page.goto(`http://127.0.0.1:${address.port}/fixture`);
      await page.getByLabel("Document name").fill("Wholesale");
      await page.getByRole("button", { name: "Create document" }).click();
      await page.getByLabel("What should Yande write?").fill("Write a proposal using the price list.");
      await page.getByLabel("Reference files (optional)").setInputFiles({ name: "prices.csv", mimeType: "text/csv", buffer: Buffer.from("Coffee,12") });
      await page.getByLabel("Remove prices.csv").waitFor();
      await page.getByRole("button", { name: "Propose draft" }).click();
      await page.getByText("Confirm delivery.").waitFor();
      expect(reference).toBe("Coffee,12");
      expect(stored.content).toBe("");
      await page.getByRole("button", { name: "Use draft in editor" }).click();
      await page.getByLabel("Document (Markdown)").fill("# Wholesale\nCoffee: 12. Weekly delivery.");
      await page.getByRole("button", { name: "Save revision" }).click();
      await page.getByText("Revision saved.").waitFor();
      page.once("dialog", dialog => void dialog.accept());
      await page.reload();
      await page.getByRole("button", { name: "Wholesale · v2" }).click();
      expect(await page.getByLabel("Document (Markdown)").inputValue()).toContain("Weekly delivery");
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download Word" }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe("Wholesale.docx");
      const zip = await JSZip.loadAsync(await readFile((await file.path())!));
      expect(await zip.file("word/document.xml")?.async("string")).toContain("Weekly delivery");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await browser.close(); }
  } finally { await server.close(); }
}, 30000);
