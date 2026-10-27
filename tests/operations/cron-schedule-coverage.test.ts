import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../..");
const CRON_DIR = join(ROOT, "app/api/cron");

function realCronRoutes(): string[] {
  return readdirSync(CRON_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `/api/cron/${e.name}`);
}

function scheduledCronPaths(): string[] {
  const vercelJson = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  return (vercelJson.crons ?? []).map((c: { path: string }) => c.path);
}

/**
 * Every /api/cron/* route authenticates with CRON_SECRET and exists to run on
 * a schedule, not to be called ad hoc. A route with no vercel.json entry
 * compiles, deploys and enforces its secret correctly, but never actually
 * runs in production -- a real gap vitest's route-logic tests can't see
 * since they call the handler directly. This test closes that blind spot:
 * it fails the moment a cron route exists on disk with no matching
 * schedule entry (the exact bug this file was added to fix -- mail-delivery,
 * mail-health, cart-abandonment and process-email-flows all existed, fully
 * wired for CRON_SECRET, with zero vercel.json entry and no other caller).
 */
describe("every cron route is actually scheduled in vercel.json", () => {
  it("has no cron route missing from vercel.json's schedule", () => {
    const routes = realCronRoutes();
    const scheduled = new Set(scheduledCronPaths());
    const unscheduled = routes.filter((r) => !scheduled.has(r));
    expect(unscheduled).toEqual([]);
  });

  it("has no vercel.json entry pointing at a route that doesn't exist", () => {
    const routes = new Set(realCronRoutes());
    const scheduled = scheduledCronPaths();
    const dangling = scheduled.filter((p: string) => !routes.has(p));
    expect(dangling).toEqual([]);
  });
});
