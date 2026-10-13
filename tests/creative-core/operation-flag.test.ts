import { describe, expect, it } from "vitest";
import { builderOperationsEnabled } from "@/lib/create/kcd-render-flag";
const id = "11111111-1111-4111-8111-111111111111";
const qa = { KEBU_KCD_RENDER: "all", VERCEL_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "https://skqnxyaeimvbyrmdfzvk.supabase.co" };
describe("separate operation editing gate", () => {
  it("is off by default even when KCD rendering is enabled", () => {
    expect(builderOperationsEnabled(id, qa)).toBe(false);
    expect(builderOperationsEnabled(id, { ...qa, KEBU_KCD_OPERATIONS: "all" })).toBe(true);
  });
  it("requires both per-project flags", () => {
    expect(builderOperationsEnabled(id, { ...qa, KEBU_KCD_OPERATIONS: id })).toBe(true);
    expect(builderOperationsEnabled(id, { ...qa, KEBU_KCD_OPERATIONS: "other" })).toBe(false);
    expect(builderOperationsEnabled(id, { ...qa, KEBU_KCD_RENDER: "", KEBU_KCD_OPERATIONS: "all" })).toBe(false);
  });
  it("cannot enable writes against production by setting the flags", () => {
    expect(builderOperationsEnabled(id, { ...qa, KEBU_KCD_OPERATIONS: "all", VERCEL_ENV: "production" })).toBe(false);
    expect(builderOperationsEnabled(id, { ...qa, KEBU_KCD_OPERATIONS: "all", NEXT_PUBLIC_SUPABASE_URL: "https://tnygqgcqlnlsmjpygrca.supabase.co" })).toBe(false);
  });
});
