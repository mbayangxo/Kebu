import { describe, expect, it, vi } from "vitest";
import { startBroadcast } from "@/lib/live/start-broadcast";

describe("public broadcast failure recovery", () => {
  it("closes the newly created listing when camera permission or connection fails", async () => {
    const end = vi.fn().mockResolvedValue({ ok:true });
    await expect(startBroadcast(async () => ({ id:"new-room" }), async () => { throw new Error("Permission denied"); }, end)).rejects.toThrow("Permission denied");
    expect(end).toHaveBeenCalledExactlyOnceWith("new-room");
  });
  it("keeps a connected broadcast live", async () => {
    const end = vi.fn();
    await expect(startBroadcast(async () => ({ id:"new-room" }), async () => {}, end)).resolves.toEqual({ id:"new-room" });
    expect(end).not.toHaveBeenCalled();
  });
  it("reports that cleanup also failed rather than claiming the listing ended", async () => {
    await expect(startBroadcast(async () => ({ id:"new-room" }), async () => { throw new Error("Offline"); }, async () => { throw new Error("Offline"); })).rejects.toThrow("room could not be closed");
  });
});
