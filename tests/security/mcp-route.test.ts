import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/api-guard", () => ({
  authRateLimit: vi.fn(() => null),
}));

import { authRateLimit } from "@/lib/api-guard";
import { GET, POST } from "@/app/api/mcp/route";

const ORIGINAL_ENV = { ...process.env };
const STRONG_TOKEN = "kebu-mcp-test-token-that-is-at-least-32-chars";

function request(authorization?: string): NextRequest {
  return new Request("https://kebu.test/api/mcp", {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
  }) as NextRequest;
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.MCP_ENABLED;
  delete process.env.MCP_BEARER_TOKEN;
  vi.mocked(authRateLimit).mockReset();
  vi.mocked(authRateLimit).mockReturnValue(null);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("MCP privileged endpoint security boundary", () => {
  it("fails closed with 404 when MCP is not explicitly enabled", async () => {
    process.env.MCP_BEARER_TOKEN = STRONG_TOKEN;

    const getResponse = await GET();
    const postResponse = await POST(request(`Bearer ${STRONG_TOKEN}`));

    expect(getResponse.status).toBe(404);
    expect(postResponse.status).toBe(404);
    expect(authRateLimit).not.toHaveBeenCalled();
  });

  it("rejects a missing bearer token when MCP is enabled", async () => {
    process.env.MCP_ENABLED = "true";

    const response = await POST(request());

    expect(response.status).not.toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32001 },
    });
  });

  it("rejects configured bearer tokens shorter than 32 characters", async () => {
    process.env.MCP_ENABLED = "true";
    process.env.MCP_BEARER_TOKEN = "too-short";

    const response = await POST(request("Bearer too-short"));

    expect(response.status).not.toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32001 },
    });
  });

  it("rejects an incorrect bearer token", async () => {
    process.env.MCP_ENABLED = "true";
    process.env.MCP_BEARER_TOKEN = STRONG_TOKEN;

    const response = await POST(request("Bearer definitely-the-wrong-token-xxxxxxxxxxxx"));

    expect(response.status).not.toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32001 },
    });
  });

  it("accepts the configured strong bearer token and reaches MCP handling", async () => {
    process.env.MCP_ENABLED = "true";
    process.env.MCP_BEARER_TOKEN = STRONG_TOKEN;

    const response = await POST(request(`Bearer ${STRONG_TOKEN}`));

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.status).not.toBe(404);
    expect(authRateLimit).toHaveBeenCalledOnce();
  });

  it("returns the rate-limit response before authenticating or handling MCP", async () => {
    process.env.MCP_ENABLED = "true";
    process.env.MCP_BEARER_TOKEN = STRONG_TOKEN;
    vi.mocked(authRateLimit).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await POST(request(`Bearer ${STRONG_TOKEN}`));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: "Too many requests." });
    expect(authRateLimit).toHaveBeenCalledOnce();
  });
});
