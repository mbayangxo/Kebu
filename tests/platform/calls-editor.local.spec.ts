import { test, expect, type BrowserContext, type Page } from "playwright/test";
import { attachFakeRealtime, createRealtimeHub } from "./support/fake-supabase-realtime";

const host = process.env.KEBU_CALLS_HOST_ID!;
const guest = process.env.KEBU_CALLS_GUEST_ID!;
const roomId = process.env.KEBU_CALLS_ROOM_ID!;

async function session(context: BrowserContext, id: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify({ sub: id, exp })).toString("base64url"),
    "fixture",
  ].join(".");
  await context.addCookies([{
    name: "sb-127-auth-token",
    value: "base64-" + Buffer.from(JSON.stringify({
      access_token: token, refresh_token: "fixture", expires_at: exp, expires_in: 3600, token_type: "bearer",
      user: { id, email: `${id}@example.test`, app_metadata: {}, user_metadata: {} },
    })).toString("base64url"),
    url: "http://127.0.0.1:38460",
    sameSite: "Lax",
  }]);
}

async function joinCall(context: BrowserContext, userId: string, hub: ReturnType<typeof createRealtimeHub>): Promise<Page> {
  await session(context, userId);
  const page = await context.newPage();
  await attachFakeRealtime(page, hub);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`/rooms/${roomId}/call`);
  await page.getByRole("button", { name: /join with camera and mic/i }).click();
  await expect(page.getByRole("button", { name: /leave call/i })).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
  return page;
}

test("two real peers connect over WebRTC with real media flowing both ways", async ({ browser }) => {
  const hub = createRealtimeHub();
  const hostCtx = await browser.newContext({ permissions: ["camera", "microphone"] });
  const guestCtx = await browser.newContext({ permissions: ["camera", "microphone"] });
  try {
    const hostPage = await joinCall(hostCtx, host, hub);
    const guestPage = await joinCall(guestCtx, guest, hub);

    // Real RTCPeerConnection, real fake-device media, real trickle ICE over the
    // fixture signaling channel — both sides should actually reach "connected".
    await expect(hostPage.getByText(/connected/i)).toBeVisible({ timeout: 15_000 });
    await expect(guestPage.getByText(/connected/i)).toBeVisible({ timeout: 15_000 });

    for (const [label, page] of [["host", hostPage], ["guest", guestPage]] as const) {
      const remoteHasLiveTracks = await page.evaluate(() => {
        const videos = Array.from(document.querySelectorAll("video"));
        const remote = videos.find((v) => v !== videos[0]); // tile 0 is local
        const stream = remote?.srcObject as MediaStream | null;
        return !!stream && stream.getTracks().length > 0 && stream.getTracks().every((t) => t.readyState === "live");
      });
      expect(remoteHasLiveTracks, `${label}'s remote tile should have live media tracks`).toBe(true);
    }
  } finally {
    await hostCtx.close(); await guestCtx.close();
  }
});

test("mute and camera-off actually disable the local tracks", async ({ browser }) => {
  const hub = createRealtimeHub();
  const ctx = await browser.newContext({ permissions: ["camera", "microphone"] });
  try {
    const page = await joinCall(ctx, host, hub);
    const trackStates = () => page.evaluate(() => {
      const video = document.querySelector("video") as HTMLVideoElement | null;
      const stream = video?.srcObject as MediaStream | null;
      return {
        audio: stream?.getAudioTracks()[0]?.enabled,
        video: stream?.getVideoTracks()[0]?.enabled,
      };
    });
    expect(await trackStates()).toEqual({ audio: true, video: true });

    await page.getByRole("button", { name: /^mute$/i }).click();
    await expect(page.getByRole("button", { name: /unmute/i })).toBeVisible();
    expect((await trackStates()).audio).toBe(false);

    await page.getByRole("button", { name: /turn camera off/i }).click();
    await expect(page.getByRole("button", { name: /turn camera on/i })).toBeVisible();
    expect((await trackStates()).video).toBe(false);
  } finally {
    await ctx.close();
  }
});

test("sharing the screen replaces the outgoing video track and the remote side sees it, then restores the camera", async ({ browser }) => {
  const hub = createRealtimeHub();
  const hostCtx = await browser.newContext({ permissions: ["camera", "microphone"] });
  const guestCtx = await browser.newContext({ permissions: ["camera", "microphone"] });
  try {
    const hostPage = await joinCall(hostCtx, host, hub);
    const guestPage = await joinCall(guestCtx, guest, hub);
    await expect(hostPage.getByText(/connected/i)).toBeVisible({ timeout: 15_000 });
    await expect(guestPage.getByText(/connected/i)).toBeVisible({ timeout: 15_000 });

    const remoteVideoDims = () => guestPage.evaluate(() => {
      const videos = Array.from(document.querySelectorAll("video"));
      const remote = videos.find((v) => v !== videos[0]) as HTMLVideoElement | undefined;
      return { width: remote?.videoWidth ?? 0, height: remote?.videoHeight ?? 0 };
    });

    // Chromium's fake camera device defaults to 640x480; getDisplayMedia's
    // fake desktop capture defaults to 1280x720 — a real, measurable
    // difference in decoded frame size proves the remote side is actually
    // receiving the shared-screen content, not just "a track that exists".
    await expect.poll(remoteVideoDims, { timeout: 15_000 }).toMatchObject({ width: 640, height: 480 });

    await hostPage.getByRole("button", { name: /^share screen$/i }).click();
    await expect(hostPage.getByRole("button", { name: /^stop sharing$/i })).toBeVisible();
    await expect(hostPage.getByText(/your shared screen/i)).toBeVisible();

    await expect.poll(remoteVideoDims, { timeout: 15_000 }).toMatchObject({ width: 1280, height: 720 });
    const remoteTrackLiveWhileSharing = await guestPage.evaluate(() => {
      const videos = Array.from(document.querySelectorAll("video"));
      const remote = videos.find((v) => v !== videos[0]) as HTMLVideoElement | undefined;
      const stream = remote?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      return track?.readyState === "live";
    });
    expect(remoteTrackLiveWhileSharing, "remote video track should still be live while screen-sharing").toBe(true);

    await hostPage.getByRole("button", { name: /^stop sharing$/i }).click();
    await expect(hostPage.getByRole("button", { name: /^share screen$/i })).toBeVisible();
    await expect(hostPage.getByText(/^you$/i)).toBeVisible();

    // Stopping restores the camera track — remote frame size goes back to
    // the webcam's resolution, proving replaceTrack really swapped back.
    await expect.poll(remoteVideoDims, { timeout: 15_000 }).toMatchObject({ width: 640, height: 480 });
  } finally {
    await hostCtx.close(); await guestCtx.close();
  }
});

test("leaving ends the call and it shows up in call history", async ({ browser, request }) => {
  await request.post("http://127.0.0.1:38461/__qa/reset");
  const hub = createRealtimeHub();
  const ctx = await browser.newContext({ permissions: ["camera", "microphone"] });
  try {
    const page = await joinCall(ctx, host, hub);
    await page.getByRole("button", { name: /leave call/i }).click();
    await expect(page.getByText(/you left the call/i)).toBeVisible();
    await expect(page.getByText(/past calls/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/1 participant/i)).toBeVisible();
  } finally {
    await ctx.close();
  }
});
