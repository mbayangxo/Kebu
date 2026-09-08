import { describe, expect, it } from "vitest";
import { themeSchema } from "@/lib/create/website-schema";
import { themeToCssVars } from "@/lib/create/site-aesthetics";

describe("theme typography tokens", () => {
  it("persists heading scale, body size, and letter spacing as CSS vars", () => {
    const theme = themeSchema.parse({
      primary: "#0F0D33",
      accent: "#E9006B",
      background: "#FAFAF8",
      text: "#0F0D33",
      fontDisplay: "Oswald",
      fontBody: "system-ui",
      spacing: "airy",
      headingScale: "xl",
      bodySize: "lg",
      letterSpacing: "wide",
    });
    const vars = themeToCssVars(theme);
    expect(vars["--kebu-font-display"]).toBe("Oswald");
    expect(vars["--kebu-heading-scale"]).toBe("1.35");
    expect(vars["--kebu-body-size"]).toBe("1.125rem");
    expect(vars["--kebu-tracking"]).toBe("0.06em");
  });
});
