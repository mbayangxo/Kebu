import { describe, expect, it } from "vitest";
import {
  generatePublicAfricanId,
  generatePublicAfriqueId,
  isPublicAfricanIdFormat,
  isPublicAfriqueIdFormat,
} from "@/lib/afrique-id/public-id";
import { africanIdTypeLabel, eligibilityStatusLabel } from "@/lib/afrique-id/types";

describe("generatePublicAfricanId", () => {
  it("normalizes country and uses AID prefix", () => {
    const id = generatePublicAfricanId("sn");
    expect(id).toMatch(/^AID-SN-01-[A-Z0-9]{6}$/);
    expect(isPublicAfricanIdFormat(id)).toBe(true);
  });

  it("accepts legacy AFRI prefix in format check", () => {
    expect(isPublicAfricanIdFormat("AFRI-SN-01-ABC123")).toBe(true);
    expect(isPublicAfriqueIdFormat("AFRI-SN-01-ABC123")).toBe(true);
  });

  it("rejects invalid country codes", () => {
    expect(() => generatePublicAfricanId("SEN")).toThrow();
  });

  it("generates distinct ids", () => {
    const a = generatePublicAfricanId("NG");
    const b = generatePublicAfricanId("NG");
    expect(a).not.toBe(b);
  });

  it("deprecated alias still returns AID ids", () => {
    const id = generatePublicAfriqueId("KE");
    expect(id).toMatch(/^AID-KE-01-/);
  });
});

describe("africanIdTypeLabel", () => {
  it("labels indigenous and visitor", () => {
    expect(africanIdTypeLabel("indigenous")).toBe("Indigenous African");
    expect(africanIdTypeLabel("visitor")).toBe("Visitor");
  });
});

describe("eligibilityStatusLabel", () => {
  it("labels unverified plainly", () => {
    expect(eligibilityStatusLabel("unverified")).toBe("Not verified yet");
  });
});
