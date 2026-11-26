import { describe, expect, it } from "vitest";
import {
  hostOnly,
  resolveMiddlewareRewrite,
  rewriteCloudSitePath,
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

  it("rewrites a Kebu Cloud deployment subdomain root to /cloud-sites/slug/index.html", () => {
    const r = resolveMiddlewareRewrite({ host: "my-app.cloud.kebu.africa", pathname: "/" });
    expect(r.kind).toBe("cloud-deployment");
    expect(r.slug).toBe("my-app");
    expect(r.pathname).toBe("/cloud-sites/my-app/index.html");
  });

  it("rewrites nested Kebu Cloud deployment asset paths", () => {
    const r = resolveMiddlewareRewrite({ host: "my-app.cloud.kebu.africa", pathname: "/css/style.css" });
    expect(r.kind).toBe("cloud-deployment");
    expect(r.pathname).toBe("/cloud-sites/my-app/css/style.css");
  });

  it("treats a cloud-deployment host as a distinct namespace from a Builder site subdomain, even though both end in .kebu.africa", () => {
    const cloud = resolveMiddlewareRewrite({ host: "maylecor.cloud.kebu.africa", pathname: "/" });
    expect(cloud.kind).toBe("cloud-deployment");
    const site = resolveMiddlewareRewrite({ host: "maylecor.kebu.africa", pathname: "/" });
    expect(site.kind).toBe("kebu-subdomain");
    // Same first label, different kind and different internal path -- no collision.
    expect(cloud.pathname).not.toBe(site.pathname);
  });

  it("never treats the bare main host as a deployment, and a bare 'cloud.kebu.africa' (no slug prefix) is just an ordinary site subdomain named 'cloud'", () => {
    expect(resolveMiddlewareRewrite({ host: "kebu.africa", pathname: "/" }).kind).toBe("none");
    const bareCloud = resolveMiddlewareRewrite({ host: "cloud.kebu.africa", pathname: "/" });
    expect(bareCloud.kind).toBe("kebu-subdomain");
    expect(bareCloud.slug).toBe("cloud");
  });

  it("rewriteCloudSitePath defaults the root to index.html and leaves already-prefixed paths alone", () => {
    expect(rewriteCloudSitePath("my-app", "/")).toBe("/cloud-sites/my-app/index.html");
    expect(rewriteCloudSitePath("my-app", "/cloud-sites/my-app/about.html")).toBe("/cloud-sites/my-app/about.html");
    expect(rewriteCloudSitePath(null, "/x")).toBe("/x");
  });
});
