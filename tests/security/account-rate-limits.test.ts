import { describe, expect, it } from "vitest";
import { browserReaderRateLimit, mailSendRateLimit } from "@/lib/api-guard";

function requestFor(ip: string): Request {
  return new Request("https://kebu.test/api", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("account-aware application rate limits", () => {
  it("limits Browser Reader bursts by IP", () => {
    const userId = crypto.randomUUID();
    const request = requestFor("198.51.100.44");
    for (let index = 0; index < 60; index += 1) {
      expect(browserReaderRateLimit(request, userId)).toBeNull();
    }
    expect(browserReaderRateLimit(request, userId)?.status).toBe(429);
  });

  it("limits Mail sending bursts by IP", () => {
    const userId = crypto.randomUUID();
    const request = requestFor("203.0.113.72");
    for (let index = 0; index < 10; index += 1) {
      expect(mailSendRateLimit(request, userId)).toBeNull();
    }
    expect(mailSendRateLimit(request, userId)?.status).toBe(429);
  });
});
