import { test, expect, type Page } from "playwright/test";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { emptyCanvasDocument, canvasLayerSchema } from "../../lib/studio/canvas-document";
import { emptyStudioComposition, compositionClipSchema } from "../../lib/studio/composition";

const id = "22222222-2222-4222-8222-222222222222", owner = "33333333-3333-4333-8333-333333333333";
const rev = (n: number) => `2026-10-13T12:00:${String(n).padStart(2, "0")}.000Z`;
function canvas(missing = false) {
  const doc = emptyCanvasDocument({ width: 640, height: 640 });
  const text = canvasLayerSchema.parse({ id: "title", type: "text", name: "Title", text: "Original", x: 20, y: 20, width: 300, height: 70, fontSize: 32, color: "#111111" });
  const image = canvasLayerSchema.parse({ id: "image", type: "image", x: 20, y: 120, width: 100, height: 100, imageUrl: missing ? "http://127.0.0.1:38416/missing-image.png" : "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#00ff00"/></svg>').toString("base64") });
  doc.pages[0]!.layers = [text, image]; doc.layers = [text, image];
  doc.pages[0]!.backgroundColor = "#ffffff";
  return doc;
}
function composition(audio = false) {
  const c = emptyStudioComposition({ width: 640, height: 640 });
  c.tracks.push({ id: "overlay", kind: "overlay", name: "Title", order: 5, muted: false, solo: false, volume: 1, locked: false });
  c.clips = [compositionClipSchema.parse({ id: "text", trackId: "overlay", startMs: 0, durationMs: 700, name: "Original", designLayer: { type: "text", text: "Original", fontSize: 64, color: "#ffffff" } })];
  if (audio) {
    c.tracks.push({ id: "sound", kind: "audio", name: "Tone", order: 6, muted: false, solo: false, volume: 1, locked: false });
    c.clips.push(compositionClipSchema.parse({ id: "tone", trackId: "sound", startMs: 0, durationMs: 1000, sourceUrl: "http://127.0.0.1:38416/tone.wav", name: "Tone" }));
  }
  return c;
}
async function cached(page: Page, video = false) {
  return page.evaluate(async ({ owner, id, video }) => new Promise<Record<string, unknown> | null>((resolve, reject) => {
    const req = indexedDB.open(video ? "kebu-studio-video-offline" : "kebu-studio-offline");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("drafts")) { db.close(); resolve(null); return; }
      const tx = db.transaction("drafts", "readonly"), row = tx.objectStore("drafts").get(`${owner}:${id}`);
      row.onsuccess = () => { resolve(row.result ?? null); db.close(); };
      row.onerror = () => reject(row.error);
    };
  }), { owner, id, video });
}
async function setup(page: Page, options: { video?: boolean; missing?: boolean; delay?: boolean; malformed?: boolean; conflict?: boolean; twoPages?: boolean; audio?: boolean; missingAudio?: boolean; history?: boolean; sharing?: "offline" | "malformed"; viewer?: boolean; delayedRestore?: boolean; failedHistory?: boolean } = {}) {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const doc = canvas(options.missing); if (options.twoPages) doc.pages.push({ ...structuredClone(doc.pages[0]!), id: "second", name: "Second" });
  let server: { id: string; title: string; updated_at: string; business_id: null; source_design_id?: null; design_type?: string; canvas?: ReturnType<typeof canvas>; composition?: ReturnType<typeof composition> } = options.video ? { id, title: "Original video", composition: composition(options.audio), updated_at: rev(1), business_id: null, source_design_id: null } : { id, title: "QA design", design_type: "poster", canvas: doc, updated_at: rev(1), business_id: null };
  const writes: Record<string, unknown>[] = []; let release: (() => void) | undefined;
  const barrier = new Promise<void>(done => { release = done; });
  let releaseSecond!: () => void; const secondBarrier = new Promise<void>(done => { releaseSecond = done; });
  const api = options.video ? `/api/studio/video/${id}` : `/api/create/designs/${id}`;
  await page.route("**/api/**", async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (options.sharing && pathname.startsWith(`${api}/collaborators`)) {
      if (route.request().method() === "GET") { await route.fulfill({ json: { collaborators: [] } }); return; }
      if (options.sharing === "offline") { await route.abort("failed"); return; }
      await route.fulfill({ json: { collaborator: { id: "bad", email: "wrong@example.test", status: "active" } } }); return;
    }
    if (options.history && pathname.startsWith(`${api}/versions`)) {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { versions: [{ id: "11111111-1111-4111-8111-111111111111", label: "Original checkpoint", source: "manual", created_at: rev(1) }] } }); return;
      }
      const body = route.request().postDataJSON(); writes.push({ ...body, history: true });
      if (pathname.endsWith("/restore")) {
        if (options.delayedRestore) await barrier;
        if (options.failedHistory) { await route.fulfill({ status: 503, json: { error: "Could not preserve your current canvas. Restore was cancelled." } }); return; }
        if (!("canvas" in server)) throw new Error("History fixture requires a design.");
        server = { ...server, canvas: doc, updated_at: rev(20) };
        await route.fulfill({ json: { design: server } }); return;
      }
      await route.fulfill({ status: 201, json: { versionId: "receipt" } }); return;
    }
    if (pathname !== api) { await route.fulfill({ json: { projects: [], businesses: [], profile: null } }); return; }
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON(); writes.push(body);
      if (writes.length === 1 && options.delay) await barrier;
      if (writes.length === 2 && options.delay) await secondBarrier;
      if (options.conflict || body.expectedUpdatedAt !== server.updated_at) { await route.fulfill({ status: 409, json: { code: options.video ? "studio_video_version_conflict" : "studio_version_conflict" } }); return; }
      server = { ...server, ...body, updated_at: rev(writes.length + 1) };
      await route.fulfill({ json: { [options.video ? "project" : "design"]: options.malformed ? { id: "wrong", updated_at: "invalid" } : server } }); return;
    }
    await route.fulfill({ json: { [options.video ? "project" : "design"]: server, userId: owner, access: { role: options.viewer ? "viewer" : "owner", canEdit: !options.viewer, canDelete: !options.viewer, canShare: !options.viewer } } });
  });
  await page.route("**/tone.wav", route => {
    const rate = 22050, samples = rate, bytes = Buffer.alloc(44 + samples * 2);
    bytes.write("RIFF",0); bytes.writeUInt32LE(bytes.length - 8,4); bytes.write("WAVEfmt ",8); bytes.writeUInt32LE(16,16);
    bytes.writeUInt16LE(1,20); bytes.writeUInt16LE(1,22); bytes.writeUInt32LE(rate,24); bytes.writeUInt32LE(rate * 2,28); bytes.writeUInt16LE(2,32); bytes.writeUInt16LE(16,34); bytes.write("data",36); bytes.writeUInt32LE(samples * 2,40);
    for(let i=0;i<samples;i++) bytes.writeInt16LE(Math.round(Math.sin(2*Math.PI*440*i/rate)*6000),44+i*2);
    return route.fulfill(options.missingAudio ? { status:404, body:"Missing fixture audio" } : {contentType:"audio/wav",body:bytes});
  });
  await page.route("**/missing-image.png", route => route.fulfill({ status: 404, body: "Missing fixture media" }));
  // Fake session is confined to the loopback Auth fixture, never a hosted account.
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: owner, exp: expiry })).toString("base64url"), "fixture"].join(".");
  const session = { access_token: token, refresh_token: "local-fixture", expires_at: expiry, expires_in: 3600, token_type: "bearer", user: { id: owner, email: "qa@example.test", app_metadata: {}, user_metadata: {} } };
  await page.context().addCookies([{ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), url: "http://127.0.0.1:38416", sameSite: "Lax" }]);
  const response = await page.goto(options.video ? `/studio/video/${id}` : `/studio/${id}`);
  expect(response?.headers()["content-security-policy"]).toContain("media-src 'self' https: blob:");
  if (options.video) await expect(page.getByLabel("Video title")).toHaveValue("Original video");
  else if (options.viewer) await expect(page.getByRole("heading", { name: "QA design", exact: true })).toBeVisible();
  else await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  return { writes, errors, release: () => release!(), releaseSecond, server: () => server };
}
async function editText(page: Page, text: string, initial = false) {
  if (initial) await page.getByText("Original", { exact: true }).first().locator("..").dblclick();
  await page.getByRole("textbox", { name: "Text", exact: true }).fill(text);
}

test("design saves serialize and keep the newest IndexedDB draft dirty until acknowledged", async ({ page }) => {
  const fixture = await setup(page, { delay: true });
  await editText(page, "First edit", true); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await editText(page, "Newest edit"); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  expect(fixture.writes).toHaveLength(1);
  await expect.poll(async () => JSON.stringify((await cached(page))?.canvas)).toContain("Newest edit");
  expect((await cached(page))?.dirty).toBe(true); fixture.release();
  await expect.poll(() => fixture.writes.length).toBe(2);
  expect(fixture.writes.map(x => x.expectedUpdatedAt)).toEqual([rev(1), rev(2)]);
  expect((await cached(page))?.dirty).toBe(true);
  expect(JSON.stringify((await cached(page))?.canvas)).toContain("Newest edit");
  fixture.releaseSecond();
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  const local = await cached(page); expect(JSON.stringify(local?.canvas)).toContain("Newest edit");
  await page.reload(); await expect(page.getByText("Newest edit", { exact: true }).first()).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("video title saves serialize on mobile and preserve the newest local title", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const fixture = await setup(page, { video: true, delay: true });
  await page.getByLabel("Video title").fill("First title"); await page.getByLabel("Video title").blur();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await page.getByLabel("Video title").fill("Newest title"); await page.getByLabel("Video title").blur();
  expect(fixture.writes).toHaveLength(1);
  await expect.poll(async () => (await cached(page, true))?.title).toBe("Newest title");
  expect((await cached(page, true))?.dirty).toBe(true); fixture.release();
  await expect.poll(() => fixture.writes.length).toBe(2);
  expect(fixture.writes.map(x => x.expectedUpdatedAt)).toEqual([rev(1), rev(2)]);
  expect((await cached(page, true))?.dirty).toBe(true);
  expect((await cached(page, true))?.title).toBe("Newest title");
  fixture.releaseSecond();
  await expect.poll(async () => (await cached(page, true))?.dirty).toBe(false);
  expect((await cached(page, true))?.title).toBe("Newest title");
  expect(fixture.errors).toEqual([]);
});

test("a malformed receipt leaves the current draft dirty and stops further network writes", async ({ page }) => {
  const fixture = await setup(page, { malformed: true }); await editText(page, "Do not lose this", true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Save failed", { exact: true })).toBeVisible();
  expect((await cached(page))?.dirty).toBe(true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  expect(fixture.writes).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("button", { name: "Keep my version", exact: true })).toBeEnabled();
  expect(fixture.writes).toHaveLength(1); expect(fixture.errors).toEqual([]);
});

test("a conflict retains local edits and does not silently overwrite the server", async ({ page }) => {
  const fixture = await setup(page, { conflict: true }); await editText(page, "Local conflict", true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Use server version", exact: true })).toBeEnabled();
  expect((await cached(page))?.dirty).toBe(true); expect(fixture.writes).toHaveLength(1);
  await page.getByRole("button", { name: "Use server version", exact: true }).click();
  await expect(page.getByText("Original", { exact: true }).first()).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

test("PNG, PDF and ZIP are real rendered downloads including supplied imagery", async ({ page }) => {
  const fixture = await setup(page, { twoPages: true }); await page.getByText("More", { exact: true }).click();
  const pngDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  const png = readFileSync((await (await pngDownload).path())!); expect([...png.subarray(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
  const pixel = await page.evaluate(async data => { const image = new Image(); image.src = "data:image/png;base64," + data; await image.decode(); const c = document.createElement("canvas"); c.width = image.width; c.height = image.height; const ctx = c.getContext("2d")!; ctx.drawImage(image, 0, 0); return { width: image.width, height: image.height, pixel: [...ctx.getImageData(70,170,1,1).data] }; }, png.toString("base64"));
  expect(pixel).toEqual({ width: 640, height: 640, pixel: [0,255,0,255] });
  const pdfDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const pdf = await PDFDocument.load(readFileSync((await (await pdfDownload).path())!)); expect(pdf.getPageCount()).toBe(2);
  const zipDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Download pages ZIP", exact: true }).click();
  const zip = await JSZip.loadAsync(readFileSync((await (await zipDownload).path())!)); expect(Object.keys(zip.files).filter(x => x.endsWith(".png"))).toHaveLength(2);
  expect(fixture.errors).toEqual([]);
});

test("missing media blocks PNG export instead of downloading a placeholder", async ({ page }) => {
  const fixture = await setup(page, { missing: true }); const downloads: string[] = []; page.on("download", x => downloads.push(x.suggestedFilename()));
  await page.getByText("More", { exact: true }).click(); await page.getByRole("button", { name: "Download PNG", exact: true }).click();
  await expect(page.getByText("Could not render PNG.", { exact: true })).toBeVisible(); expect(downloads).toEqual([]); expect(fixture.errors).toEqual([]);
});

test("video export produces decodable WebM frames", async ({ page }) => {
  const fixture = await setup(page, { video: true }); const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!); expect([...bytes.subarray(0,4)]).toEqual([26,69,223,163]);
  const info = await page.evaluate(async data => { const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)); const url = URL.createObjectURL(new Blob([bytes], { type: "video/webm" })); const video = document.createElement("video"); video.src = url; await new Promise<void>((done, fail) => { video.onloadeddata = () => done(); video.onerror = () => fail(Error("Cannot decode export")); }); const info = { width: video.videoWidth, height: video.videoHeight }; URL.revokeObjectURL(url); return info; }, bytes.toString("base64"));
  expect(info).toEqual({ width: 320, height: 320 }); expect(fixture.errors).toEqual([]);
});

test("offline design edits cache locally and sync through the current revision on reconnect", async ({ page }) => {
  const fixture = await setup(page); await editText(page, "Offline latest", true);
  await page.context().setOffline(true); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Offline · changes not synced", { exact: true })).toBeVisible();
  await expect.poll(async () => (await cached(page))?.dirty).toBe(true); expect(fixture.writes).toEqual([]);
  await page.context().setOffline(false); await expect.poll(() => fixture.writes.length).toBe(1);
  await expect.poll(async () => (await cached(page))?.dirty).toBe(false);
  expect(fixture.writes[0]?.expectedUpdatedAt).toBe(rev(1)); expect(fixture.errors).toEqual([]);
});

test("storage failure while offline leaves the editor visible and does not claim a local save", async ({ page }) => {
  const fixture = await setup(page); await editText(page, "Keep this tab open", true);
  await page.evaluate(() => { indexedDB.open = () => { throw new DOMException("Local test quota", "QuotaExceededError"); }; });
  await page.context().setOffline(true); await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Save failed", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue("Keep this tab open");
  await expect(page.getByRole("alert").filter({ hasText: "Could not save this draft on your device" })).toBeVisible();
  expect(fixture.writes).toEqual([]); expect(fixture.errors).toEqual([]);
});

test("video export includes decodable audible samples", async ({ page }) => {
  const fixture = await setup(page, { video: true, audio: true }); const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!);
  const rms = await page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)), context = new AudioContext();
    try { const decoded = await context.decodeAudioData(bytes.buffer); const samples = decoded.getChannelData(0); let sum = 0; for (const sample of samples) sum += sample * sample; return Math.sqrt(sum / samples.length); }
    finally { await context.close(); }
  }, bytes.toString("base64"));
  expect(rms).toBeGreaterThan(0.001); expect(fixture.errors).toEqual([]);
});

test("unavailable audio blocks video export instead of producing a silent success", async ({ page }) => {
  const fixture = await setup(page, { video: true, audio: true, missingAudio: true }); const downloads: string[] = []; page.on("download", x => downloads.push(x.suggestedFilename()));
  await page.getByRole("button", { name: "Export video", exact: true }).click();
  await expect(page.getByText("One or more audio files could not be loaded for export.", { exact: true })).toBeVisible();
  expect(downloads).toEqual([]); expect(fixture.errors).toEqual([]);
});

test("the design page timeline exports a decodable WebM", async ({ page }) => {
  const fixture = await setup(page); await page.getByText("More", { exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: "Export timeline", exact: true }).click();
  const bytes = readFileSync((await (await download).path())!);
  expect([...bytes.subarray(0,4)]).toEqual([26,69,223,163]);
  const size = await page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)), url = URL.createObjectURL(new Blob([bytes], { type: "video/webm" }));
    try { const video = document.createElement("video"); video.src = url; await new Promise<void>((done, fail) => { video.onloadeddata = () => done(); video.onerror = () => fail(Error("Cannot decode timeline")); }); return [video.videoWidth, video.videoHeight]; }
    finally { URL.revokeObjectURL(url); }
  }, bytes.toString("base64"));
  expect(size).toEqual([320,320]); expect(fixture.errors).toEqual([]);
});

async function openHistory(page: Page) {
  await page.getByText("More", { exact: true }).click();
  await page.getByRole("button", { name: "Versions", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Version history" })).toBeVisible();
  await page.getByText("More", { exact: true }).click();
}
test("named history saves the latest draft before capturing a version", async ({ page }) => {
  const fixture = await setup(page, { history: true });
  await editText(page, "Named latest", true); await openHistory(page);
  await page.getByPlaceholder("Name this version").fill("My checkpoint");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => fixture.writes.some(x => x.history)).toBe(true);
  const named = fixture.writes.findIndex(x => x.history);
  expect(named).toBeGreaterThan(0); expect(JSON.stringify(fixture.writes[named - 1]?.canvas)).toContain("Named latest");
  expect(fixture.writes[named]?.expectedUpdatedAt).toBe(fixture.server().updated_at);
  expect(fixture.errors).toEqual([]);
});
test("history restore preserves edits made during a delayed response", async ({ page }) => {
  const fixture = await setup(page, { history: true, delayedRestore: true });
  await editText(page, "Before restore", true); await openHistory(page);
  page.on("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect.poll(() => fixture.writes.some(x => x.versionId)).toBe(true);
  await editText(page, "Newer local edit"); fixture.release();
  await expect(page.getByRole("button", { name: "Keep my version" })).toBeVisible();
  await expect(page.getByText("Newer local edit", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Keep my version" }).click();
  await expect.poll(() => JSON.stringify(fixture.server())).toContain("Newer local edit");
  expect(fixture.writes.at(-1)?.expectedUpdatedAt).toBe(rev(20)); expect(fixture.errors).toEqual([]);
});
test("failed restore leaves the editor and saved draft intact", async ({ page }) => {
  const fixture = await setup(page, { history: true, failedHistory: true });
  await editText(page, "Keep this draft", true); await openHistory(page);
  page.on("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Restore was cancelled" })).toContainText("Restore was cancelled");
  await expect(page.getByText("Keep this draft", { exact: true }).first()).toBeVisible();
  expect(fixture.errors).toEqual([]);
});

for (const failure of ["offline", "malformed"] as const) {
  test(`sharing ${failure} failure is visible and does not claim an invitation`, async ({ page }) => {
    const fixture = await setup(page, { sharing: failure });
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("colleague@example.test");
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: failure === "offline" ? "Could not invite" : "Could not confirm" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload share list" })).toBeVisible();
    await expect(page.getByText(/^Invited /)).toHaveCount(0); expect(fixture.errors).toEqual([]);
  });
}
test("viewers cannot save or invite collaborators in the editor", async ({ page }) => {
  const fixture = await setup(page, { viewer: true });
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: /^View only$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Invite", exact: true })).toHaveCount(0);
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});
