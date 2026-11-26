/**
 * S1 gate — responsive resolution in the core is IDENTICAL to 3B on every 3B fixture:
 *
 *   resolveProp        == readDeviceOverride            (every key, every device)
 *   resolveNode        == mergeDeviceAwareSectionProps  (reserved storage keys aside)
 *   orderRootsForDevice == orderSectionsForDevice       (chrome pinned, malformed lists)
 *   isVisible          == isSectionVisibleOnDevice
 *
 * Corpus: every section of every template seed, with (a) its stored overrides, (b) the
 * responsive composer's generated overrides, (c) seeded random overrides including null and
 * non-overridable keys; pages get random, partial, duplicated and stale device layouts.
 */
import { describe, expect, it } from "vitest";
import {
  DEVICES,
  RESERVED_PROP_KEYS,
  isVisible,
  legacySectionType,
  orderRootsForDevice,
  resolveNode,
  resolveProp,
  type KcdNode,
  type KcdPage,
  type NodeId,
  type PageId,
} from "@/lib/creative-core";
import { isSectionVisibleOnDevice, orderSectionsForDevice } from "@/lib/create/device-composition";
import { mergeDeviceAwareSectionProps, readDeviceOverride, type DeviceBucket } from "@/lib/create/device-overrides";
import { generateDeviceOverrides } from "@/lib/create/responsive-composer";
import { CHROME_FOOTER_ID, CHROME_HEADER_ID } from "@/lib/create/site-chrome";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
import type { PageDeviceLayouts } from "@/lib/create/website-extensions";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { legacyDefinition, rng, uuidFor, type Rng } from "./helpers";

type Section = WebsiteDefinition["pages"][number]["sections"][number];
type Stored = { id: string; type: Section["type"]; props: Record<string, unknown>; visibility?: Section["visibility"] };

/** Minimal lift of a stored 3B section into a node (S2 replaces this with the real adapter). */
function lift(s: Stored, pageId: PageId, orderKey: string): KcdNode {
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s.props)) if (!RESERVED_PROP_KEYS.has(k)) props[k] = v;
  const bucket = (s.props.deviceOverrides ?? undefined) as DeviceBucket | undefined;
  const overrides: KcdNode["overrides"] = {};
  if (bucket?.tablet) overrides.tablet = bucket.tablet;
  if (bucket?.mobile) overrides.mobile = bucket.mobile;
  const n: KcdNode = {
    id: s.id as NodeId,
    type: legacySectionType(s.type),
    typeVersion: 1,
    pageId,
    parentId: null,
    orderKey,
    props,
    overrides,
    version: 1,
  };
  const vis = (s.props._visibility as KcdNode["visibility"]) ?? s.visibility;
  if (vis) n.visibility = vis;
  return n;
}

const SAMPLE_VALUES: unknown[] = ["phone copy", "", null, 0, 3, true, false, ["a", "b"], { nested: { x: 1 } }];

function randomOverrides(r: Rng, props: Record<string, unknown>): DeviceBucket | undefined {
  if (r.chance(0.3)) return undefined;
  const keys = [...Object.keys(props), "notInBase", "align", "heading"];
  const bucket: DeviceBucket = {};
  for (const device of ["tablet", "mobile"] as const) {
    if (r.chance(0.3)) continue;
    const slot: Record<string, unknown> = {};
    const n = 1 + r.int(4);
    for (let i = 0; i < n; i++) slot[r.pick(keys)] = r.pick(SAMPLE_VALUES);
    bucket[device] = slot;
  }
  if (r.chance(0.3)) bucket._state = { mode: r.pick(["auto", "custom", "needs-review"] as const), baseHash: "abc" };
  return bucket;
}

function randomLayouts(r: Rng, ids: string[]): PageDeviceLayouts {
  const layouts: NonNullable<PageDeviceLayouts> = {};
  for (const device of ["tablet", "mobile"] as const) {
    if (r.chance(0.25)) continue;
    const shuffled = [...ids].sort(() => r.next() - 0.5);
    const order = shuffled.slice(0, r.int(shuffled.length + 1));
    if (r.chance(0.3)) order.push(CHROME_FOOTER_ID, "stale-id", order[0] ?? "x"); // chrome, unknown, duplicate
    const hidden = shuffled.filter((id) => !order.includes(id) && r.chance(0.25));
    layouts[device] = { ...(order.length ? { sectionOrder: order } : {}), ...(hidden.length ? { hiddenSections: hidden } : {}) };
  }
  return layouts;
}

function withoutReserved(props: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(props).filter(([k]) => !RESERVED_PROP_KEYS.has(k)));
}

interface Case {
  label: string;
  sections: Stored[];
  layouts: PageDeviceLayouts;
}

function buildCases(): Case[] {
  const r = rng(2026);
  const cases: Case[] = [];
  let n = 0;
  for (const seed of TEMPLATE_SEEDS) {
    for (const page of seed.definition.pages) {
      for (const variant of ["stored", "composer", "random"] as const) {
        const sections: Stored[] = page.sections.map((s) => {
          const props = { ...(s.props as Record<string, unknown>) };
          if (variant === "composer") {
            const generated = generateDeviceOverrides(s.type, props);
            if (Object.keys(generated).length) props.deviceOverrides = { ...generated, _state: { mode: "auto" } };
          } else if (variant === "random") {
            const bucket = randomOverrides(r, props);
            if (bucket) props.deviceOverrides = bucket;
            if (r.chance(0.1)) props.hidden = true;
            if (r.chance(0.15)) props._visibility = r.pick([{ hideOn: ["mobile"] }, { showOn: ["desktop", "tablet"] }, { hideOn: ["tablet", "desktop"] }]);
          }
          return { id: uuidFor(++n, 0x5eed), type: s.type, props, visibility: s.visibility };
        });
        // Site chrome around the body, as buildEditorPreviewDefinition composes it.
        const withChrome: Stored[] = r.chance(0.5)
          ? [
              { id: CHROME_HEADER_ID, type: "navigation", props: { brand: "Kebu" } },
              ...sections,
              { id: CHROME_FOOTER_ID, type: "footer", props: { text: "©" } },
            ]
          : sections;
        cases.push({
          label: `${seed.slug}/${page.slug}/${variant}`,
          sections: withChrome,
          layouts: variant === "stored" ? (page.deviceLayouts as PageDeviceLayouts) : randomLayouts(r, sections.map((s) => s.id)),
        });
      }
    }
  }
  return cases;
}

const CASES = buildCases();
const PAGE_ID = uuidFor(1, 0xbabe) as PageId;
const PINS = { pinnedFirst: new Set([CHROME_HEADER_ID]), pinnedLast: new Set([CHROME_FOOTER_ID]) };

function pageFrom(layouts: PageDeviceLayouts): Pick<KcdPage, "deviceLayout"> {
  const deviceLayout: KcdPage["deviceLayout"] = {};
  for (const device of ["tablet", "mobile"] as const) {
    const l = layouts?.[device];
    if (l) deviceLayout[device] = { order: l.sectionOrder as NodeId[] | undefined, hidden: l.hiddenSections as NodeId[] | undefined };
  }
  return { deviceLayout };
}

describe("responsive parity with 3B", () => {
  it("covers the whole template corpus", () => {
    expect(TEMPLATE_SEEDS.length).toBeGreaterThanOrEqual(100);
    expect(CASES.length).toBeGreaterThanOrEqual(TEMPLATE_SEEDS.length * 3);
  });

  it("resolveProp == readDeviceOverride for every key on every device", () => {
    let checks = 0;
    const mismatches: string[] = [];
    for (const c of CASES) {
      c.sections.forEach((s, i) => {
        const nodeFor = lift(s, PAGE_ID, `k${i}V`);
        const def = legacyDefinition(s.type);
        const bucket = s.props.deviceOverrides as DeviceBucket | undefined;
        const keys = new Set([...Object.keys(s.props), ...Object.keys(bucket?.tablet ?? {}), ...Object.keys(bucket?.mobile ?? {})]);
        for (const key of keys) {
          if (RESERVED_PROP_KEYS.has(key)) continue;
          for (const device of DEVICES) {
            const got = resolveProp(nodeFor, device, key, def);
            const want = readDeviceOverride(s.props, device, key);
            if (!Object.is(got, want) && JSON.stringify(got) !== JSON.stringify(want)) {
              mismatches.push(`${c.label} ${s.type}.${key}@${device}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
            }
            checks++;
          }
        }
      });
    }
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(checks).toBeGreaterThan(10_000);
  });

  it("resolveNode == mergeDeviceAwareSectionProps (content keys)", () => {
    for (const c of CASES) {
      c.sections.forEach((s, i) => {
        const nodeFor = lift(s, PAGE_ID, `k${i}V`);
        for (const device of DEVICES) {
          expect(resolveNode(nodeFor, device, legacyDefinition(s.type)), `${c.label} ${s.type}@${device}`).toEqual(
            withoutReserved(mergeDeviceAwareSectionProps(s.props, device)),
          );
        }
      });
    }
  });

  it("orderRootsForDevice == orderSectionsForDevice (chrome pinned; stale, duplicate and chrome ids ignored)", () => {
    for (const c of CASES) {
      const page = pageFrom(c.layouts);
      for (const device of DEVICES) {
        const expected = orderSectionsForDevice(c.sections, c.layouts, device).map((s) => s.id);
        expect(orderRootsForDevice(c.sections, page, device, PINS).map((s) => s.id), `${c.label}@${device}`).toEqual(expected);
      }
    }
  });

  it("isVisible == isSectionVisibleOnDevice", () => {
    let hiddenSomewhere = 0;
    for (const c of CASES) {
      const page = pageFrom(c.layouts);
      c.sections.forEach((s, i) => {
        const nodeFor = lift(s, PAGE_ID, `k${i}V`);
        const composable = { id: s.id, props: s.props, visibility: (s.props._visibility as Section["visibility"]) ?? s.visibility };
        for (const device of DEVICES) {
          const expected = isSectionVisibleOnDevice(composable, c.layouts, device);
          if (!expected) hiddenSomewhere++;
          expect(isVisible(nodeFor, page, device), `${c.label} ${s.id}@${device}`).toBe(expected);
        }
      });
    }
    expect(hiddenSomewhere).toBeGreaterThan(100);
  });
});
