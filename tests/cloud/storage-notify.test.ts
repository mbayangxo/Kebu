import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ enqueuePlatformJob: vi.fn() }));
vi.mock("@/lib/platform/jobs", () => ({ enqueuePlatformJob: deps.enqueuePlatformJob }));

import { maybeNotifyCloudStorageThreshold } from "@/lib/cloud/storage-notify";
import type { CloudQuota } from "@/lib/cloud/quota";

const ownerId = "11111111-1111-4111-8111-111111111111";
const limitBytes = 1024 * 1024 * 1024; // 1 GB
const admin = {} as Parameters<typeof maybeNotifyCloudStorageThreshold>[0];

function quota(usedBytes: number): CloudQuota {
  return { usedBytes, limitBytes, tierName: "Starter" };
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.enqueuePlatformJob.mockResolvedValue(undefined);
});

describe("maybeNotifyCloudStorageThreshold", () => {
  it("does not fire below the 80% threshold", async () => {
    const fired = await maybeNotifyCloudStorageThreshold(admin, ownerId, quota(limitBytes * 0.79));
    expect(fired).toBe(false);
    expect(deps.enqueuePlatformJob).not.toHaveBeenCalled();
  });

  it("fires the 80% warning exactly at the threshold", async () => {
    const fired = await maybeNotifyCloudStorageThreshold(admin, ownerId, quota(limitBytes * 0.8));
    expect(fired).toBe(true);
    expect(deps.enqueuePlatformJob).toHaveBeenCalledTimes(1);
    const [, job] = deps.enqueuePlatformJob.mock.calls[0]!;
    expect(job.payload.title).toBe("Cloud storage almost full");
    expect(job.idempotencyKey).toMatch(/^notify:cloud_storage_warning:.*:80:\d{4}-\d{2}-\d{2}$/);
  });

  it("fires the 100% warning, not the 80% one, once completely full", async () => {
    const fired = await maybeNotifyCloudStorageThreshold(admin, ownerId, quota(limitBytes));
    expect(fired).toBe(true);
    const [, job] = deps.enqueuePlatformJob.mock.calls[0]!;
    expect(job.payload.title).toBe("Cloud storage full");
    expect(job.idempotencyKey).toMatch(/:100:\d{4}-\d{2}-\d{2}$/);
  });

  it("treats a zero-byte limit as 'nothing to warn about' instead of dividing by zero", async () => {
    const fired = await maybeNotifyCloudStorageThreshold(admin, ownerId, { usedBytes: 0, limitBytes: 0, tierName: "Starter" });
    expect(fired).toBe(false);
    expect(deps.enqueuePlatformJob).not.toHaveBeenCalled();
  });

  it("swallows an enqueue failure and reports it as not-fired rather than throwing", async () => {
    deps.enqueuePlatformJob.mockRejectedValue(new Error("platform_jobs insert failed"));
    const fired = await maybeNotifyCloudStorageThreshold(admin, ownerId, quota(limitBytes));
    expect(fired).toBe(false);
  });
});
