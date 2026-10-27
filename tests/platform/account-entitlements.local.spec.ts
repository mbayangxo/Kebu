import { test, expect, type BrowserContext, type Page } from "playwright/test";

const verifiedUser = "11111111-1111-4111-8111-111111111111"; // verified indigenous African ID

async function session(context: BrowserContext, id: string) {
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
      user: { id, email: id + "@example.test", app_metadata: {}, user_metadata: {} },
    })).toString("base64url"),
    url: "http://127.0.0.1:38460", sameSite: "Lax",
  }]);
}
async function state(request: import("playwright/test").APIRequestContext) { return (await request.get("http://127.0.0.1:38461/__qa/state")).json(); }
async function reset(request: import("playwright/test").APIRequestContext) { await request.post("http://127.0.0.1:38461/__qa/reset"); }

async function openPrivacySection(page: Page) {
  // Plain /account, not the #privacy anchor: the anchor's own auto-open
  // effect is covered separately below (openViaHashAnchor) -- driving this
  // helper's flow through an explicit, unconditional click sidesteps a real
  // race between that effect's async setSection and this helper's own
  // "is it already open" check, which could otherwise re-toggle it closed.
  await page.goto("/account");
  const toggleButton = page.getByRole("button", { name: /Privacy & connected services/ });
  await expect(toggleButton).toBeVisible();
  await toggleButton.click();
  await expect(page.getByText("Connected services", { exact: true })).toBeVisible();
}

async function expectHashAnchorOpensPrivacy(page: Page) {
  await page.goto("/account#privacy");
  await expect(page.getByText("Connected services", { exact: true })).toBeVisible();
}

test("opportunity personalization: real revoke persists across reload and actually changes the gated API's answer", async ({ page, request }) => {
  await reset(request);
  await session(page.context(), verifiedUser);

  // /settings links to /account#privacy -- prove that anchor actually opens
  // the drawer (it didn't before this feature added the hash-reading effect).
  await expectHashAnchorOpensPrivacy(page);
  await expect(page.getByText("Opportunity personalization")).toBeVisible();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();

  // Before revoking: the real gated endpoint (not a mock) grants access.
  const before = await page.request.get("/api/opportunity/listings");
  expect(before.status()).toBe(200);

  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByText("Revoked by you")).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore", exact: true })).toBeVisible();

  // Real SQL persistence, not just client state.
  const afterRevoke = await state(request);
  expect(afterRevoke.entitlements).toEqual([
    expect.objectContaining({ entitlement_key: "african_opportunity_access", status: "revoked" }),
  ]);

  // The real gated endpoint now refuses, even though the underlying
  // afrique_ids row is still genuinely verified -- the revoke sticks.
  const afterRevokeApi = await page.request.get("/api/opportunity/listings");
  expect(afterRevokeApi.status()).toBe(403);
  expect((await afterRevokeApi.json()).needsEntitlement).toBe(true);

  // Fresh navigation: still revoked, proving it's persisted server-side,
  // not a transient client toggle.
  await openPrivacySection(page);
  await expect(page.getByText("Revoked by you")).toBeVisible();

  // Opt back in.
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();

  const afterOptIn = await page.request.get("/api/opportunity/listings");
  expect(afterOptIn.status()).toBe(200);
});
