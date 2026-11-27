import { expect as baseExpect, test, type BrowserContext } from "playwright/test";
import { createServerClient } from "@supabase/ssr";

const expect = baseExpect.configure({ timeout: 20_000 });

const fixture = {
  shop: process.env.KEBU_E2E_COLLECTION_SHOP,
  owner: process.env.KEBU_E2E_COLLECTION_OWNER,
  outsider: process.env.KEBU_E2E_COLLECTION_OUTSIDER,
  password: process.env.KEBU_E2E_COLLECTION_PASSWORD,
  foreignProduct: process.env.KEBU_E2E_COLLECTION_FOREIGN_PRODUCT,
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

test.skip(Object.values(fixture).some((value) => !value), "Configure synthetic Kebu QA collection fixtures.");

async function signIn(context: BrowserContext, email: string, baseURL: string) {
  if (new URL(fixture.url!).origin !== "https://skqnxyaeimvbyrmdfzvk.supabase.co") {
    throw new Error("Collection acceptance requires Kebu QA.");
  }
  const client = createServerClient(fixture.url!, fixture.key!, {
    cookies: {
      getAll: async () => (await context.cookies(baseURL)).map(({ name, value }) => ({ name, value })),
      setAll: async (cookies) => {
        await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: baseURL })));
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: fixture.password! });
  expect(error).toBeNull();
}

test("merchant collection persists and rejects products from another shop", async ({ browser, page, baseURL }, testInfo) => {
  test.setTimeout(180_000);
  expect(baseURL).toBeTruthy();
  const path = `/shop/${fixture.shop}?tab=collections`;
  const api = `/api/projects/${fixture.shop}/collections`;
  const name = `Fruit ${crypto.randomUUID().slice(0, 8)}`;
  expect((await page.request.get(api)).status()).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page.context(), fixture.owner!, baseURL!);
  await page.goto(path);
  await page.getByRole("textbox", { name: "Collection name" }).fill(name);
  await page.getByRole("textbox", { name: "Description" }).fill("Synthetic QA selection");
  await page.getByRole("checkbox", { name: "QA Apples" }).check();
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Collection created." })).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: name });

  await page.reload();
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "QA Apples" })).toBeChecked();
  await page.getByRole("checkbox", { name: "QA Pears" }).check();
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await expect(row).toContainText("2 product(s)");
  const layout = page.locator(".shop-layout");
  await expect.poll(() => layout.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("merchant-collection-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("complementary", { name: "Shop navigation" })).toHaveCSS("width", "232px");
  await page.screenshot({ path: testInfo.outputPath("merchant-collection-desktop.png"), fullPage: true });

  const { collections } = await (await page.request.get(api)).json();
  const saved = collections.find((collection: { name: string }) => collection.name === name);
  const endpoint = `${api}/${saved.id}`;
  const bad = await page.request.patch(endpoint, {
    data: { description: "Rejected change", productIds: [fixture.foreignProduct] },
  });
  expect(bad.status()).toBe(400);
  await page.reload();
  await expect(row).toContainText("Synthetic QA selection");
  await expect(row).toContainText("2 product(s)");

  const other = await browser.newContext({ baseURL });
  try {
    await signIn(other, fixture.outsider!, baseURL!);
    const outsider = await other.newPage();
    expect((await outsider.request.get(api)).status()).toBe(404);
    expect((await outsider.request.patch(endpoint, { data: { name: "Rejected" } })).status()).toBe(404);
  } finally {
    await other.close();
  }

  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Create collection" })).toBeVisible();
  await expect(row).toHaveCount(0);
});

test("an opted-in store publishes browsable aisles and can hide them at the next publish", async ({ browser, page, baseURL }) => {
  test.setTimeout(300_000);
  expect(baseURL).toBeTruthy();
  const shop = `/shop/${fixture.shop}?tab=collections`;
  const project = `/api/projects/${fixture.shop}`;
  const subdomain = `qa-ker-${crypto.randomUUID().slice(0, 8)}`;
  const store = `/sites/${subdomain}`;
  await signIn(page.context(), fixture.owner!, baseURL!);
  await page.goto(shop, { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("checkbox", { name: "Show collections as storefront aisles" });
  if (await toggle.isChecked()) {
    await toggle.click();
    await expect(toggle).not.toBeChecked();
  }
  await toggle.click();
  await expect(page.getByRole("status").filter({ hasText: "Aisle setting saved." })).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(toggle).toBeChecked({ timeout: 55_000 });

  const name = `Fresh Fruit ${subdomain}`;
  await page.getByRole("textbox", { name: "Collection name" }).fill(name);
  await page.getByRole("textbox", { name: "Description" }).fill("Fresh from the orchard");
  await page.getByRole("checkbox", { name: "QA Apples" }).check();
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Collection created." })).toBeVisible();

  const { collections } = await (await page.request.get(`${project}/collections`)).json();
  const visible = collections.find((collection: { name: string }) => collection.name === name);
  const draft = await page.request.post(`${project}/collections`, {
    data: { name: `Unpublished ${subdomain}`, isActive: false, productIds: visible.productIds },
  });
  expect(draft.ok()).toBe(true);

  const shopper = await browser.newContext({ baseURL });
  try {
    const storefront = await shopper.newPage();
    await storefront.goto(store, { waitUntil: "domcontentloaded" });
    await expect(storefront.getByRole("navigation", { name: "Storefront aisles" })).toHaveCount(0);

    const publish = await page.request.post(`${project}/publish`, { data: { subdomain } });
    expect(publish.ok(), await publish.text()).toBe(true);
    await storefront.goto(store, { waitUntil: "domcontentloaded" });
    const aisles = storefront.getByRole("navigation", { name: "Storefront aisles" });
    await expect(aisles.getByRole("button", { name: `Unpublished ${subdomain}` })).toHaveCount(0);
    const fruit = aisles.getByRole("button", { name });
    await fruit.click({ timeout: 35_000 });
    await expect(fruit).toHaveAttribute("aria-pressed", "true");
    const aisleLink = new URL(storefront.url());
    expect(aisleLink.searchParams.get("aisle")).toBe(visible.slug);
    await storefront.reload({ waitUntil: "domcontentloaded" });
    await expect(fruit).toHaveAttribute("aria-pressed", "true");
    await expect(storefront.getByRole("heading", { name: "QA Apples" }).first()).toBeVisible();
    await expect(storefront.getByRole("heading", { name: "QA Pears" })).toHaveCount(0);
    await expect(storefront.getByText("Fresh from the orchard")).toBeVisible();
    await aisles.getByRole("button", { name: "All products" }).click();
    await expect(storefront.getByRole("heading", { name: "QA Pears" }).first()).toBeVisible();
    expect(new URL(storefront.url()).searchParams.has("aisle")).toBe(false);
    await storefront.goBack();
    await expect(fruit).toHaveAttribute("aria-pressed", "true");
    await storefront.goForward();
    await expect(aisles.getByRole("button", { name: "All products" })).toHaveAttribute("aria-pressed", "true");
    const search = storefront.getByRole("searchbox", { name: "Search products" });
    await search.fill("PEARS");
    await expect(storefront.getByRole("heading", { name: "QA Pears" })).toBeVisible();
    await expect(storefront.getByRole("heading", { name: "QA Apples" })).toHaveCount(0);

    await fruit.click();
    await expect(storefront.getByText("No products match this search.", { exact: false })).toBeVisible();
    await storefront.getByRole("button", { name: "Clear search" }).click();
    await expect(search).toHaveValue("");
    await expect(storefront.getByRole("heading", { name: "QA Apples" })).toBeVisible();

    const collectionRow = page.getByRole("listitem").filter({ hasText: name });
    await collectionRow.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(collectionRow).toContainText("Hidden from storefront");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(collectionRow).toContainText("Hidden from storefront", { timeout: 55_000 });
    await storefront.reload({ waitUntil: "domcontentloaded" });
    await expect(fruit).toBeVisible();

    const republish = await page.request.post(`${project}/publish`, { data: { subdomain } });
    expect(republish.ok(), await republish.text()).toBe(true);
    await storefront.reload({ waitUntil: "domcontentloaded" });
    await expect(fruit).toHaveCount(0);
    await expect(storefront.getByRole("heading", { name: "QA Apples" })).toBeVisible();

    await collectionRow.getByRole("button", { name: "Make available" }).click();
    await expect(collectionRow).toContainText("Available for publishing");
  } finally {
    await shopper.close();
  }
});
