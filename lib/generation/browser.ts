import "server-only";
import { existsSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Browser } from "playwright";
import { generationHash } from "./hash";
import { previewToken } from "./preview-token";
import { mediaReferences, candidateFingerprint, type Candidate } from "./targets";
import type { GenerationRun, QualityReport, GenerationIssue } from "./contracts";
import type { ReviewImage } from "./provider";

export function browserConfiguration() {
  const origin = process.env.CREATIVE_GENERATION_APP_URL, executable = process.env.CREATIVE_CHROMIUM_EXECUTABLE_PATH ?? process.env.KEBU_CHROMIUM_EXECUTABLE_PATH;
  if (!origin || !executable || !existsSync(executable) || !process.env.CREATIVE_PREVIEW_SECRET || process.env.CREATIVE_PREVIEW_SECRET.length < 32) return null;
  try { const url = new URL(origin); if (url.username || url.password || url.pathname !== "/" || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) return null; return { origin: url.origin, executable }; } catch { return null; }
}
export async function inspectCandidate(admin: SupabaseClient, run: GenerationRun): Promise<{ report: QualityReport; images: ReviewImage[] }> {
  const config = browserConfiguration(); if (!config) throw new Error("Browser inspection is not configured. Your candidate is kept.");
  const candidate = run.data.candidate as Candidate;
  let report: QualityReport = { candidateHash: candidateFingerprint(candidate), checker: "kebu-browser-v1", checkedAt: new Date().toISOString(), status: "incomplete", issues: [], checks: [], viewports: [360, 390, 768, 1280], screenshots: [], visualReview: "not_run" };
  if (run.data.report?.candidateHash === report.candidateHash && run.data.report.checker === report.checker) report = structuredClone(run.data.report);
  const pendingPages = candidate.document.pages.filter(item => !report.viewports.every(width => report.screenshots.some(s => s.pageId === item.id && s.viewport === width))).slice(0, 2);
  const allowedHosts = new Set((process.env.CREATIVE_GENERATION_MEDIA_HOSTS ?? "").split(",").map(host => host.trim()).filter(Boolean));
  // Only explicitly trusted public media hosts. Saved URLs are untrusted input too.
  const allowedMedia = new Set(mediaReferences(candidate.document).filter(value => {
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && (allowedHosts.has(url.hostname) || /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)); } catch { return false; }
  })), token = previewToken(run), images: ReviewImage[] = [];
  const { chromium } = await import("playwright");
  let browser: Browser | undefined;
  const deadline = Date.now() + 65_000;
  const timer = setTimeout(() => { void browser?.close(); }, 65_000);
  try {
    browser = await chromium.launch({ executablePath: config.executable, args: ["--no-sandbox", "--disable-dev-shm-usage"], headless: true });
    const context = await browser.newContext({ serviceWorkers: "block", reducedMotion: "no-preference" });
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      const own = url.origin === config.origin;
      const preview = own && url.pathname === `/api/generation/preview/${run.id}`;
      const runtime = own && (url.pathname === `/generation/preview/${run.id}` || url.pathname.startsWith("/_next/"));
      if (request.method() !== "GET" || (!preview && !runtime && !allowedMedia.has(url.href))) return route.abort("blockedbyclient");
      return route.continue({ headers: preview ? { ...request.headers(), "x-generation-preview": token } : request.headers() });
    });
    const page = await context.newPage();
    const errors = new Set<string>();
    page.on("pageerror", () => errors.add("A preview script failed."));
    page.on("response", response => { if (response.status() >= 400 && response.url().startsWith(config.origin + "/_next/")) errors.add("A required preview asset failed to load."); });
    for (const item of pendingPages) {
      for (const width of report.viewports) {
        if (Date.now() >= deadline) throw new Error("The inspection time budget was reached. Your candidate is kept.");
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${config.origin}/generation/preview/${run.id}?page=${encodeURIComponent(item.id)}`, { waitUntil: "domcontentloaded", timeout: Math.max(1000, Math.min(15000, deadline - Date.now())) });
        await page.waitForFunction(() => window.__kebuGenerationCheck !== undefined, undefined, { timeout: 15000 });
        const result = await page.evaluate(() => window.__kebuGenerationCheck!);
        if (!result.rendered || result.pageId !== item.id) throw new Error("A candidate page could not be rendered.");
        
        await page.evaluate(async () => {
          for (let y = 0; y < Math.min(document.documentElement.scrollHeight, 16000); y += 600) { window.scrollTo(0, y); await new Promise(resolve => requestAnimationFrame(resolve)); }
          window.scrollTo(0, 0);
        });
        await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("[data-generation-preview] img")].every(image => image.complete), undefined, { timeout: 10000 });
        const afterScroll = await page.evaluate(() => window.__kebuGenerationInspect?.() ?? window.__kebuGenerationCheck!);
        report.issues.push(...afterScroll.issues.map(issue => ({ ...issue, viewport: width })));
        await page.locator("[data-generation-preview] video").evaluateAll(elements => elements.forEach(element => { const video = element as HTMLVideoElement; video.preload = "metadata"; video.load(); }));
        await page.waitForFunction(() => [...document.querySelectorAll<HTMLVideoElement>("[data-generation-preview] video")].every(video => video.readyState >= 1 || Boolean(video.error)), undefined, { timeout: 10000 });
        const failedVideos = await page.locator("[data-generation-preview] video").evaluateAll(elements => elements.some(element => Boolean((element as HTMLVideoElement).error)));
        if (failedVideos) report.issues.push({ code: "missing_video", message: "A required video could not be loaded.", pageId: item.id, viewport: width, severity: "error", repairable: false });
        const failedImages = await page.locator("[data-generation-preview] img").evaluateAll(elements => elements.filter(element => !(element as HTMLImageElement).complete || !(element as HTMLImageElement).naturalWidth).length);
        if (failedImages) report.issues.push({ code: "missing_media", message: "A required image could not be displayed.", pageId: item.id, viewport: width, severity: "error", repairable: false });
        const badLinks = await page.locator("[data-generation-preview] a[href]").evaluateAll(elements => elements.map(element => element.getAttribute("href") ?? "").filter(href => href.startsWith("#") && href.length > 1 && !document.getElementById(href.slice(1))));
        if (badLinks.length) report.issues.push({ code: "broken_anchor", message: "A navigation link points to a missing page anchor.", pageId: item.id, viewport: width, severity: "error", repairable: false });
        const internalLinks = await page.locator('[data-generation-preview] a[href^="/"]').evaluateAll(elements => elements.map(element => element.getAttribute("href")!));
        if (run.target_kind === "builder") {
          const pages = candidate.document.pages as { id: string; slug: string }[];
          for (const href of new Set(internalLinks)) {
            const destination = pages.find(p => (p.slug === "home" ? "/" : `/${p.slug}`) === href);
            if (!destination) report.issues.push({ code: "missing_page", message: "A navigation link points to a missing candidate page.", pageId: item.id, viewport: width, severity: "error", repairable: false });
          }
        }
        await page.keyboard.press("Tab");
        const interactiveCount = await page.locator('[data-generation-preview] a[href], [data-generation-preview] button, [data-generation-preview] [tabindex="0"]').count();
        if (interactiveCount && !(await page.evaluate(() => Boolean(document.activeElement?.closest("[data-generation-preview]"))))) report.issues.push({ code: "keyboard_navigation", message: "Keyboard navigation did not reach the candidate's controls.", pageId: item.id, viewport: width, severity: "error", repairable: false });
        const performanceIssue = await page.evaluate(() => ({ nodes: document.querySelectorAll("[data-generation-preview] *").length, bytes: performance.getEntriesByType("resource").reduce((sum, item) => sum + ((item as PerformanceResourceTiming).transferSize || 0), 0), height: document.documentElement.scrollHeight }));
        if (performanceIssue.nodes > 3000 || performanceIssue.bytes > 8_000_000 || performanceIssue.height > 16000) report.issues.push({ code: "render_budget", message: "This page exceeds the inspection size or resource budget. Simplify it before acceptance.", pageId: item.id, severity: "error", repairable: false });
        const screenshot = await page.screenshot({ type: "jpeg", quality: 65, fullPage: true, animations: "disabled" });
        const path = `${run.actor_id}/${run.id}/${report.candidateHash}/${generationHash(item.id).slice(0,24)}-${width}.jpg`;
        const stored = await admin.storage.from("creative-generation-evidence").upload(path, screenshot, { contentType: "image/jpeg", upsert: false });
        if (stored.error && !String(stored.error.message).toLowerCase().includes("already exists")) throw new Error("Could not save private inspection evidence.");
        report.screenshots.push({ pageId: item.id, viewport: width, path });
        if (images.length < 4 && (width === 390 || width === 1280)) images.push({ data: screenshot.toString("base64"), mediaType: "image/jpeg" });
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => window.__kebuGenerationCheck?.rendered === true, undefined, { timeout: 15000 });
        const runningMotion = await page.evaluate(() => document.getAnimations().some(animation => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return animation.playState === "running" && target instanceof Element && Boolean(target.closest("[data-generation-preview]"));
        }));
        if (runningMotion) report.issues.push({ code: "reduced_motion", message: "Animation continues while reduced motion is enabled.", pageId: item.id, viewport: width, severity: "error", repairable: false });
        if (run.target_kind === "builder") {
          const link = internalLinks[0] ?? null;
          const destination = (candidate.document.pages as { id: string; slug: string }[]).find(p => (p.slug === "home" ? "/" : `/${p.slug}`) === link);
          if (destination && destination.id !== item.id) {
            await page.locator('[data-generation-preview] a[href^="/"]').first().click();
            await page.waitForFunction(id => window.__kebuGenerationCheck?.pageId === id && window.__kebuGenerationCheck?.rendered, destination.id, { timeout: 10000 });
          }
        }
        await page.emulateMedia({ reducedMotion: "no-preference" });
      }
    }
    if (errors.size) report.issues.push(...[...errors].map(message => ({ code: "preview_runtime", message, severity: "error" as const, repairable: false })));
    report.checks = ["native_document", "render_budget", "all_pages", "responsive_viewports", "rendered_assets", "runtime_errors", "text_and_bounds", "navigation_anchors", "internal_navigation", "keyboard_traversal", "scroll_triggers", "reduced_motion_render"];
    report.status = report.screenshots.length < candidate.document.pages.length * report.viewports.length ? "incomplete" : report.issues.length ? "fail" : "pass";
    return { report, images };
  } finally { clearTimeout(timer); await browser?.close(); }
}
export function combineVisualIssues(report: QualityReport, issues: GenerationIssue[]): QualityReport {
  return { ...report, issues: [...report.issues, ...issues], checks: [...report.checks, "visual_review"], visualReview: issues.length || report.visualReview === "failed" ? "failed" : "passed", status: report.status === "incomplete" ? "incomplete" : report.issues.length || issues.length ? "fail" : "pass" };
}
