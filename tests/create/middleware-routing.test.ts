import { describe, expect, it } from "vitest";
import {
  hostOnly,
  resolveMiddlewareRewrite,
  rewriteSitePath,
} from "@/lib/create/middleware-routing";

describe("middleware custom domain routing", () => {
  it("normalizes host header", () => {
    expect(hostOnly("WWW.MayLecor.COM:443")).toBe("www.maylecor.com");
  });

  it("rewrites kebu.africa subdomain root to /sites/slug", () => {
    const r = resolveMiddlewareRewrite({
      host: "maylecor.kebu.africa",
      pathname: "/",
    });
    expect(r.kind).toBe("kebu-subdomain");
    expect(r.pathname).toBe("/sites/maylecor");
  });

  it("rewrites kebu subdomain multipage paths", () => {
    expect(
      resolveMiddlewareRewrite({
        host: "maylecor.kebu.africa",
        pathname: "/about",
      }).pathname,
    ).toBe("/sites/maylecor/about");
  });

  it("rewrites verified custom domain to project slug", () => {
    const r = resolveMiddlewareRewrite({
      host: "www.maylecor.com",
      pathname: "/press",
      customDomainSlug: "maylecor",
    });
    expect(r.kind).toBe("custom-domain");
    expect(r.slug).toBe("maylecor");
    expect(r.pathname).toBe("/sites/maylecor/press");
  });

  it("does not rewrite unknown custom domain without verified slug", () => {
    const r = resolveMiddlewareRewrite({
      host: "unknown-brand.com",
      pathname: "/",
      customDomainSlug: null,
    });
    expect(r.kind).toBe("none");
    expect(r.pathname).toBe("/");
  });

  it("never rewrites a custom hostname merely because it looks valid", () => {
    const r = resolveMiddlewareRewrite({
      host: "attacker-controlled.example",
      pathname: "/account",
    });
    expect(r.kind).toBe("none");
    expect(r.slug).toBeNull();
    expect(r.pathname).toBe("/account");
  });

  it("does not treat a Vercel preview hostname as a customer custom domain", () => {
    const r = resolveMiddlewareRewrite({
      host: "kebu-git-feature-example.vercel.app",
      pathname: "/",
      customDomainSlug: "should-not-be-used",
    });
    expect(r.kind).toBe("none");
    expect(r.pathname).toBe("/");
  });

  it("leaves main app host alone", () => {
    const r = resolveMiddlewareRewrite({
      host: "kebu.africa",
      pathname: "/create",
    });
    expect(r.kind).toBe("none");
  });

  it("rewriteSitePath preserves existing /sites paths", () => {
    expect(rewriteSitePath("maylecor", "/sites/maylecor/home")).toBe("/sites/maylecor/home");
  });
});
