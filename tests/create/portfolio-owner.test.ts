import { describe, expect, it } from "vitest";
import {
  FOUNDER_PORTFOLIO_OWNER_EMAILS,
  isPortfolioOwnerEmail,
  portfolioOwnerEmails,
} from "@/lib/create/portfolio-owner";

describe("portfolio owner allowlist", () => {
  it("uses founder defaults when env is empty", () => {
    const prev = process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
    delete process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
    expect(portfolioOwnerEmails()).toEqual([...FOUNDER_PORTFOLIO_OWNER_EMAILS]);
    expect(isPortfolioOwnerEmail("goldendaffodilxo@gmail.com")).toBe(true);
    expect(isPortfolioOwnerEmail("stranger@test.com")).toBe(false);
    if (prev !== undefined) process.env.KEBU_PORTFOLIO_OWNER_EMAILS = prev;
  });

  it("allows only listed emails from env (case-insensitive)", () => {
    const prev = process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
    process.env.KEBU_PORTFOLIO_OWNER_EMAILS = "Owner@Kebu.africa, other@test.com";
    expect(isPortfolioOwnerEmail("owner@kebu.africa")).toBe(true);
    expect(isPortfolioOwnerEmail("stranger@test.com")).toBe(false);
    if (prev !== undefined) process.env.KEBU_PORTFOLIO_OWNER_EMAILS = prev;
    else delete process.env.KEBU_PORTFOLIO_OWNER_EMAILS;
  });
});
