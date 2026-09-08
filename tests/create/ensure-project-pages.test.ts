import { describe, expect, it } from "vitest";
import { portfolioUpgradeKeyFromDescription } from "@/lib/create/ensure-project-pages";

describe("ensureProjectPagesBeforePublish", () => {
  it("maps portfolio description markers to upgrade keys", () => {
    expect(portfolioUpgradeKeyFromDescription("portfolio:kdirection — label")).toBe("kdirection");
    expect(portfolioUpgradeKeyFromDescription("portfolio:maylecor")).toBe("maylecor");
    expect(portfolioUpgradeKeyFromDescription("portfolio:dklns")).toBe("dklns");
    expect(portfolioUpgradeKeyFromDescription("portfolio:ndaoan")).toBe("ndaoan");
    expect(portfolioUpgradeKeyFromDescription("portfolio:mayjorgood")).toBe("mayjorgood");
    expect(portfolioUpgradeKeyFromDescription("Regular fashion site")).toBeNull();
  });
});
