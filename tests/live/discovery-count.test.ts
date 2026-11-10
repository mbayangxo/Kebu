import { afterEach, describe, expect, it, vi } from "vitest";

const calls: { method: string; args: unknown[] }[] = [];
function chain(result: { count: number | null; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["from", "select", "is", "gt"]) {
    builder[method] = (...args: unknown[]) => { calls.push({ method, args }); return builder; };
  }
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result));
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

afterEach(() => { calls.length = 0; vi.resetModules(); });

describe("liveBroadcastCount", () => {
  it("counts only broadcasts that have not ended and have not expired", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(chain({ count: 3, error: null }) as never);
    const { liveBroadcastCount } = await import("@/lib/live/discovery");
    await expect(liveBroadcastCount()).resolves.toBe(3);
    expect(calls).toEqual([
      { method: "from", args: ["kebu_live_broadcasts"] },
      { method: "select", args: ["id", { count: "exact", head: true }] },
      { method: "is", args: ["ended_at", null] },
      { method: "gt", args: ["expires_at", expect.any(String)] },
    ]);
  });

  it("returns null rather than a fabricated count when the query errors", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(chain({ count: null, error: new Error("db down") }) as never);
    const { liveBroadcastCount } = await import("@/lib/live/discovery");
    await expect(liveBroadcastCount()).resolves.toBeNull();
  });

  it("treats a null count with no error as zero, not null (distinguishes 'no rows' from 'query failed')", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue(chain({ count: null, error: null }) as never);
    const { liveBroadcastCount } = await import("@/lib/live/discovery");
    await expect(liveBroadcastCount()).resolves.toBe(0);
  });
});
