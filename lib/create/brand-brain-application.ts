import { buildIndex, canonicalStringify, isSpatialLocked, nativeMotionSchema, nativeInteractionSchema, TX_LIMITS, type KcdDocument, type NodeId, type Op } from "@/lib/creative-core";
import { brandBrainRecordSchema, type BrandBrainRecord } from "./brand-brain";

/** Explicit native subtree application; never rewrites site identity or opaque profile notes. */
export function brandBrainApplication(document: KcdDocument, selectedId: NodeId, input: BrandBrainRecord, options: { palette: boolean; motion: boolean }): { ops: Op[]; count: number } {
  const record = brandBrainRecordSchema.parse(input);
  if (!options.palette && !options.motion) throw new Error("Choose colors or motion to apply.");
  if (!document.nodes[selectedId]) throw new Error("Select an existing native element.");
  const targets = buildIndex(document).subtree(selectedId);
  const ops: Op[] = [];
  const changed = new Set<NodeId>();
  const { brand, motion } = record.profile;
  for (const node of targets) {
    if (!["section", "group", "text", "image", "video"].includes(node.type) || node.typeVersion !== 1) throw new Error("Convert legacy content to native elements before applying Brand Brain.");
    if (isSpatialLocked(document, node.id)) throw new Error("Unlock this element and its containers before applying Brand Brain.");
    function put(op: Op, previous: unknown, value: unknown) {
      if (canonicalStringify(previous ?? null) !== canonicalStringify(value ?? null)) { ops.push(op); changed.add(node.id); }
    }
    if (options.palette) {
      const key = node.type === "section" || node.type === "group" ? "background" : node.type === "text" ? "color" : null;
      if (key) {
        const value = key === "background" ? brand.backgroundColor : ["heading", "subheading"].includes(String(node.props.variant)) ? brand.primaryColor : node.props.variant === "eyebrow" ? brand.accentColor : brand.textColor;
        put({ op: "setProp", id: node.id, path: key, value }, node.props[key], value);
      }
    }
    if (options.motion) {
      if (node.motion !== undefined && !nativeMotionSchema.safeParse(node.motion).success || node.interaction !== undefined && !nativeInteractionSchema.safeParse(node.interaction).success) throw new Error("This selection contains unsupported motion. Review its saved settings before applying Brand Brain.");
      if (motion.enabled && motion.interaction === "lift" && motion.maxDistance < 4) throw new Error("Lift moves 4px. Increase the profile distance limit to 4px or choose another interaction.");
      const previous = node.motion as { devices?: unknown } | undefined;
      const value = motion.enabled ? { version: 1, preset: motion.entrance, trigger: "enter", duration: Math.min(500, motion.maxDuration), delay: 0, distance: Math.min(24, motion.maxDistance), easing: "ease-out", enabled: true, ...(previous?.devices ? { devices: previous.devices } : {}) } : null;
      put({ op: "setMotion", id: node.id, value }, node.motion, value);
      const interaction = motion.enabled && motion.interaction !== "none" ? { version: 1, effect: motion.interaction, duration: Math.min(180, motion.maxDuration), easing: "ease-out" } : null;
      put({ op: "setInteraction", id: node.id, value: interaction }, node.interaction, interaction);
    }
  }
  if (ops.length > TX_LIMITS.maxOps) throw new Error("This selection is too large for one safe edit. Select a smaller container.");
  return { ops, count: changed.size };
}
