import { test, expect, type BrowserContext, type Page } from "playwright/test";
import { attachFakeRealtime, createRealtimeHub } from "./support/fake-supabase-realtime";

const userA = process.env.KEBU_DOCS_COLLAB_USER_A!;
const userB = process.env.KEBU_DOCS_COLLAB_USER_B!;
const stranger = process.env.KEBU_DOCS_COLLAB_STRANGER!;
const docId = process.env.KEBU_DOCS_COLLAB_DOC_ID!;
const BASE = "http://127.0.0.1:38434";
const FIXTURE_BASE = "http://127.0.0.1:38435";

async function session(context: BrowserContext, id: string, email: string) {
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
      user: { id, email, app_metadata: {}, user_metadata: {} },
    })).toString("base64url"),
    url: BASE,
    sameSite: "Lax",
  }]);
}

/** The real prose text only — strips TipTap CollaborationCursor's inline caret/label decoration nodes, which plain textContent() would otherwise fold into the string. */
async function proseText(editor: ReturnType<Page["getByLabel"]>): Promise<string> {
  return editor.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".collaboration-cursor__label, .collaboration-cursor__caret").forEach((n) => n.remove());
    return (clone.textContent ?? "").trim();
  });
}

async function openSharedDoc(context: BrowserContext, userId: string, email: string, hub: ReturnType<typeof createRealtimeHub> | null) {
  await session(context, userId, email);
  const page = await context.newPage();
  if (hub) await attachFakeRealtime(page, hub);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/library?view=documents");
  await page.getByRole("button", { name: /Shared design brief/ }).click();
  await expect(page.getByLabel("Document text", { exact: true })).toBeVisible();
  return { page, errors };
}

test("two real users edit the same document concurrently and converge via Yjs over a real Realtime fixture", async ({ browser, request }) => {
  const hub = createRealtimeHub();
  const aliceCtx = await browser.newContext();
  const bobCtx = await browser.newContext();
  try {
    await session(aliceCtx, userA, "alice@example.test");
    await session(bobCtx, userB, "bob@example.test");
    const seeds = await Promise.all([aliceCtx.request.post(`${BASE}/api/work/items/${docId}/collab`), bobCtx.request.post(`${BASE}/api/work/items/${docId}/collab`)]);
    expect(seeds.map(response => response.status())).toEqual([200, 200]);
    const [seedA, seedB] = await Promise.all(seeds.map(response => response.json()));
    expect(seedA.state).toBe(seedB.state);
    const alice = await openSharedDoc(aliceCtx, userA, "alice@example.test", hub);
    const bob = await openSharedDoc(bobCtx, userB, "bob@example.test", hub);

    await expect(alice.page.getByText(/Live collaboration: connected/i)).toBeVisible({ timeout: 15_000 });
    await expect(bob.page.getByText(/Live collaboration: connected/i)).toBeVisible({ timeout: 15_000 });
    await expect(alice.page.getByLabel("Document text", { exact: true })).toContainText("Initial text");
    await expect(bob.page.getByLabel("Document text", { exact: true })).toContainText("Initial text");
    // Each side should see exactly one other collaborator online.
    await expect(alice.page.getByText(/1 other editing/i)).toBeVisible({ timeout: 10_000 });
    await expect(bob.page.getByText(/1 other editing/i)).toBeVisible({ timeout: 10_000 });

    const editorA = alice.page.getByLabel("Document text", { exact: true });
    const editorB = bob.page.getByLabel("Document text", { exact: true });
    await editorA.click(); await editorA.press("End"); await alice.page.keyboard.type(" Alice note.");
    await editorB.click(); await editorB.press("End"); await bob.page.keyboard.type(" Bob note.");

    // Real CRDT convergence: both browsers' live ProseMirror documents must
    // settle on byte-identical text, and it must contain both edits —
    // neither side's typing was dropped or silently overwritten.
    await expect.poll(() => proseText(editorA), { timeout: 15_000 }).toContain("Alice note.");
    await expect.poll(() => proseText(editorA), { timeout: 15_000 }).toContain("Bob note.");
    await expect.poll(() => proseText(editorB), { timeout: 15_000 }).toContain("Alice note.");
    await expect.poll(() => proseText(editorB), { timeout: 15_000 }).toContain("Bob note.");
    await expect.poll(() => proseText(editorA), { timeout: 15_000 }).toBe(await proseText(editorB));

    // Real live cursors: each side renders the other's name via TipTap's
    // CollaborationCursor extension (default DOM markers), driven by real
    // Yjs awareness broadcast over the Realtime fixture, not a mock.
    await expect(bob.page.locator(".collaboration-cursor__label", { hasText: "alice" })).toBeVisible({ timeout: 10_000 });
    await expect(alice.page.locator(".collaboration-cursor__label", { hasText: "bob" })).toBeVisible({ timeout: 10_000 });

    // Durable persistence still works: one side's autosave round-trips the
    // converged text through the real PATCH /api/work/items route.
    await expect.poll(async () => {
      const res = await request.get(`${FIXTURE_BASE}/__qa/state`);
      const data = await res.json();
      return (data.items.find((i: { id: string }) => i.id === docId)?.body as string | undefined) ?? "";
    }, { timeout: 15_000 }).toMatch(/Alice note\.[\s\S]*Bob note\.|Bob note\.[\s\S]*Alice note\./);

    await alice.page.getByRole("button", { name: "Undo (Ctrl+Z)", exact: true }).click();
    await expect.poll(() => proseText(alice.page.getByLabel("Document text", { exact: true }))).toContain("Bob note.");
    await expect.poll(() => proseText(alice.page.getByLabel("Document text", { exact: true }))).not.toContain("Alice note.");
    await alice.page.getByRole("button", { name: "Redo (Ctrl+Shift+Z)", exact: true }).click();
    await expect.poll(() => proseText(alice.page.getByLabel("Document text", { exact: true }))).toContain("Alice note.");
    expect(alice.errors).toEqual([]);
    expect(bob.errors).toEqual([]);
  } finally {
    await aliceCtx.close(); await bobCtx.close();
  }
});

test("a user without access to the document is denied the collaboration channel", async ({ request }) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify({ sub: stranger, exp })).toString("base64url"),
    "fixture",
  ].join(".");
  const cookie = "sb-127-auth-token=" + encodeURIComponent("base64-" + Buffer.from(JSON.stringify({
    access_token: token, refresh_token: "fixture", expires_at: exp, expires_in: 3600, token_type: "bearer",
    user: { id: stranger, email: "stranger@example.test", app_metadata: {}, user_metadata: {} },
  })).toString("base64url"));
  const res = await request.get(`${BASE}/api/work/items/${docId}/collab`, { headers: { cookie } });
  expect(res.status()).toBe(404);
});

test("a browser that can't reach the collaboration channel still edits and autosaves solo", async ({ browser, request }) => {
  const ctx = await browser.newContext();
  try {
    await session(ctx, userA, "alice@example.test");
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // No attachFakeRealtime here: the authorize fetch itself fails outright,
    // the real failure mode for "can't reach the collaboration channel" —
    // graceful degradation must not depend on the WebSocket layer specifically.
    await page.route("**/api/work/items/*/collab", (route) => route.abort("failed"));
    await page.goto("/library?view=documents");
    await page.getByRole("button", { name: /Shared design brief/ }).click();
    await expect(page.getByText(/Live collaboration: offline/i)).toBeVisible({ timeout: 10_000 });

    const editor = page.getByLabel("Document text", { exact: true });
    await editor.click(); await editor.press("End");
    await page.keyboard.type(" Solo fallback edit.");
    await expect.poll(async () => {
      const res = await request.get(`${FIXTURE_BASE}/__qa/state`);
      const data = await res.json();
      return (data.items.find((i: { id: string }) => i.id === docId)?.body as string | undefined) ?? "";
    }, { timeout: 10_000 }).toContain("Solo fallback edit.");
    await editor.click(); await editor.press("ControlOrMeta+a");
    await page.getByRole("button", { name: "Bold (Ctrl+B)", exact: true }).click();
    await expect.poll(async () => {
      const data = await (await request.get(`${FIXTURE_BASE}/__qa/state`)).json();
      return JSON.stringify(data.items.find((i: { id: string }) => i.id === docId)?.rich_content);
    }, { timeout: 10_000 }).toContain('"type":"bold"');
    await page.reload();
    await page.getByRole("button", { name: /Shared design brief/ }).click();
    await expect(page.getByLabel("Document text", { exact: true }).locator("strong")).toContainText("Solo fallback edit.");
    expect(errors).toEqual([]);
  } finally {
    await ctx.close();
  }
});

test("recovering an unsynced device draft cannot be overwritten by collaboration initialization", async ({ browser, request }) => {
  const ctx = await browser.newContext();
  try {
    await session(ctx, userA, "alice@example.test");
    const page = await ctx.newPage();
    await attachFakeRealtime(page, createRealtimeHub());
    await page.route("**/api/work/items/*/collab", route => route.abort("failed"));
    await page.route("**/api/work/items", route => route.request().method() === "PATCH" ? route.abort("failed") : route.continue());
    await page.goto("/library?view=documents");
    await page.getByRole("button", { name: /Shared design brief/ }).click();
    await expect(page.getByText(/Live collaboration: offline/i)).toBeVisible();
    const failed = page.waitForEvent("requestfailed", req => req.method() === "PATCH" && req.url().includes("/api/work/items"));
    const editor = page.getByLabel("Document text", { exact: true });
    await editor.click(); await editor.press("ControlOrMeta+End");
    await page.keyboard.type(" Recovered local addition.");
    await failed;
    await page.unroute("**/api/work/items/*/collab");
    page.on("dialog", dialog => void dialog.accept());
    await page.reload();
    await page.getByRole("button", { name: /Shared design brief/ }).click();
    await expect(page.getByLabel("Document text", { exact: true })).toContainText("Recovered local addition.");
    await expect(page.getByText(/Live collaboration paused to protect/)).toBeVisible();
    const state = await (await request.get(`${FIXTURE_BASE}/__qa/state`)).json();
    expect(state.items.find((item: {id:string}) => item.id === docId).body).not.toContain("Recovered local addition.");
  } finally { await ctx.close(); }
});
