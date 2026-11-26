import { expect, test, type BrowserContext } from "playwright/test";
import { createServerClient } from "@supabase/ssr";

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
  await page.screenshot({ path: testInfo.outputPath("merchant-collection-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
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
