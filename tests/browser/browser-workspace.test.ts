import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPrivateIp } from "@/lib/browser/url-safety";
import { createPinnedRequestOptions } from "@/lib/browser/pinned-reader-request";

describe("Kebu Browser workspace", () => {
  it("blocks private and loopback IP ranges", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.10.2.3")).toBe(true);
    expect(isPrivateIp("192.168.1.4")).toBe(true);
    expect(isPrivateIp("172.20.1.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
  });

  it("pins reader connections to the validated public address", () => {
    const options = createPinnedRequestOptions({
      url: new URL("https://example.com/story?q=kebu"),
      addresses: [{ address: "93.184.216.34", family: 4 }],
    });

    expect(options.hostname).toBe("93.184.216.34");
    expect(options.servername).toBe("example.com");
    expect(options.headers).toMatchObject({ Host: "example.com" });
    expect(options.path).toBe("/story?q=kebu");
  });

  it("persists journeys tabs bookmarks and history behind RLS", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260920089000_kebu_browser_workspace.sql"), "utf8");
    expect(sql).toContain("create table if not exists public.browser_journeys");
    expect(sql).toContain("create table if not exists public.browser_tabs");
    expect(sql).toContain("create table if not exists public.browser_bookmarks");
    expect(sql).toContain("create table if not exists public.browser_history");
    expect(sql).toContain("alter table public.browser_tabs enable row level security");
    expect(sql).toContain("owner_id = auth.uid()");
  });
});
