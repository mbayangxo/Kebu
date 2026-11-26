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
  await page.addInitScript(() => {
    const Original = window.RTCPeerConnection;
    const connections: RTCPeerConnection[] = [];
    Object.assign(window, { __qaConnections: connections });
    window.RTCPeerConnection = class extends Original { constructor(config?: RTCConfiguration) { super(config); connections.push(this); } };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => { errors.push(e.message); console.log("CALL_PAGE_ERROR", e.message); });
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
    await expect(hostPage.getByText(/connected/i)).toBeVisible({ timeout: 15_000 }).catch(async error => {
      for (const page of [hostPage, guestPage]) console.log("CALL_DIAGNOSTICS", await page.evaluate(async () => Promise.all(((window as unknown as { __qaConnections: RTCPeerConnection[] }).__qaConnections).map(async pc => ({ state: pc.connectionState, senders: pc.getSenders().map(s => s.track?.kind), signaling: pc.signalingState, localCandidates: pc.localDescription?.sdp.match(/a=candidate:.*/g), remoteCandidates: pc.remoteDescription?.sdp.match(/a=candidate:.*/g), stats: Array.from((await pc.getStats()).values()).filter(s => ["candidate-pair", "local-candidate", "remote-candidate"].includes(s.type)) })))));
      throw error;
    });
    await expect(guestPage.getByText(/connected/i)).toBeVisible({ timeout: 15_000 });

    for (const [label, page] of [["host", hostPage], ["guest", guestPage]] as const) {
      await expect.poll(() => page.locator("video").nth(1).evaluate(video => (video as HTMLVideoElement).videoWidth), { timeout: 15_000 }).toBeGreaterThan(0);
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

test("sharing shows camera and project side by side, then removes only the shared screen", async ({ browser }) => {
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

    // Encoders adapt resolution to CPU/bandwidth. Compare aspect ratios to
    // the actual source instead of assuming a particular encoded pixel size.
    await expect.poll(() => hostPage.locator("video").first().evaluate(video => (video as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
    const cameraRatio = await hostPage.locator("video").first().evaluate(video => (video as HTMLVideoElement).videoWidth / (video as HTMLVideoElement).videoHeight);
    await expect.poll(async () => { const d = await remoteVideoDims(); return Math.abs(d.width / d.height - cameraRatio); }, { timeout: 15_000 }).toBeLessThan(0.03);

    await hostPage.getByRole("button", { name: /^share screen$/i }).click();
    await expect(hostPage.getByRole("button", { name: /^stop sharing$/i })).toBeVisible();
    await expect(hostPage.getByText(/your shared screen/i)).toBeVisible();

    const sharedVideo = guestPage.getByTestId(`remote-screen-${host}`).locator("video");
    await expect(sharedVideo).toBeVisible();
    const sharedVideoDims = () => sharedVideo.evaluate(video => ({ width: (video as HTMLVideoElement).videoWidth, height: (video as HTMLVideoElement).videoHeight }));
    const screenPreview = hostPage.locator("video").last();
    await expect.poll(() => screenPreview.evaluate(video => (video as HTMLVideoElement).videoWidth)).toBeGreaterThan(0);
    const screenRatio = await screenPreview.evaluate(video => (video as HTMLVideoElement).videoWidth / (video as HTMLVideoElement).videoHeight);
    expect(Math.abs(screenRatio - cameraRatio)).toBeGreaterThan(0.05);
    await expect.poll(async () => { const d = await sharedVideoDims(); return Math.abs(d.width / d.height - screenRatio); }, { timeout: 15_000 }).toBeLessThan(0.03);
    await expect.poll(async () => { const d = await remoteVideoDims(); return Math.abs(d.width / d.height - cameraRatio); }).toBeLessThan(0.03);
    const sharedTrackLive = await sharedVideo.evaluate(video => ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]?.readyState === "live");
    expect(sharedTrackLive).toBe(true);

    await hostPage.getByRole("button", { name: /^stop sharing$/i }).click();
    await expect(hostPage.getByRole("button", { name: /^share screen$/i })).toBeVisible();
    await expect(hostPage.getByText(/^you$/i)).toBeVisible();

    await expect(guestPage.getByTestId(`remote-screen-${host}`)).toHaveCount(0);
    // The SDP answerer must be able to share too, without renegotiating or losing its camera.
    await guestPage.getByRole("button", { name: /^share screen$/i }).click();
    const guestScreen = hostPage.getByTestId(`remote-screen-${guest}`).locator("video");
    await expect(guestScreen).toBeVisible();
    await expect.poll(() => guestScreen.evaluate(video => (video as HTMLVideoElement).videoWidth), { timeout: 15_000 }).toBeGreaterThan(0);
    await guestPage.getByRole("button", { name: /^stop sharing$/i }).click();
    await expect(hostPage.getByTestId(`remote-screen-${guest}`)).toHaveCount(0);
    // Stopping leaves the camera track — remote frame size goes back to
    // the webcam's resolution, proving replaceTrack really swapped back.
    await expect.poll(async () => { const d = await remoteVideoDims(); return Math.abs(d.width / d.height - cameraRatio); }, { timeout: 15_000 }).toBeLessThan(0.03);
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
    await expect(page.getByRole("button", { name: "Rejoin with camera and mic" })).toBeVisible();
    await page.getByRole("button", { name: "Join with microphone only" }).click();
    await expect(page.getByRole("button", { name: "Leave call", exact: true })).toBeVisible();
    const tracks = await page.locator("video").first().evaluate(video => ({ audio: (video as HTMLVideoElement).srcObject instanceof MediaStream ? ((video as HTMLVideoElement).srcObject as MediaStream).getAudioTracks().length : 0, video: (video as HTMLVideoElement).srcObject instanceof MediaStream ? ((video as HTMLVideoElement).srcObject as MediaStream).getVideoTracks().length : -1 }));
    expect(tracks).toEqual({ audio: 1, video: 0 });
  } finally {
    await ctx.close();
  }
});
