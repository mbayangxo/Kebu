import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: vi.fn() }));
import AppearanceQaPage from "@/app/qa/builder-appearance/page";

afterEach(() => vi.unstubAllEnvs());

describe("Appearance fixture is unavailable in production", () => {
  it.each(["production", "development", "unknown", undefined])("production build rejects deployment environment %s", async environment => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", environment);
    await expect(AppearanceQaPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });
  it("allows a preview deployment without reading customer data", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "preview");
    const page = await AppearanceQaPage({ searchParams: Promise.resolve({ frame: "phone" }) });
    expect(page.props.phoneFrame).toBe(true);
  });
  it("allows a local development server", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL_ENV", undefined);
    const page = await AppearanceQaPage({ searchParams: Promise.resolve({}) });
    expect(page.props.phoneFrame).toBe(false);
  });
});
