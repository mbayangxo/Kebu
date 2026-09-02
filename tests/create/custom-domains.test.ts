import { describe, expect, it } from "vitest";
import {
  buildDnsInstructions,
  cnamePointsAtKebuHosting,
  customDomainDnsTarget,
  formatDnsMismatchDetail,
  isRegistrarParkingCname,
  normalizeHostname,
  resolveDnsTarget,
  validateCustomHostname,
} from "@/lib/create/dns-target";

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

  it("builds DNS steps for owned domains on Vercel", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://alkebulan-platform.vercel.app";
    const steps = buildDnsInstructions("maylecor", "maylecor.com");
    expect(steps.dnsTarget).toBe("cname.vercel-dns.com");
    expect(steps.steps.some((s) => s.includes("CNAME"))).toBe(true);
    expect(steps.registrarNote).toMatch(/Kebu Domains/i);
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });

  it("fixes obsolete kebu.africa dns targets", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://alkebulan-platform.vercel.app";
    expect(resolveDnsTarget("maylecor.kebu.africa", "maylecor")).toBe("cname.vercel-dns.com");
    expect(resolveDnsTarget("kebu.africa", "maylecor")).toBe("cname.vercel-dns.com");
    expect(resolveDnsTarget("cname.vercel-dns.com", "maylecor")).toBe("cname.vercel-dns.com");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });

  it("uses Vercel CNAME on production app host", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://alkebulan-platform.vercel.app";
    expect(customDomainDnsTarget("maylecor")).toBe("cname.vercel-dns.com");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });

  it("detects registrar parking CNAMEs", () => {
    expect(isRegistrarParkingCname("parkingpage.namecheap.com")).toBe(true);
    expect(formatDnsMismatchDetail(["parkingpage.namecheap.com"], "cname.vercel-dns.com")).toMatch(
      /parking page/i,
    );
  });

  it("explains when www points at apex instead of Kebu", () => {
    expect(formatDnsMismatchDetail(["kdirection.com."], "cname.vercel-dns.com")).toMatch(
      /not Kebu/i,
    );
    expect(formatDnsMismatchDetail(["kdirection.com."], "cname.vercel-dns.com")).toMatch(
      /cname\.vercel-dns\.com/i,
    );
  });

  it("treats Vercel deployment CNAME as valid in mismatch copy", () => {
    expect(
      formatDnsMismatchDetail(
        ["kebu-dljlhzv1j-mbayangxos-projects.vercel.app"],
        "cname.vercel-dns.com",
      ),
    ).toMatch(/looks correct/i);
  });

  it("accepts Vercel deployment hostnames as valid CNAME", () => {
    expect(
      cnamePointsAtKebuHosting("kebu-dljlhzv1j-mbayangxos-projects.vercel.app", "cname.vercel-dns.com"),
    ).toBe(true);
    expect(cnamePointsAtKebuHosting("cname.vercel-dns.com", "cname.vercel-dns.com")).toBe(true);
    expect(cnamePointsAtKebuHosting("maylecor.kebu.africa", "cname.vercel-dns.com")).toBe(false);
  });

  it("always returns canonical CNAME regardless of app URL", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://maylecor.kebu.africa";
    expect(customDomainDnsTarget("maylecor")).toBe("cname.vercel-dns.com");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});
