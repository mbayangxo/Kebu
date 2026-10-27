import { test, expect, type BrowserContext, type Page } from "playwright/test";

const claimant = "11111111-1111-4111-8111-111111111111";
const adminUser = "33333333-3333-4333-8333-333333333333";
const orphanedId = process.env.KEBU_CLAIMS_TEST_ORPHANED_ID!;
const ownedId = process.env.KEBU_CLAIMS_TEST_OWNED_ID!;
const orphaned2Id = process.env.KEBU_CLAIMS_TEST_ORPHANED2_ID!;

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
    url: "http://127.0.0.1:38462", sameSite: "Lax",
  }]);
}

async function state(request: import("playwright/test").APIRequestContext) {
  return (await request.get("http://127.0.0.1:38463/__qa/state")).json();
}

async function submitClaim(page: Page, businessId: string, note: string) {
  await page.goto(`/business/claim/${businessId}`);
  await page.getByPlaceholder(/Explain your relationship/).fill(note);
  await page.setInputFiles('input[type="file"]', { name: "proof.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fixture") });
  await page.getByRole("button", { name: "Submit claim" }).click();
  await expect(page.getByText(/pending review/i)).toBeVisible();
}

test("claim-existing-company: orphaned business grants real founder membership on approval", async ({ page, context }) => {
  await session(context, claimant);
  await submitClaim(page, orphanedId, "I founded this bakery in 2019 and lost access to my old account.");

  const beforeApproval = await state(page.request);
  expect(beforeApproval.members.some((m: { business_id: string }) => m.business_id === orphanedId)).toBe(false);

  await session(context, adminUser);
  await page.goto("/support/business-claims");
  await expect(page.getByText("Orphaned Bakery")).toBeVisible();
  await expect(page.getByText(/I founded this bakery/)).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("No pending claims.")).toBeVisible();

  const afterApproval = await state(page.request);
  const granted = afterApproval.members.find((m: { business_id: string; user_id: string }) => m.business_id === orphanedId && m.user_id === claimant);
  expect(granted).toBeTruthy();
  expect(granted.role).toBe("founder");
  expect(granted.status).toBe("active");

  // Real persistence, not client state: a fresh navigation as the claimant shows "approved".
  await session(context, claimant);
  await page.goto(`/business/claim/${orphanedId}`);
  await expect(page.getByText(/claim was approved/i)).toBeVisible();
});

test("claim-existing-company: approving a claim on an already-owned business never auto-transfers membership", async ({ page, context }) => {
  await session(context, claimant);
  await submitClaim(page, ownedId, "This tailoring shop is mine; the current record was made by a former partner.");

  await session(context, adminUser);
  await page.goto("/support/business-claims");
  await expect(page.getByText("Owned Tailors")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("No pending claims.")).toBeVisible();

  // The claim is approved, but no membership row was added for the claimant
  // -- the real founder keeps their seat, the security-critical guarantee.
  const afterApproval = await state(page.request);
  const claimantGotMembership = afterApproval.members.some(
    (m: { business_id: string; user_id: string }) => m.business_id === ownedId && m.user_id === claimant,
  );
  expect(claimantGotMembership).toBe(false);
  const ownerStillHasFounder = afterApproval.members.some(
    (m: { business_id: string; role: string; status: string }) => m.business_id === ownedId && m.role === "founder" && m.status === "active",
  );
  expect(ownerStillHasFounder).toBe(true);

  await session(context, claimant);
  await page.goto(`/business/claim/${ownedId}`);
  await expect(page.getByText(/claim was approved/i)).toBeVisible();
});

test("claim-existing-company: rejection shows the reason to the claimant and grants nothing", async ({ page, context }) => {
  await session(context, claimant);
  await submitClaim(page, orphaned2Id, "I believe this dye house belongs to my family.");

  await session(context, adminUser);
  await page.goto("/support/business-claims");
  await expect(page.getByText("Orphaned Dye House")).toBeVisible();
  await page.getByPlaceholder(/Reason/).fill("No proof of ownership was provided — please resubmit with a business registration document.");
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText("No pending claims.")).toBeVisible();

  const afterRejection = await state(page.request);
  expect(afterRejection.members.some((m: { business_id: string }) => m.business_id === orphaned2Id)).toBe(false);

  await session(context, claimant);
  await page.goto(`/business/claim/${orphaned2Id}`);
  await expect(page.getByText(/claim was rejected/i)).toBeVisible();
  await expect(page.getByText(/No proof of ownership/)).toBeVisible();
});
