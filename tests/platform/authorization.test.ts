import { describe, expect, it } from "vitest";
import { roleAllows } from "@/lib/platform/authorization";

describe("project authorization", () => {
  it("keeps viewers read-only", () => {
    expect(roleAllows("viewer", "read")).toBe(true);
    expect(roleAllows("viewer", "edit")).toBe(false);
    expect(roleAllows("viewer", "manage_members")).toBe(false);
  });

  it("lets editors edit without administering membership", () => {
    expect(roleAllows("editor", "read")).toBe(true);
    expect(roleAllows("editor", "edit")).toBe(true);
    expect(roleAllows("editor", "manage_members")).toBe(false);
  });

  it("lets admins manage collaborators but not transfer ownership", () => {
    expect(roleAllows("admin", "manage_members")).toBe(true);
    expect(roleAllows("admin", "transfer_ownership")).toBe(false);
  });

  it("reserves ownership transfer for the owner", () => {
    expect(roleAllows("owner", "transfer_ownership")).toBe(true);
    expect(roleAllows(null, "read")).toBe(false);
  });
});
