import { emptyDocument, uuidFor } from "../helpers";
import { maylecorAboutMayBlocks } from "@/lib/create/maylecor-about-bio";
import { newBrandBrain } from "@/lib/create/brand-brain";
import { experiencePlanTransaction, sitePlanSchema, type SitePlan } from "@/lib/create/experience-engine";
import { prepareBuilderTransaction } from "@/lib/create/kcd-write-boundary";

// Manual reconstruction: these tests establish preservation, never provider quality.
export const images = ["may-figure.png", "city-skyline.png", "portrait.jpg", "logo-stacked.png"].map(name => `/templates/maylecor/${name}`);
export const profile = () => {
  const value = { id: uuidFor(73), revision: 1, profile: newBrandBrain() };
  Object.assign(value.profile.brand, { name: "May Lècor", logoUrl: images[3], primaryColor: "#D95372", accentColor: "#E5B450", backgroundColor: "#FFF9F6", textColor: "#2E2030" });
  value.profile.brand.approvedImagery = images.map(url => ({ url }));
  return value;
};
export const document = () => { const value = emptyDocument(); value.title = "May Lècor"; value.tokens.primary = "#D95372"; value.meta.documentSchemaVersion = "kcd-1"; value.meta.siteChrome = { enabled: false }; return value; };
const slugs = ["home", "about", "music", "photos", "contact"];
const labels = ["May Lècor figure", "New York skyline", "May Lècor portrait", "May Lècor logo"];
function nativePage(slug: string): SitePlan["pages"][number] {
  const nodes: SitePlan["pages"][number]["nodes"] = [];
  const add = (node: typeof nodes[number]) => { nodes.push(node); return nodes.length - 1; };
  const header = add({ type: "section", parent: null, rationale: "Single editable owner navigation", props: { width: "wide", paddingY: "sm", background: "#FFF9F6" } });
  const nav = add({ type: "group", parent: header, rationale: "Compact responsive native navigation", props: { direction: "row", gap: "md", align: "center", wrap: true }, overrides: { mobile: { gap: "sm" } }, a11y: { label: "May Lècor navigation" } });
  add({ type: "image", parent: nav, rationale: "Independent approved owner logo", props: { src: images[3], elementWidth: 92, elementHeight: 74, fit: "contain", href: "/home" }, overrides: { mobile: { elementWidth: 64, elementHeight: 52 } }, a11y: { alt: labels[3] } });
  for (const target of slugs) add({ type: "text", parent: nav, rationale: "Verified page destination", props: { text: target, href: `/${target}`, fontSize: 15, color: target === slug ? "#D95372" : "#2E2030" }, overrides: { mobile: { fontSize: 13 } } });
  const body = add({ type: "section", parent: null, rationale: "Readable original editorial composition", props: { width: slug === "about" ? "narrow" : "wide", paddingY: "md", gap: "md", background: "#FFF9F6" } });
  add({ type: "text", parent: body, rationale: "Accessible page hierarchy at each device", props: { text: slug === "home" ? "May Lècor" : slug, variant: "heading", fontSize: 64, lineHeight: 1.1, color: "#2E2030" }, overrides: { tablet: { fontSize: 44 }, mobile: { fontSize: 32 } }, a11y: { headingLevel: 1 } });
  if (slug === "home") {
    add({ type: "text", parent: body, rationale: "Supplied cultural identity, not generic stock copy", props: { text: "A New York African love story.", variant: "subheading", fontSize: 22, color: "#D95372" }, overrides: { mobile: { fontSize: 18 } } });
    const collage = add({ type: "group", parent: body, rationale: "Independent native collage layers, never a flattened hero", props: { canvasHeight: 660, background: "#FFF9F6" }, overrides: { tablet: { canvasHeight: 540 }, mobile: { canvasHeight: 440 } }, a11y: { label: "May Lècor native collage" } });
    add({ type: "image", parent: collage, rationale: "Approved skyline anchors the cultural setting", props: { src: images[1], position: "absolute", x: 0, y: 260, elementWidth: 950, elementHeight: 400, constraintX: { mode: "proportional", reference: 1200 }, layer: 1, fit: "contain" }, overrides: { tablet: { x: 0, y: 190, elementWidth: 600, elementHeight: 330, constraintX: { mode: "proportional", reference: 704 } }, mobile: { x: 0, y: 235, elementWidth: 340, elementHeight: 190, constraintX: { mode: "proportional", reference: 358 } } }, a11y: { alt: labels[1] } });
    add({ type: "image", parent: collage, rationale: "Original portrait remains independently replaceable", props: { src: images[2], position: "absolute", x: 70, y: 40, elementWidth: 280, elementHeight: 350, constraintX: { mode: "proportional", reference: 1200 }, layer: 2, rotation: -6, fit: "cover", radius: "md" }, overrides: { tablet: { x: 45, y: 30, elementWidth: 190, elementHeight: 235, constraintX: { mode: "proportional", reference: 704 } }, mobile: { x: 8, y: 55, elementWidth: 140, elementHeight: 175, constraintX: { mode: "proportional", reference: 358 } } }, a11y: { alt: labels[2] } });
    add({ type: "image", parent: collage, rationale: "Separate draggable owner figure with device-specific geometry", props: { src: images[0], position: "absolute", x: 650, y: 15, elementWidth: 330, elementHeight: 600, constraintX: { mode: "proportional", reference: 1200 }, layer: 3, fit: "contain" }, overrides: { tablet: { x: 390, y: 20, elementWidth: 260, elementHeight: 473, constraintX: { mode: "proportional", reference: 704 } }, mobile: { x: 155, y: 75, elementWidth: 185, elementHeight: 337, constraintX: { mode: "proportional", reference: 358 } } }, a11y: { alt: labels[0] } });
  }
  if (slug === "about") for (const block of maylecorAboutMayBlocks()) {
    add({ type: "text", parent: body, rationale: "Preserve owner biography structure", props: { text: block.heading, variant: "heading", fontSize: 28, color: "#D95372" }, overrides: { mobile: { fontSize: 23 } }, a11y: { headingLevel: 2 } });
    add({ type: "text", parent: body, rationale: "Preserve full supplied wording and cultural identity", props: { text: block.body, fontSize: 17, lineHeight: 1.7, color: "#2E2030" } });
  }
  if (slug === "photos") {
    const gallery = add({ type: "group", parent: body, rationale: "Editable responsive photo grid", props: { layout: "grid", columns: 2, gap: "lg" }, overrides: { mobile: { columns: 1, gap: "md" } }, a11y: { label: "Approved May Lècor images" } });
    for (const [index, src] of images.entries()) add({ type: "image", parent: gallery, rationale: "Approved image with explicit alternative text", props: { src, fit: "contain", aspectRatio: "4:3", fillContainer: true }, a11y: { alt: labels[index] } });
  }
  if (slug === "music") {
    add({ type: "text", parent: body, rationale: "Use the owner-supplied release description only", props: { text: "She released her first single Guerre off of her debut album Maytamorphisis in late 2024.", fontSize: 20, lineHeight: 1.6, color: "#2E2030" } });
    add({ type: "text", parent: body, rationale: "Missing destinations are explicit, not fake player controls", props: { text: "Verified listening links have not been supplied. Add them before publishing.", variant: "caption", color: "#2E2030" } });
  }
  if (slug === "contact") add({ type: "text", parent: body, rationale: "Useful empty state without an invented address or fake form", props: { text: "Contact details have not been supplied. Add a verified booking address before publishing.", fontSize: 20, lineHeight: 1.6, color: "#2E2030" } });
  return { slug, title: slug === "home" ? "May Lècor" : slug, purpose: `Editable ${slug} reference content`, nodes };
}
export const plan = () => sitePlanSchema.parse({ version: 1, summary: "Manual native May Lècor portfolio: independent collage layers, biography, navigation and responsive gallery", warnings: ["Owner biography supplied; not independently verified", "Verified music and contact destinations still required", "Native reconstruction does not reproduce unsupported legacy parallax/audio/menu behavior", "Supplied skyline and figure include baked collage fragments/checkerboard; clean approved cutouts are needed for final asset-quality sign-off"], pages: slugs.map(nativePage) });
export function apply() {
  const initial = document();
  const result = prepareBuilderTransaction(initial, experiencePlanTransaction(initial, plan(), { kind: "site", replace: true }, profile()));
  if (!result.ok) throw Error(result.error.message);
  return { initial, result };
}
