import { describe, expect, it } from "vitest";
import {
  applyCollageLayoutPatch,
  builderDeviceFromWidth,
  defaultDeviceLayoutsForCollage,
  resolveCollagePhotoForDevice,
} from "@/lib/create/builder-device";
import { defaultKdirectionHomeProps } from "@/lib/create/kdirection-defaults";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

describe("builder device layouts", () => {
  it("maps viewport widths to desktop/tablet/phone", () => {
    expect(builderDeviceFromWidth(1440)).toBe("desktop");
    expect(builderDeviceFromWidth(800)).toBe("tablet");
    expect(builderDeviceFromWidth(390)).toBe("mobile");
  });

  it("resolves tablet/mobile overrides without changing desktop base", () => {
    const photo = {
      src: "https://example.com/a.jpg",
      rotate: 10,
      topPct: 20,
      leftPct: 30,
      widthPct: 16,
      tablet: { topPct: 15, leftPct: 25, widthPct: 22 },
      mobile: { topPct: 8, leftPct: 10, widthPct: 40, hidden: false },
    };
    expect(resolveCollagePhotoForDevice(photo, "desktop").topPct).toBe(20);
    expect(resolveCollagePhotoForDevice(photo, "tablet").widthPct).toBe(22);
    expect(resolveCollagePhotoForDevice(photo, "mobile").leftPct).toBe(10);
  });

  it("patches tablet layout without overwriting desktop", () => {
    const photo = {
      src: "https://example.com/a.jpg",
      rotate: 0,
      topPct: 20,
      leftPct: 30,
      widthPct: 16,
    };
    const next = applyCollageLayoutPatch(photo, "tablet", { topPct: 44, leftPct: 12 });
    expect(next.topPct).toBe(20);
    expect(next.tablet?.topPct).toBe(44);
    expect(next.tablet?.leftPct).toBe(12);
  });

  it("kdirection defaults include tablet and mobile layouts and validate", () => {
    const props = defaultKdirectionHomeProps();
    expect(props.collagePhotos.every((p) => p.tablet && p.mobile)).toBe(true);
    const layouts = defaultDeviceLayoutsForCollage(props.collagePhotos[0]!, 0);
    expect(layouts.mobile?.widthPct).toBeGreaterThan(props.collagePhotos[0]!.widthPct);
    const result = validateWebsiteDefinition({
      schemaVersion: "website-v1",
      title: "K-Direction",
      theme: {
        primary: "#0A0A0A",
        accent: "#FFF86B",
        background: "#e8e0f0",
        text: "#0A0A0A",
        fontDisplay: "Oswald",
        fontBody: "Arial",
        spacing: "comfortable",
      },
      pages: [
        {
          slug: "home",
          title: "Home",
          sections: [{ id: "kd", type: "kdirection-home", props }],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});
