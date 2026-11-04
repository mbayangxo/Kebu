/**
 * Pure-logic proof for the "know their account number and everything there"
 * join used by Kebu Record's help-request view: every requested user_id
 * gets a real entry (never silently dropped), a user with no active
 * business membership gets an honest empty businesses: [], and a business
 * row is matched to the right user — not shuffled across users.
 */
import { describe, expect, it } from "vitest";
import { buildHelpAccountContext } from "@/lib/platform/help-requests";

describe("buildHelpAccountContext", () => {
  it("attaches account creation date and owned businesses to the right user", () => {
    const result = buildHelpAccountContext(
      ["user-1", "user-2"],
      [
        { id: "user-1", created_at: "2026-01-01T00:00:00Z" },
        { id: "user-2", created_at: "2026-06-01T00:00:00Z" },
      ],
      [{ user_id: "user-1", businesses: { public_kebu_id: "KB-001", legal_name: "User One Ltd" } }],
    );
    expect(result["user-1"]).toEqual({
      accountCreatedAt: "2026-01-01T00:00:00Z",
      businesses: [{ publicKebuId: "KB-001", legalName: "User One Ltd" }],
    });
    expect(result["user-2"]).toEqual({ accountCreatedAt: "2026-06-01T00:00:00Z", businesses: [] });
  });

  it("gives an honest empty entry for a user with no profile row found", () => {
    const result = buildHelpAccountContext(["ghost-user"], [], []);
    expect(result["ghost-user"]).toEqual({ accountCreatedAt: null, businesses: [] });
  });

  it("handles a Supabase array-shaped join as well as a single-object join", () => {
    const result = buildHelpAccountContext(
      ["user-1"],
      [{ id: "user-1", created_at: "2026-01-01T00:00:00Z" }],
      [{ user_id: "user-1", businesses: [{ public_kebu_id: "KB-002", legal_name: "Array Shaped" }] }],
    );
    expect(result["user-1"]!.businesses).toEqual([{ publicKebuId: "KB-002", legalName: "Array Shaped" }]);
  });

  it("drops a membership row for a user_id outside the requested set rather than crashing", () => {
    const result = buildHelpAccountContext(
      ["user-1"],
      [{ id: "user-1", created_at: "2026-01-01T00:00:00Z" }],
      [{ user_id: "stray-user", businesses: { public_kebu_id: "KB-003", legal_name: "Not Requested" } }],
    );
    expect(result["user-1"]!.businesses).toEqual([]);
    expect(result["stray-user"]).toBeUndefined();
  });
});
