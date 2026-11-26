import type { SpatialBox } from "@/lib/creative-core";

export function measureSpatialElement(target: HTMLElement, parent: HTMLElement): { box: SpatialBox; container: { width: number; height: number } } {
  const style = target.ownerDocument.defaultView!.getComputedStyle(target);
  return { box: { x: target.offsetLeft, y: target.offsetTop, elementWidth: Math.max(16, Number.parseFloat(style.width) || target.offsetWidth), elementHeight: Math.max(16, Number.parseFloat(style.height) || target.offsetHeight) }, container: { width: parent.clientWidth, height: parent.clientHeight } };
}

/** Measure the full ancestor transform, including scaled device previews. */
export function spatialPointerBasis(parent: HTMLElement) {
  const probes = [[0, 0], [100, 0], [0, 100]].map(([x, y]) => {
    const probe = parent.ownerDocument.createElement("span");
    Object.assign(probe.style, { position: "absolute", left: `${x}px`, top: `${y}px`, width: "0", height: "0", pointerEvents: "none", visibility: "hidden" });
    parent.appendChild(probe); return probe;
  });
  try {
    const [origin, horizontal, vertical] = probes.map(probe => probe.getBoundingClientRect());
    const a = (horizontal.left - origin.left) / 100, b = (horizontal.top - origin.top) / 100;
    const c = (vertical.left - origin.left) / 100, d = (vertical.top - origin.top) / 100;
    const determinant = a * d - b * c;
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 0.000001) throw new Error("The container cannot be measured. Try again after it becomes visible.");
    return { scaleX: Math.hypot(a, b), scaleY: Math.hypot(c, d), delta: (x: number, y: number) => ({ x: (d * x - c * y) / determinant, y: (-b * x + a * y) / determinant }) };
  } finally { for (const probe of probes) probe.remove(); }
}

export function selectedSpatialMeasurement(id: string, device: string) {
  const preview = device === "desktop" ? window.document : window.document.querySelector<HTMLIFrameElement>(`iframe[title="${device} preview"]`)?.contentDocument;
  const target = preview?.querySelector<HTMLElement>(`[data-kcd-node-id="${id}"]`);
  const parent = target?.parentElement?.closest<HTMLElement>("[data-kcd-canvas-for]");
  if (!target || !parent || !target.getClientRects().length) throw new Error("Select a visible element in the canvas before changing its constraint.");
  return measureSpatialElement(target, parent);
}
