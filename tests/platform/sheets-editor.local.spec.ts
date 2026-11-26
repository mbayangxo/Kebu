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
    url: "http://127.0.0.1:38438",
    sameSite: "Lax",
  }]);
}

async function state(request: APIRequestContext) {
  return (await request.get("http://127.0.0.1:38439/__qa/state")).json();
}

async function createSheet(page: Page, request: APIRequestContext): Promise<string> {
  await request.post("http://127.0.0.1:38439/__qa/reset");
  await session(page.context());
  await page.goto("/sheets/new");
  await page.waitForURL(/\/sheets\/[0-9a-f-]{36}$/, { timeout: 15_000 });
  return page.url().split("/sheets/")[1]!;
}

async function typeAndCommit(page: Page, address: string, text: string) {
  await page.getByTestId(`cell-${address}`).click();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

test("typing a real formula computes live, autosaves, and survives a reload with both raw formula and value intact", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const id = await createSheet(page, request);

  await typeAndCommit(page, "A1", "2");
  await typeAndCommit(page, "A2", "3");
  await typeAndCommit(page, "A3", "4");
  await typeAndCommit(page, "A4", "=SUM(A1:A3)");

  // Live, client-computed result — no round trip required to see this.
  await expect(page.getByTestId("cell-A4")).toHaveText("9");

  // A real debounced autosave actually reaches the server.
  await expect(page.getByRole("status")).toHaveText("Saved", { timeout: 10_000 });
  await expect.poll(async () => {
    const data = await state(request);
    return data.sheetBodies[0]?.cells?.A4?.raw;
  }, { timeout: 10_000 }).toBe("=SUM(A1:A3)");

  // The real server-side computation (same engine.ts the client used) agrees.
  const fetched = await page.request.get(`http://127.0.0.1:38438/api/library/sheets/${id}`);
  const fetchedBody = await fetched.json();
  expect(fetched.status(), JSON.stringify(fetchedBody)).toBe(200);
  expect(fetchedBody.cells.A4).toMatchObject({ raw: "=SUM(A1:A3)", display: "9", isFormula: true });

  await page.reload();
  await page.waitForURL(new RegExp(id));
  await expect(page.getByTestId("cell-A4")).toHaveText("9");
  await page.getByTestId("cell-A4").click();
  await expect(page.getByLabel("Formula bar")).toHaveValue("=SUM(A1:A3)");
  expect(errors).toEqual([]);
});

test("a dependent cell recalculates live when its source changes, including a real circular-reference error", async ({ page, request }) => {
  await createSheet(page, request);
  await typeAndCommit(page, "A1", "10");
  await typeAndCommit(page, "B1", "=A1+1");
  await expect(page.getByTestId("cell-B1")).toHaveText("11");

  await typeAndCommit(page, "A1", "100");
  await expect(page.getByTestId("cell-B1")).toHaveText("101");

  await typeAndCommit(page, "C1", "=D1");
  await typeAndCommit(page, "D1", "=C1");
  await expect(page.getByTestId("cell-C1")).toContainText("CYCLE");
});

test("a sheet is invisible to a user it was never shared with, enforced by the real API, not just the UI", async ({ page, browser, request }) => {
  const id = await createSheet(page, request);
  const stranger = await browser.newContext();
  try {
    await session(stranger, other);
    const get = await stranger.request.get(`http://127.0.0.1:38438/api/library/sheets/${id}`);
    expect(get.status()).toBe(404);
    const patch = await stranger.request.patch(`http://127.0.0.1:38438/api/library/sheets/${id}`, { data: { expectedUpdatedAt: null, cells: { A1: { raw: "hijacked" } } } });
    expect(patch.status()).toBe(404);
  } finally {
    await stranger.close();
  }
});


test("two tabs preserve the losing tab's edits instead of overwriting a newer save", async ({ page, request, context }) => {
  const id = await createSheet(page, request);
  const otherTab = await context.newPage();
  await otherTab.goto(`/sheets/${id}`);
  await expect(otherTab.getByRole("status")).toHaveText("Saved");
  await typeAndCommit(page, "A1", "winner");
  await expect(page.getByRole("status")).toHaveText("Saved");
  await typeAndCommit(otherTab, "A1", "keep my draft");
  await expect(otherTab.getByRole("alert").filter({ hasText: "newer version" })).toContainText("newer version");
  await expect(otherTab.getByTestId("cell-A1")).toHaveText("keep my draft");
  await expect(otherTab.getByRole("button", { name: "Download my edits" })).toBeVisible();
  const saved = await context.request.get(`/api/library/sheets/${id}`);
  expect((await saved.json()).cells.A1.raw).toBe("winner");
});

test("notification bell refreshes on open and reports failed read updates", async ({ page }) => {
  await session(page.context());
  let loads = 0;
  await page.route("**/api/me/notifications", async route => {
    if (route.request().method() === "PATCH") return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    loads++;
    return route.fulfill({ json: { unread: 1, notifications: [{ id: "11111111-1111-4111-8111-111111111111", kind: "test", title: "A real room update", body: "New activity", action_url: null, read_at: null, created_at: "2026-11-12T00:00:00Z" }] } });
  });
  await page.goto("/library?view=sheets");
  await expect.poll(() => loads).toBeGreaterThan(0);
  const before = loads;
  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect.poll(() => loads).toBeGreaterThan(before);
  await page.getByRole("button", { name: /A real room update/ }).click();
  await expect(page.getByText("Could not mark notification read. Try again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toHaveText("1");
});
