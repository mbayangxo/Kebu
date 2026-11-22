import { expect, it } from "vitest";
import { checkoutItems, issueCheckoutApproval, matchesCheckoutApproval, verifyCheckoutApproval } from "@/lib/kebu-code/checkout-approval";

const app = "11111111-1111-4111-8111-111111111111";
const store = "22222222-2222-4222-8222-222222222222";
const key = "local-test-only-approval-key-at-least-32-bytes";

it("expires grants and rejects edits to the app or store binding", () => {
  const token = issueCheckoutApproval({ app, store, revision: 2 }, key, 1000);
  expect(verifyCheckoutApproval(token, key, 2000)).toMatchObject({ app, store, revision: 2 });
  expect(verifyCheckoutApproval(token, key, 1000 + 7 * 86400000)).toBeNull();
  expect(verifyCheckoutApproval(token, key + "other", 2000)).toBeNull();
  expect(verifyCheckoutApproval("A" + token.slice(1), key, 2000)).toBeNull();
});
it("rejects revoked approvals, moved stores and password changes", () => {
  const approval = verifyCheckoutApproval(issueCheckoutApproval({ app, store, revision: 2 }, key, 1000), key, 2000)!;
  const workspace = { owner_id: "owner", revision: 2, store_project_id: store };
  const project = { id: store, owner_id: "owner", project_type: "store", site_password_enabled: false };
  expect(matchesCheckoutApproval(approval, workspace, project)).toBe(true);
  expect(matchesCheckoutApproval(approval, { ...workspace, revision: 3 }, project)).toBe(false);
  expect(matchesCheckoutApproval(approval, { ...workspace, store_project_id: null }, project)).toBe(false);
  expect(matchesCheckoutApproval(approval, workspace, { ...project, owner_id: "buyer" })).toBe(false);
  expect(matchesCheckoutApproval(approval, workspace, { ...project, site_password_enabled: true })).toBe(false);
});
it("accepts item selection only; the app cannot set payment details", () => {
  expect(checkoutItems.safeParse([{ productId: app, quantity: 2 }]).success).toBe(true);
  for (const line of [{ productId: app, quantity: 2, price: 1 }, { productId: app, quantity: 21 }, { productId: app, quantity: "2" }]) {
    expect(checkoutItems.safeParse([line]).success).toBe(false);
  }
});
