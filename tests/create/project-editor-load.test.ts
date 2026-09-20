import { describe, expect, it } from "vitest";
import { portfolioUpgradeForProject } from "@/app/create/[id]/project-editor-load";

describe("portfolioUpgradeForProject", () => {
  it("detects Maylecor from either metadata or legacy sections", () => {
    expect(
      portfolioUpgradeForProject({ project: { description: "portfolio:maylecor" } }),
    ).toBe("maylecor");
    expect(
      portfolioUpgradeForProject({ sections: [{ section_type: "legally-blonde-hero" }] }),
    ).toBe("maylecor");
  });

  it("detects Kdirection from either metadata or legacy sections", () => {
    expect(
      portfolioUpgradeForProject({ project: { description: "portfolio:kdirection" } }),
    ).toBe("kdirection");
    expect(
      portfolioUpgradeForProject({ sections: [{ section_type: "kdirection-page" }] }),
    ).toBe("kdirection");
  });

  it("preserves the existing Maylecor precedence for malformed mixed drafts", () => {
    expect(
      portfolioUpgradeForProject({
        project: { description: "portfolio:kdirection" },
        sections: [{ section_type: "maylecor-home" }],
      }),
    ).toBe("maylecor");
  });

  it("returns null for normal or malformed payloads", () => {
    expect(portfolioUpgradeForProject({ project: { description: "ordinary site" } })).toBeNull();
    expect(portfolioUpgradeForProject(null)).toBeNull();
    expect(portfolioUpgradeForProject({ sections: "not-an-array" })).toBeNull();
  });
});
