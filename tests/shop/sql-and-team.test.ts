import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INVITE_ROLES, isInviteRole, inviteRoleLabel } from "@/lib/business/team-roles";
import { DEMOS_WHICH } from "@/lib/shop/demo-orders";

describe("APPLY_SHOP_ORDERS.sql integrity", () => {
  it("does not contain corrupted check / table names", () => {
    const sql = readFileSync(join(process.cwd(), "APPLY_SHOP_ORDERS.sql"), "utf8");
    expect(sql).not.toContain("chdkleck");
    expect(sql).not.toContain("promessageject_products");
    expect(sql).toContain("create table if not exists public.project_products");
    expect(sql).toContain("image_url text not null default '' check");
    expect(sql).toContain("business_invites");
    expect(sql).toContain("is_demo");
  });
});

describe("team invite roles", () => {
  it("includes manager and creative for agency portals", () => {
    expect(INVITE_ROLES).toContain("manager");
    expect(INVITE_ROLES).toContain("creative");
    expect(isInviteRole("creative")).toBe(true);
    expect(isInviteRole("founder")).toBe(false);
    expect(inviteRoleLabel("manager")).toMatch(/Manager/i);
  });
});

describe("demo orders", () => {
  it("supports first and second practice orders", () => {
    expect(DEMOS_WHICH).toEqual([1, 2]);
  });
});
