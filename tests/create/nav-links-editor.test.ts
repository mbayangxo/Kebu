import { describe, expect, it } from "vitest";
import { mapNavLinksForEditor } from "@/app/components/create/nav-links-editor";

describe("mapNavLinksForEditor", () => {
  it("preserves multiNav children so hover dropdowns survive save", () => {
    const mapped = mapNavLinksForEditor([
      {
        label: "Shop",
        href: "/shop",
        multiNav: true,
        children: [
          { label: "All products", href: "/shop" },
          { label: "Tees", href: "/shop" },
        ],
      },
      { label: "Press", href: "/press", multiNav: false },
    ]);
    expect(mapped[0]?.multiNav).toBe(true);
    expect(mapped[0]?.children).toHaveLength(2);
    expect(mapped[0]?.children?.[1]?.label).toBe("Tees");
    expect(mapped[1]?.multiNav).toBe(false);
    expect(mapped[1]?.children).toEqual([]);
  });
});
