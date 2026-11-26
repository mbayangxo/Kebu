import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { browserConfiguration } from "@/lib/generation/browser";

afterEach(() => vi.unstubAllEnvs());

describe("generation browser configuration", () => {
  it("finds the packaged browser on Vercel without an executable override", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CREATIVE_GENERATION_APP_URL", "https://example.com");
    vi.stubEnv("CREATIVE_PREVIEW_SECRET", "a".repeat(32));
    vi.stubEnv("CREATIVE_CHROMIUM_EXECUTABLE_PATH", "");
    vi.stubEnv("KEBU_CHROMIUM_EXECUTABLE_PATH", "");
    expect(browserConfiguration()).toEqual({ origin: "https://example.com", executable: null });
  });

  it("does not hide an invalid explicit browser path", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("CREATIVE_GENERATION_APP_URL", "https://example.com");
    vi.stubEnv("CREATIVE_PREVIEW_SECRET", "a".repeat(32));
    vi.stubEnv("CREATIVE_CHROMIUM_EXECUTABLE_PATH", "/nonexistent/chromium");
    expect(browserConfiguration()).toBeNull();
  });
});
