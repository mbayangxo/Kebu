import { test, expect, type BrowserContext, type Page, type APIRequestContext } from "playwright/test";

const owner = "33333333-3333-4333-8333-333333333333";
const other = "44444444-4444-4444-8444-444444444444";

async function session(context: BrowserContext, id = owner) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify({ sub: id, exp })).toString("base64url"),
    "fixture",
  ].join(".");
  await context.addCookies([{
    name: "sb-127-auth-token",
    value: "base64-" + Buffer.from(JSON.stringify({
      access_token: token, refresh_token: "fixture", expires_at: exp, expires_in: 3600, token_type: "bearer",
      user: { id, email: "qa@example.test", app_metadata: {}, user_metadata: {} },
    })).toString("base64url"),
    url: "http://127.0.0.1:38440",
    sameSite: "Lax",
  }]);
}

async function state(request: APIRequestContext) {
  return (await request.get("http://127.0.0.1:38441/__qa/state")).json();
}

async function createDeck(page: Page, request: APIRequestContext): Promise<string> {
  await request.post("http://127.0.0.1:38441/__qa/reset");
  await session(page.context());
  await page.goto("/slides/new");
  await page.waitForURL(/\/slides\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  return page.url().split("/slides/")[1]!;
}

test("adding a text layer, editing it, and autosave survives a reload", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const id = await createDeck(page, request);

  await page.getByTestId("add-layer-text").click();
  await page.getByLabel("Layer text").fill("Hello deck");
  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 10_000 });

  await expect.poll(async () => {
    const data = await state(request);
    const body = data.slideBodies[0];
    return body?.slides?.[0]?.layers?.[0]?.text;
  }, { timeout: 10_000 }).toBe("Hello deck");

  await page.reload();
  await page.waitForURL(new RegExp(id));
  await expect(page.getByLabel("Layer text")).toHaveCount(0); // nothing selected after reload
  await page.getByTestId(/^layer-/).first().click();
  await expect(page.getByLabel("Layer text")).toHaveValue("Hello deck");
  expect(errors).toEqual([]);
});

test("dragging a layer moves it and the new position autosaves", async ({ page, request }) => {
  await createDeck(page, request);
  await page.getByTestId("add-layer-rect").click();

  const handle = page.getByTestId(/^layer-/).first();
  const box = await handle.boundingBox();
  if (!box) throw new Error("layer not rendered");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 60, { steps: 5 });
  await page.mouse.up();

  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 10_000 });
  // The blank rect layer starts at deckWidth/2 - 180 = 780 (default 1920px deck); a real rightward
  // drag must land strictly to the right of that, not just at some positive x.
  await expect.poll(async () => {
    const data = await request.get("http://127.0.0.1:38441/__qa/state").then((r) => r.json());
    const layer = data.slideBodies[0]?.slides?.[0]?.layers?.[0];
    return layer?.x;
  }, { timeout: 10_000 }).toBeGreaterThan(780);
});

test("present mode enters fullscreen, advances with the keyboard, and exits with Escape", async ({ page, request }) => {
  await createDeck(page, request);
  await page.getByTestId("add-slide").click();
  await expect(page.getByTestId("slide-thumb-1")).toBeVisible();
  await page.getByTestId("slide-thumb-0").click(); // present starts from the active slide

  await page.getByTestId("present-button").click();
  await expect(page.getByTestId("present-overlay")).toBeVisible();
  await expect(page.getByTestId("present-position")).toHaveText("1 / 2");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("present-position")).toHaveText("2 / 2");

  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("present-position")).toHaveText("1 / 2");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("present-overlay")).toHaveCount(0);
});

test("a deck is invisible to a user it was never shared with, enforced by the real API, not just the UI", async ({ page, browser, request }) => {
  const id = await createDeck(page, request);
  const stranger = await browser.newContext();
  try {
    await session(stranger, other);
    const get = await stranger.request.get(`http://127.0.0.1:38440/api/library/slides/${id}`);
    expect(get.status()).toBe(404);
    const patch = await stranger.request.patch(`http://127.0.0.1:38440/api/library/slides/${id}`, { data: { slides: [{ id: "s1", name: "x", backgroundColor: "#fff", layers: [], transitionKind: "cut", transitionDurationMs: 0 }] } });
    expect(patch.status()).toBe(404);
  } finally {
    await stranger.close();
  }
});
