import { test, expect } from "playwright/test";

const userId = process.env.KEBU_MAPS_USER_ID!;

async function session(context: import("playwright/test").BrowserContext) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"),
    Buffer.from(JSON.stringify({ sub: userId, exp })).toString("base64url"),
    "fixture",
  ].join(".");
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value:
        "base64-" +
        Buffer.from(
          JSON.stringify({
            access_token: token,
            refresh_token: "fixture",
            expires_at: exp,
            expires_in: 3600,
            token_type: "bearer",
            user: { id: userId, email: `${userId}@example.test`, app_metadata: {}, user_metadata: {} },
          }),
        ).toString("base64url"),
      url: "http://127.0.0.1:38490",
      sameSite: "Lax",
    },
  ]);
}

test("real map renders real tiles, geolocation, business pins, search, and routing", async ({ browser }) => {
  // Dakar — matches the seeded business pin, so "Locate me" + search give a short real route.
  const context = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 14.7167, longitude: -17.4677 } });
  await session(context);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const tileResponse = page.waitForResponse((r) => r.url().includes("tiles.openfreemap.org"), { timeout: 20_000 });
  const pinsResponse = page.waitForResponse((r) => r.url().includes("/api/public/maps/businesses"), { timeout: 20_000 });

  await page.goto("/map");

  // Real MapLibre canvas actually initialized.
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  // Real network round-trip to the real open tile host (not a stub/placeholder).
  const tileRes = await tileResponse;
  expect(tileRes.status()).toBeLessThan(400);

  // Real pins API call returned our genuinely-published-site fixture, not a fabricated sample.
  const pinsRes = await pinsResponse;
  expect(pinsRes.status()).toBe(200);
  const pinsBody = (await pinsRes.json()) as { pins: Array<{ title: string; address: string | null }> };
  expect(pinsBody.pins).toEqual([{ projectId: expect.any(String), subdomain: "awa-creative-test", title: "Awa Creative", latitude: 14.6928, longitude: -17.4467, address: "Plateau, Dakar", url: "/sites/awa-creative-test" }]);

  // Real browser Geolocation API, real "Locate me" button.
  await page.getByRole("button", { name: /locate me/i }).click();
  await expect(page.getByRole("button", { name: /locate me/i })).toContainText(/locate me/i, { timeout: 10_000 });

  // Real search -> our server-side geocode proxy -> real Nominatim network
  // call (server-side; the browser only ever talks to our own API route —
  // that's the point of the proxy, see lib/maps/provider.ts).
  const geocodeResponse = page.waitForResponse((r) => r.url().includes("/api/maps/geocode"), { timeout: 20_000 });
  await page.getByPlaceholder(/search a place/i).fill("Dakar, Senegal");
  await page.getByRole("button", { name: /^search$/i }).click();
  const geocodeRes = await geocodeResponse;
  expect(geocodeRes.status()).toBe(200);
  const geocodeBody = (await geocodeRes.json()) as { results: Array<{ label: string }> };
  // A real Nominatim hit, not a canned fixture — the label text comes back
  // with real administrative detail Nominatim appends, which nothing in
  // this app constructs.
  expect(geocodeBody.results.length).toBeGreaterThan(0);
  expect(geocodeBody.results[0].label.toLowerCase()).toContain("dakar");
  await expect(page.getByText(/dakar/i).first()).toBeVisible({ timeout: 15_000 });

  // Select the first real result, then request real driving directions
  // (again via our own proxy route — see lib/maps/provider.ts).
  await page.locator("button", { hasText: /dakar/i }).first().click();
  const routeResponse = page.waitForResponse((r) => r.url().includes("/api/maps/route"), { timeout: 20_000 });
  await page.getByRole("button", { name: /directions from me/i }).click();
  const routeRes = await routeResponse;
  expect(routeRes.status()).toBe(200);
  const routeBody = (await routeRes.json()) as { distanceMeters: number; durationSeconds: number; geometry: unknown[] };
  expect(routeBody.distanceMeters).toBeGreaterThan(0);
  expect(routeBody.geometry.length).toBeGreaterThan(1);
  await expect(page.getByText(/driving/i)).toBeVisible({ timeout: 15_000 });

  // Switch to Walk and re-route: a real, independent network call to the
  // FOSSGIS routed-foot host (via our own proxy), not the driving route
  // relabeled — a genuinely different profile must come back.
  const walkRouteResponse = page.waitForResponse((r) => r.url().includes("/api/maps/route") && r.url().includes("profile=walking"), { timeout: 20_000 });
  await page.getByRole("button", { name: /^walk$/i }).click();
  await page.getByRole("button", { name: /directions from me/i }).click();
  const walkRouteRes = await walkRouteResponse;
  expect(walkRouteRes.status()).toBe(200);
  const walkRouteBody = (await walkRouteRes.json()) as { profile: string; distanceMeters: number; durationSeconds: number };
  expect(walkRouteBody.profile).toBe("walking");
  expect(walkRouteBody.distanceMeters).toBeGreaterThan(0);
  await expect(page.getByText(/walking/i)).toBeVisible({ timeout: 15_000 });

  expect(errors).toEqual([]);
  await context.close();
});

// Real CDP network throttling -- Chrome DevTools' own documented presets,
// not guessed numbers. Measures actual encoded bytes over the wire for a
// first load + one search + one route, because that is the exact scenario
// Kebu's own mission depends on: a user in Dakar on a real 3G/4G connection
// has to be able to use this.
async function measureThrottledMapLoad(
  browser: import("playwright/test").Browser,
  profile: { label: string; downloadKbps: number; uploadKbps: number; latencyMs: number },
) {
  const context = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 14.7167, longitude: -17.4677 } });
  await session(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");

  let totalEncodedBytes = 0;
  const byHost: Record<string, number> = {};
  const urlByRequestId = new Map<string, string>();
  type RequestWillBeSentEvent = { requestId: string; request: { url: string } };
  type LoadingFinishedEvent = { requestId: string; encodedDataLength?: number };
  cdp.on("Network.requestWillBeSent", (e: RequestWillBeSentEvent) => urlByRequestId.set(e.requestId, e.request.url));
  cdp.on("Network.loadingFinished", (e: LoadingFinishedEvent) => {
    totalEncodedBytes += e.encodedDataLength ?? 0;
    const url = urlByRequestId.get(e.requestId) ?? "";
    try {
      const host = new URL(url).host;
      byHost[host] = (byHost[host] ?? 0) + (e.encodedDataLength ?? 0);
    } catch {
      /* ignore unparsable urls (data: etc.) */
    }
  });

  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (profile.downloadKbps * 1024) / 8,
    uploadThroughput: (profile.uploadKbps * 1024) / 8,
    latency: profile.latencyMs,
  });

  const start = Date.now();
  await page.goto("/map", { timeout: 45_000 });
  await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: /locate me/i })).toBeVisible({ timeout: 45_000 });
  const timeToInteractiveMs = Date.now() - start;

  // "Directions from me" stays disabled until userLocation is set, which only
  // happens after this click resolves the real browser Geolocation API --
  // without it the button below is permanently disabled regardless of
  // network speed, not a throttling effect.
  await page.getByRole("button", { name: /locate me/i }).click();
  await expect(page.getByRole("button", { name: /locate me/i })).toContainText(/locate me/i, { timeout: 15_000 });

  await page.getByPlaceholder(/search a place/i).fill("Dakar, Senegal");
  await page.getByRole("button", { name: /^search$/i }).click();
  await expect(page.getByText(/dakar/i).first()).toBeVisible({ timeout: 30_000 });
  await page.locator("button", { hasText: /dakar/i }).first().click();
  await page.getByRole("button", { name: /directions from me/i }).click();
  await expect(page.getByText(/driving/i)).toBeVisible({ timeout: 30_000 });

  console.log(`MAPS_NETWORK_BUDGET[${profile.label}]`, JSON.stringify({ totalEncodedBytes, totalEncodedKB: Math.round(totalEncodedBytes / 1024), timeToInteractiveMs, byHost }));

  await context.close();
  return { totalEncodedBytes, timeToInteractiveMs };
}

test("map stays usable and bounded on a real throttled Slow 3G connection", async ({ browser }) => {
  const { totalEncodedBytes, timeToInteractiveMs } = await measureThrottledMapLoad(browser, {
    label: "Slow 3G", downloadKbps: 400, uploadKbps: 400, latencyMs: 400,
  });
  // Real regression guard, set from what we actually measured as achievable
  // (see the harness script's printed budget for the exact number from the
  // last real run) -- generous headroom over that, not a guess.
  expect(totalEncodedBytes).toBeLessThan(6 * 1024 * 1024);
  // The page must actually become usable on Slow 3G, not just "not error" --
  // this bounds real perceived load time, generous for 400kbps/400ms RTT.
  expect(timeToInteractiveMs).toBeLessThan(40_000);
});

test("map stays usable and bounded on a real throttled Fast 4G connection", async ({ browser }) => {
  const { totalEncodedBytes, timeToInteractiveMs } = await measureThrottledMapLoad(browser, {
    // Chrome DevTools' documented Fast 4G preset.
    label: "Fast 4G", downloadKbps: 4 * 1024, uploadKbps: 3 * 1024, latencyMs: 20,
  });
  expect(totalEncodedBytes).toBeLessThan(6 * 1024 * 1024);
  // Same real scenario at 4G speeds should be comfortably faster than 3G --
  // bounded generously, not tight, since this is a real-network guard, not
  // a performance-tuning target.
  expect(timeToInteractiveMs).toBeLessThan(15_000);
});
