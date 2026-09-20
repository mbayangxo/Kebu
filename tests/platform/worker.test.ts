import { describe, expect, it, vi } from "vitest";
import { runPlatformWorker } from "@/lib/platform/worker";

describe("platform worker", () => {
  it("claims and completes a notification job", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: [{ id: "j1", job_type: "notification.create", payload: { userId: "u1", title: "Published" }, attempts: 1, max_attempts: 5 }], error: null }),
      from: vi.fn((table: string) => table === "user_notifications" ? { insert } : { update: vi.fn(() => ({ eq: updateEq })) }),
    } as any;
    const result = await runPlatformWorker(admin, "test", 1);
    expect(result).toEqual({ claimed: 1, succeeded: 1, failed: 0 });
    expect(insert).toHaveBeenCalledOnce();
  });
});
