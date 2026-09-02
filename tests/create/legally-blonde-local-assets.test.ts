import { describe, expect, it } from "vitest";
import {
  LEGALLY_BLONDE_ASSETS,
  localizeLegallyBlondeAssetUrl,
} from "@/lib/create/legally-blonde-defaults";

describe("localizeLegallyBlondeAssetUrl", () => {
  it("maps Tilda CDN URLs to Kebu-hosted transparent cutouts", () => {
    expect(
      localizeLegallyBlondeAssetUrl(
        "https://static.tildacdn.com/tild6538-3665-4232-b661-376339363635/Group_556.png",
      ),
    ).toBe(LEGALLY_BLONDE_ASSETS.cutoutLeft);
    expect(LEGALLY_BLONDE_ASSETS.backgroundLayer).toBe("/templates/legally-blonde/background.png");
  });

  it("keeps empty remove signal", () => {
    expect(localizeLegallyBlondeAssetUrl("")).toBe("");
  });
});
