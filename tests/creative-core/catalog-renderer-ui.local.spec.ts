import { test, expect, type Page } from "playwright/test";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Supplemental real React/Chromium with controlled API responses; no QA auth or database proof.");
const projectId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";
const pending = { status: "pending", message: "Your catalog is saved. The website draft still needs syncing. Retry sync before publishing." };
const synced = { status: "synced" };
async function control(page: Page, failFirstRetry = false) {
  let state = synced as { status: string; message?: string };
  let products: Array<Record<string, unknown>> = [];
  let variants: Array<Record<string, unknown>> = [];
  const mutations: string[] = [];
  let syncs = 0;
  await page.route("**/api/**", async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
    const reply = (body: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (path === `/api/projects/${projectId}/catalog-sync`) {
      if (method === "POST") {
        syncs++;
        if (failFirstRetry && syncs === 1) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Unavailable" }) });
        state = synced;
      }
      return reply({ catalogSync: state });
    }
    if (path === `/api/projects/${projectId}/products`) {
      if (method === "GET") return reply({ products });
      mutations.push(method + " product"); state = pending;
      const product = { id: productId, name: req.postDataJSON().name, description: "", price_label: "", image_url: "", whatsapp_order_message: "", is_active: true };
      products = [product]; return reply({ product, catalogSync: state });
    }
    if (path === `/api/projects/${projectId}/products/${productId}`) {
      mutations.push(method + " product"); state = pending;
      if (method === "DELETE") { products = []; return reply({ ok: true, catalogSync: state }); }
      products = [{ ...products[0], name: req.postDataJSON().name }]; return reply({ product: products[0], catalogSync: state });
    }
    if (path.endsWith("/variants")) {
      if (method === "GET") return reply({ variants });
      mutations.push(method + " variant"); state = pending;
      const variant = { id: "33333333-3333-4333-8333-333333333333", name: "Size M", option1: "M", option2: "", option3: "", price_label: "", image_url: "", stock_qty: null };
      variants = [variant]; return reply({ variant, catalogSync: state });
    }
    if (path.includes("/variants/")) {
      mutations.push(method + " variant"); state = pending;
      if (method === "DELETE") { variants = []; return reply({ ok: true, catalogSync: state }); }
      variants = [{ ...variants[0], name: req.postDataJSON().name, option1: req.postDataJSON().option1 }];
      return reply({ variant: variants[0], catalogSync: state });
    }
    return reply({});
  });
  return { mutations, syncs: () => syncs };
}

test("catalog save survives pending website sync; retry/reload never creates a duplicate product", async ({ page }) => {
  const server = await control(page, true); await page.goto("/s5-local-probe");
  let panel = page.getByTestId("catalog-probe");
  await panel.getByRole("textbox", { name: "Product name", exact: true }).fill("Rice");
  await panel.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Your catalog is saved");
  await expect(panel.getByRole("textbox", { name: "Product name", exact: true })).toHaveValue("");
  await page.reload(); panel = page.getByTestId("catalog-probe");
  await expect(panel.getByRole("alert")).toContainText("needs syncing");
  await expect(panel.getByText("Rice", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Retry website sync", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Could not confirm");
  expect(server.mutations).toEqual(["POST product"]);
  await panel.getByRole("button", { name: "Retry website sync", exact: true }).click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  expect(server.mutations).toEqual(["POST product"]); expect(server.syncs()).toBe(2);
  await panel.getByRole("button", { name: "Edit", exact: true }).first().click();
  await panel.getByRole("textbox", { name: "Product name", exact: true }).fill("Rice updated");
  await panel.getByRole("button", { name: "Update product", exact: true }).click();
  await expect(panel.getByRole("alert").first()).toContainText("needs syncing");
  await panel.getByRole("button", { name: "Remove", exact: true }).first().click();
  await expect(panel.getByText("Rice updated", { exact: true })).toHaveCount(0);
  expect(server.mutations).toEqual(["POST product", "PATCH product", "DELETE product"]);
});

test("variant add/edit/delete reports projection status and retries projection only", async ({ page }) => {
  const server = await control(page); await page.goto("/s5-local-probe");
  const panel = page.getByTestId("variants-probe");
  await panel.getByPlaceholder("Option 1 (e.g. Size M)").fill("M");
  await panel.getByRole("button", { name: "Add variant", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("needs syncing");
  await panel.getByRole("button", { name: "Retry website sync", exact: true }).click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  expect(server.mutations).toEqual(["POST variant"]);
  await panel.getByRole("button", { name: "Edit", exact: true }).click();
  await panel.getByPlaceholder("Option 1 (e.g. Size M)").fill("L");
  await panel.getByRole("button", { name: "Update variant", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("needs syncing");
  await panel.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  expect(server.mutations).toEqual(["POST variant", "PATCH variant", "DELETE variant"]);
});

test("unchanged sections skip rendering while event callbacks, themes and editor presence stay current", async ({ page }) => {
  await control(page); await page.goto("/s5-local-probe");
  const probe = page.getByTestId("renderer-probe");
  await expect(probe.getByRole("heading", { name: "Unchanged text", exact: true })).toBeVisible();
  await probe.getByRole("button", { name: "Read counts" }).click();
  const before = Number(await probe.getByTestId("reads").textContent());
  expect(before).toBeGreaterThan(0);
  await probe.getByRole("button", { name: "Advance callback" }).click();
  await probe.getByRole("button", { name: "Read counts" }).click();
  await expect(probe.getByTestId("reads")).toHaveText(String(before));
  await probe.getByRole("heading", { name: "Unchanged text", exact: true }).fill("Edited text");
  await probe.getByRole("button", { name: "Read counts" }).click();
  await expect(probe.getByTestId("patch")).toHaveText("1:Edited text");
  await probe.getByRole("button", { name: "Change theme" }).click();
  await probe.getByRole("button", { name: "Read counts" }).click();
  expect(Number(await probe.getByTestId("reads").textContent())).toBeGreaterThan(before);
  await expect(probe.locator(".kebu-site").first()).toHaveCSS("background-color", "rgb(18, 52, 86)");
  await probe.getByRole("button", { name: "Toggle editing" }).click();
  await expect(probe.locator('[contenteditable="true"]')).toHaveCount(0);
});


test("a delayed catalog result for the previous project cannot erase the selected project's sync status", async ({ page }) => {
  await control(page);
  await page.route("**/api/projects/44444444-4444-4444-8444-444444444444/catalog-sync", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ catalogSync: synced }) }));
  await page.goto("/s5-local-probe");
  const probe = page.getByTestId("sync-race-probe");
  await expect(probe.locator("output")).toHaveText("synced");
  await probe.getByRole("button", { name: "Start delayed mutation" }).click();
  await probe.getByRole("button", { name: "Switch project" }).click();
  await expect(probe.locator("output")).toHaveText("synced");
  await probe.getByRole("button", { name: "Complete old mutation" }).click();
  await expect(probe.locator("output")).toHaveText("synced");
});
