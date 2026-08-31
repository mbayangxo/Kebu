import { describe, expect, it } from "vitest";
import {
  buildDnsInstructions,
  kebuSubdomainTarget,
  normalizeHostname,
  validateCustomHostname,
} from "@/lib/create/custom-domains";

describe("custom domains", () => {
  it("normalizes hostnames", () => {
    expect(normalizeHostname("HTTPS://WWW.MyBrand.COM/path")).toBe("mybrand.com");
    expect(normalizeHostname("  shop.example.co.uk  ")).toBe("shop.example.co.uk");
  });

  it("rejects kebu subdomains as custom domains", () => {
    const result = validateCustomHostname("myshop.kebu.africa");
    expect(result.ok).toBe(false);
  });

  it("accepts real domains", () => {
    expect(validateCustomHostname("maylecor.com").ok).toBe(true);
  });

  it("builds Namecheap-friendly DNS steps", () => {
    const steps = buildDnsInstructions("maylecor", "maylecor.com");
    expect(steps.dnsTarget).toBe("maylecor.kebu.africa");
    expect(steps.namecheapUrl).toContain("namecheap.com");
    expect(steps.steps.some((s) => s.includes("CNAME"))).toBe(true);
  });

  it("kebuSubdomainTarget is lowercase", () => {
    expect(kebuSubdomainTarget("My-Brand")).toBe("my-brand.kebu.africa");
  });
});
