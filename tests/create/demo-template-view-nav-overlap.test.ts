import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression for a real, found-and-fixed bug in the internal `/create/demo/*`
 * template-preview tool: `DemoTemplateView`'s own floating "Demo pages" pill-switcher
 * (not the real published site's nav) grew unboundedly tall on narrow viewports —
 * `flex-wrap` + `max-h-[40vh]` let a 13-page template wrap into several rows (measured
 * ~132px tall on a 375px-wide viewport) — and that tall overlay visually collided with
 * the real site nav rendered underneath it. Confirmed live via Playwright: the old
 * classes produced a pill list whose bottom edge (144px) sat well past the real nav's
 * top edge (56px); the fix below bounds the overlay to a single scrollable row
 * (~30px tall), leaving a clear gap above the real nav regardless of page count.
 */
describe("Demo template viewer — Demo pages overlay does not overlap site content", () => {
  const source = readFileSync(
    join(process.cwd(), "app/components/create/demo-template-view.tsx"),
    "utf8",
  );

  it("bounds the page-switcher pill list to a single row instead of unbounded vertical wrap", () => {
    const match = source.match(/aria-label="Demo pages"[\s\S]{0,40}/);
    expect(match).toBeTruthy();

    const containerOpenTag = source.slice(
      source.indexOf('className="flex max-w-[70vw]'),
      source.indexOf("aria-label=\"Demo pages\"") + 40,
    );
    expect(containerOpenTag).toContain("flex-nowrap");
    expect(containerOpenTag).toContain("overflow-x-auto");
    // The original bug's exact classes must not come back.
    expect(source).not.toContain("flex-wrap justify-end gap-1 overflow-y-auto");
    expect(source).not.toMatch(/max-h-\[40vh\][^]*?aria-label="Demo pages"/);
  });

  it("keeps each page pill from shrinking or wrapping inside the scrollable row", () => {
    const buttonClassMatch = source.match(
      /onClick=\{\(\) => setPageSlug\(p\.slug\)\}\s*\n\s*className="([^"]+)"/,
    );
    expect(buttonClassMatch).toBeTruthy();
    const buttonClass = buttonClassMatch?.[1] ?? "";
    expect(buttonClass).toContain("flex-shrink-0");
    expect(buttonClass).toContain("whitespace-nowrap");
  });
});
