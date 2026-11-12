import { canvasDocumentSchema, studioLayerBounds } from "@/lib/studio/canvas-document";
import { wrapCreativeText } from "@/lib/creative-core/text-layout";
import type { GenerationIssue } from "./contracts";
export function inspectStudioPage(input: unknown, pageId: string): GenerationIssue[] {
  const doc = canvasDocumentSchema.parse(input), page = doc.pages.find(item => item.id === pageId);
  if (!page) throw new Error("The requested page is missing.");
  const context = document.createElement("canvas").getContext("2d");
  if (!context) throw new Error("Canvas measurement is unavailable.");
  const issues: GenerationIssue[] = [];
  for (const layer of page.layers) {
    if (layer.opacity <= 0) continue;
    if ((layer.type === "image" && !layer.imageUrl) || (layer.type === "video" && !layer.videoUrl)) issues.push({ code: "missing_media", message: "A media object has no saved asset.", pageId, objectId: layer.id, severity: "error", repairable: false });
    const bounds = studioLayerBounds(layer);
    if (bounds.left < -1 || bounds.top < -1 || bounds.right > page.width + 1 || bounds.bottom > page.height + 1) issues.push({ code: "artboard_overflow", message: "An object extends beyond the artboard. Review intentional bleed before changing it.", pageId, objectId: layer.id, severity: "error", repairable: !layer.locked });
    if (layer.type === "text" && layer.text) {
      const size = layer.fontSize ?? 24, spacing = layer.letterSpacing ?? 0, lineHeight = size * (layer.lineHeight ?? 1.2);
      context.font = `${layer.fontStyle ?? "normal"} ${layer.fontWeight ?? "400"} ${size}px ${layer.fontFamily ?? "system-ui"}`;
      const lines = wrapCreativeText(layer.text, layer.width, text => context.measureText(text).width + Math.max(0, [...text].length - 1) * spacing);
      const required = size + Math.max(0, lines.length - 1) * lineHeight;
      // Must match the real renderer's own break condition exactly
      // (paintTextLayer: `if (y > layer.y + layer.height + lineHeight) break`),
      // which never clips to the box and tolerates up to one full extra
      // lineHeight of overflow — a smaller threshold here flags text as
      // clipped that the real editor renders completely and correctly.
      if (required > layer.height + lineHeight + 1) issues.push({ code: "text_clipping", message: "The text needs a taller text box or a smaller type size.", pageId, objectId: layer.id, severity: "error", repairable: !layer.locked });
    }
  }
  return issues;
}
export function inspectBuilderDom(pageId: string): GenerationIssue[] {
  const issues: GenerationIssue[] = [], width = window.innerWidth;
  for (const element of document.querySelectorAll<HTMLElement>("[data-kcd-node-id]")) {
    const box = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (!box.width || !box.height || style.visibility === "hidden" || style.display === "none") continue;
    if (element.dataset.kcdNodeType === "text" && Number.parseFloat(style.fontSize) < 12 && element.innerText.trim()) issues.push({ code: "small_text", message: "Text is too small to read comfortably at this viewport.", pageId, objectId: element.dataset.kcdNodeId, viewport: width, severity: "error", repairable: true });
    const scrollContainer = element.parentElement?.closest('[data-kcd-canvas-for]');
    const intentionalScroll = scrollContainer && ["auto", "scroll"].includes(getComputedStyle(scrollContainer).overflowX);
    if (!intentionalScroll && (box.left < -2 || box.right > width + 2)) issues.push({ code: "viewport_overflow", message: "This object extends beyond the visible page.", pageId, objectId: element.dataset.kcdNodeId, viewport: width, severity: "error", repairable: true });
    if (["hidden", "clip"].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 2 && element.innerText.trim()) issues.push({ code: "text_clipping", message: "Text is clipped by its container.", pageId, objectId: element.dataset.kcdNodeId, viewport: width, severity: "error", repairable: true });
  }
  for (const placeholder of document.querySelectorAll<HTMLElement>('[data-generation-preview] [role="img"][aria-label="No image selected"]')) issues.push({ code: "missing_media", message: "An image object has no saved asset.", pageId, objectId: placeholder.dataset.kcdNodeId, severity: "error", repairable: false });
  for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = link.getAttribute("href") ?? "";
    if (!link.textContent?.trim() && !link.getAttribute("aria-label") && !link.querySelector("img[alt]")) issues.push({ code: "unnamed_link", message: "A link needs a readable name.", pageId, severity: "error", repairable: false });
    if (/^(javascript|data):/i.test(href)) issues.push({ code: "unsafe_link", message: "A link uses an unsupported address.", pageId, severity: "error", repairable: false });
  }
  return issues;
}
