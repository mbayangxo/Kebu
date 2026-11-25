import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { effectiveSiteVisibility } from "@/lib/create/site-visibility";
import { hasSiteAccess } from "@/lib/create/site-visibility-access";
import { signSitePasswordSession } from "@/lib/create/site-password";
import { NextRequest } from "next/server";

describe("Builder site visibility", () => {
  it("keeps legacy private sites private and only opens a timed landing page at launch", () => {
    expect(effectiveSiteVisibility({ site_visibility: null, site_password_enabled: true, site_launch_at: null })).toBe("private");
    const launch = Date.parse("2027-01-01T12:00:00Z");
    const site = { site_visibility: "coming_soon" as const, site_password_enabled: false, site_launch_at: new Date(launch).toISOString() };
    expect(effectiveSiteVisibility(site, launch - 1)).toBe("coming_soon");
    expect(effectiveSiteVisibility(site, launch)).toBe("public");
    expect(effectiveSiteVisibility({ ...site, site_launch_at: null }, launch)).toBe("coming_soon");
  });

  it("recognizes a current password session and revokes it when the password changes", async () => {
    const secret = "test-only-site-password-signing-secret";
    vi.stubEnv("NEXTAUTH_SECRET", secret);
    try {
      const expiration = Date.now() + 60_000;
      const token = signSitePasswordSession("pilot", expiration, secret, "password-hash-a");
      const request = new NextRequest("https://kebu.example/sites/pilot", { headers: { cookie: `kebu_site_pw_pilot=${token}` } });
      await expect(hasSiteAccess(request, "pilot", "password-hash-a")).resolves.toBe(true);
      await expect(hasSiteAccess(request, "pilot", "password-hash-b")).resolves.toBe(false);
    } finally { vi.unstubAllEnvs(); }
  });

  it.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)("keeps private snapshots out of the public database view while allowing scheduled opening", async () => {
    const { PGlite } = await import(pathToFileURL(resolve(process.env.KEBU_LOCAL_PGLITE_ROOT!, "dist/index.js")).href);
    const db = new PGlite();
    try {
      await db.exec(`
        create role anon;
        create role authenticated;
        create table projects (id uuid primary key, subdomain text, status text, site_password_enabled boolean, site_password_hash text);
        create table deployments (project_id uuid, subdomain text, status text);
        alter table deployments enable row level security;
        grant select on deployments to anon;
        create policy "Public read live or suspended deployments" on deployments for select using (status in ('live','suspended'));
        insert into projects values ('00000000-0000-4000-8000-000000000001','pilot','published',false,null);
        insert into deployments values ('00000000-0000-4000-8000-000000000001','pilot','live');
      `);
      await db.exec(readFileSync("supabase/migrations/20261125070000_builder_site_visibility.sql", "utf8"));
      async function count() {
        await db.exec("set role anon");
        const result = await db.query("select count(*)::int as n from deployments");
        await db.exec("reset role");
        return result.rows[0].n;
      }
      expect(await count()).toBe(1);
      await db.exec("update projects set site_visibility='private',site_password_enabled=true,site_password_hash='fixture'");
      expect(await count()).toBe(0);
      await db.exec("update projects set site_visibility='paused',site_password_enabled=false");
      expect(await count()).toBe(0);
      await db.exec("update projects set site_visibility='coming_soon',site_launch_at=now()+interval '1 hour'");
      expect(await count()).toBe(0);
      await db.exec("update projects set site_launch_at=now()-interval '1 hour'");
      expect(await count()).toBe(1);
    } finally { await db.close(); }
  });
});
