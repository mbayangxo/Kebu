import { afterEach, describe, expect, it } from "vitest";
import { requireCronSecret } from "@/lib/api-guard";

const originalNodeEnv = process.env.NODE_ENV;
const originalCronSecret = process.env.CRON_SECRET;

afterEach(() => {
  Object.defineProperty(process.env, "NODE_ENV", { value: originalNodeEnv, writable: true });
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

function request(token?: string) {
  return new Request("https://kebu.example/api/cron/task", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("requireCronSecret", () => {
  it("fails closed in production when secret is missing", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
    delete process.env.CRON_SECRET;
    expect(requireCronSecret(request() as never)?.status).toBe(503);
  });

  it("fails closed in production for placeholder or weak secrets", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
    for (const secret of ["change_me_in_production", "replace_with_secret", "short"]) {
      process.env.CRON_SECRET = secret;
      expect(requireCronSecret(request(secret) as never)?.status).toBe(503);
    }
  });

  it("accepts only the matching strong bearer in production", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });
    const secret = "a-strong-cron-secret-with-more-than-32-characters";
    process.env.CRON_SECRET = secret;
    expect(requireCronSecret(request("wrong-secret") as never)?.status).toBe(401);
    expect(requireCronSecret(request(secret) as never)).toBeNull();
  });
});
