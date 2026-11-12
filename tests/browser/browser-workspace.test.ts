import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPrivateIp } from "@/lib/browser/url-safety";

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
