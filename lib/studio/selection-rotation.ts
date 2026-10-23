import { expandSelectionWithGroups, studioLayerBounds, type CanvasLayer } from "@/lib/studio/canvas-document";

/** The visible center centroid is invariant under rotation, unlike a recomputed AABB center. */
export function selectionRotationGeometry(layers: CanvasLayer[], selectedIds: string[]) {
  const ids = new Set(expandSelectionWithGroups(layers, selectedIds));
  const members = layers.filter(l => ids.has(l.id) && !l.locked);
  if (members.length < 2) return null;
  const visible = members.filter(l => l.opacity > 0);
  const anchors = visible.length ? visible : members;
  const frames = anchors.map(studioLayerBounds);
  const left = Math.min(...frames.map(b => b.left)), top = Math.min(...frames.map(b => b.top));
  const right = Math.max(...frames.map(b => b.right)), bottom = Math.max(...frames.map(b => b.bottom));
  return {
    layerIds: members.map(l => l.id),
    pivot: {
      x: anchors.reduce((sum,l) => sum + l.x + l.width / 2, 0) / anchors.length,
      y: anchors.reduce((sum,l) => sum + l.y + l.height / 2, 0) / anchors.length,
    },
    bounds: { left, top, right, bottom, width: right-left, height: bottom-top },
  };
}

/** One rigid rotation for the whole selection; validate before returning any mutation. */
export function rotateSelectionLayers(layers: CanvasLayer[], selectedIds: string[], degrees: number): CanvasLayer[] {
  if (!Number.isFinite(degrees)) throw new Error("Enter a finite rotation angle.");
  const turn = degrees % 360;
  if (Math.abs(turn) < 1e-9) return layers;
  const geometry = selectionRotationGeometry(layers, selectedIds);
  if (!geometry) return layers;
  const ids = new Set(geometry.layerIds), {x:cx,y:cy} = geometry.pivot;
  const radians = turn * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
  const coordinate = (value: number) => {
    // Ignore floating-point dust at an existing strict schema boundary only.
    if (value < -2000 - 1e-7 || value > 4000 + 1e-7) {
      throw new Error("Rotation would move artwork outside the supported canvas range. Move the selection inward and try again.");
    }
    return Math.max(-2000,Math.min(4000,value));
  };
  return layers.map(layer => {
    if (!ids.has(layer.id)) return layer;
    const dx = layer.x + layer.width / 2 - cx, dy = layer.y + layer.height / 2 - cy;
    return {
      ...layer,
      x: coordinate(cx + dx*cos - dy*sin - layer.width/2),
      y: coordinate(cy + dx*sin + dy*cos - layer.height/2),
      rotation: ((layer.rotation + turn + 180) % 360 + 360) % 360 - 180,
    };
  });
}
