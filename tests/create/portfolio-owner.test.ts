import { describe, expect, it } from "vitest";
import { isPortfolioOwnerEmail, portfolioOwnerEmails } from "@/lib/create/portfolio-owner";

describe("portfolio owner allowlist", () => {
  it("fails closed when env is empty", () => {
    const prev = process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
    delete process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
    expect(portfolioOwnerEmails()).toEqual([]);
    expect(isPortfolioOwnerEmail("you@example.com")).toBe(false);
    if (prev !== undefined) process.env.KEBU_PORTFOLIO_OWNER_EMAILS = prev;
  });

  it("allows only listed emails (case-insensitive)", () => {
    const prev = process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
    process.env.KEBU_PORTFOLIO_OWNER_EMAILS = "Owner@Kebu.africa, other@test.com";
    expect(isPortfolioOwnerEmail("owner@kebu.africa")).toBe(true);
    expect(isPortfolioOwnerEmail("stranger@test.com")).toBe(false);
    if (prev !== undefined) process.env.KEBU_PORTFOLIO_OWNER_EMAILS = prev;
    else delete process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
  });
});
