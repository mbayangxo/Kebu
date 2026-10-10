/**
 * F0-A — no API route may grant service-role (RLS-bypassing) database authority to a caller identified only by a
 * shared static secret.
 *
 * Finding (2026-09-27): app/api/mcp/route.ts authorized every request with one shared MCP_BEARER_TOKEN and then ran
 * every tool on a SUPABASE_SERVICE_ROLE_KEY client. Proven on QA: any token holder listed every tenant's projects, read
 * any project row, and transferred another tenant's project to themselves (update_project spread caller fields into a
 * service-role update, including owner_id). The route was removed; agent access must come back only through governed,
 * session-derived Actions (F0), never through a shared secret with service-role authority.
 *
 * Static guard over the route tree: it fails if the removed endpoint, its client configuration or its public
 * advertisement returns, or if any route pairs a service-role client with bearer/static-secret authorization.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...routeFiles(p));
    else if (name === "route.ts" || name === "route.tsx") out.push(p);
  }
  return out;
}

const SERVICE_ROLE = /SUPABASE_SERVICE_ROLE_KEY|createServiceClient\(|getServiceClient\(|dbForProjectAccess\(/;
/** Authorization that compares a request header with a configured secret, instead of a user session. */
const SHARED_SECRET_AUTH = /authorization["']?\)?[^\n]{0,80}(===|!==)\s*`?Bearer|`Bearer \$\{process\.env\.|MCP_BEARER_TOKEN/i;

describe("F0-A: no shared-secret route with service-role authority", () => {
  it("the removed /api/mcp endpoint does not exist", () => {
    expect(existsSync(join(ROOT, "app/api/mcp/route.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "app/api/mcp"))).toBe(false);
  });

  it("no API route combines a service-role client with bearer/static-secret authorization", () => {
    const offenders = routeFiles(join(ROOT, "app/api"))
      .map((f) => ({ f: f.slice(ROOT.length + 1), src: readFileSync(f, "utf8") }))
      .filter(({ src }) => SERVICE_ROLE.test(src) && SHARED_SECRET_AUTH.test(src))
      .map(({ f }) => f);
    expect(offenders).toEqual([]);
  });

  it("the endpoint is no longer advertised or preconfigured", () => {
    const llms = readFileSync(join(ROOT, "app/llms.txt/route.ts"), "utf8");
    expect(llms).not.toMatch(/\/api\/mcp/);
    const settings = join(ROOT, ".claude/settings.json");
    if (existsSync(settings)) expect(readFileSync(settings, "utf8")).not.toMatch(/\/api\/mcp|MCP_BEARER_TOKEN/);
  });

  it("the guard itself detects the removed pattern (self-test on the pre-fix route shape)", () => {
    const removedShape = [
      'const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";',
      "const token = process.env.MCP_BEARER_TOKEN;",
      'return auth === `Bearer ${token}`;',
    ].join("\n");
    expect(SERVICE_ROLE.test(removedShape) && SHARED_SECRET_AUTH.test(removedShape)).toBe(true);
  });
});
