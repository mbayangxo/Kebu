import { describe, expect, it } from "vitest";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import { socialRailStyleFromProps } from "@/app/components/create/editable-social-rail";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";

describe("maylecor social rail", () => {
  it("defaults include editable rail fields + social links", () => {
    const props = defaultMaylecorKsendrProps();
    expect(props.socialLinks.length).toBeGreaterThan(0);
    expect(props.socialRailVisible).toBe(true);
    expect(props.socialRailLeftPct).toBe(0);
    const parsed = sectionPropsSchemas["legally-blonde-hero"].parse(props);
    expect(parsed.socialRailBg).toContain("0,0,0");
  });

  it("maps props into rail style", () => {
    const style = socialRailStyleFromProps({
      socialRailVisible: false,
      socialRailBg: "#111",
      socialRailLeftPct: 8,
      socialRailTopPct: 20,
      socialRailIconSize: 48,
    });
    expect(style.visible).toBe(false);
    expect(style.bgColor).toBe("#111");
    expect(style.leftPct).toBe(8);
    expect(style.iconSize).toBe(48);
  });
});
