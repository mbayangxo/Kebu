import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isPublicTemplateSlug } from "@/lib/create/templates-seed";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn(async () => ({ data: { user: null } })) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser } }) }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("serves public gallery embeds without depending on the auth service", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-only");
  const response = await updateSession(new NextRequest("https://kebu.test/create/templates/preview/musician-artist"));
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
  expect(getUser).not.toHaveBeenCalled();
  expect(isPublicTemplateSlug("musician-artist")).toBe(true);
  expect(isPublicTemplateSlug("musician-maylecor-ksendr")).toBe(false);
});

it.each(["/create/private-project", "/create/templates/preview/musician-artist/edit", "/create/templates", "/create/demo/musician-artist"])("retains authentication for %s", async pathname => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-only");
  const response = await updateSession(new NextRequest(`https://kebu.test${pathname}`));
  expect(response.status).toBe(307);
  expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  expect(getUser).toHaveBeenCalledOnce();
});
