/**
 * Regression coverage for responsive-state persistence and device-scoped editing.
 *
 *   E3 — deviceOverrides._state (Customize / Needs review) was stripped by the section
 *        props schema on save, and "Reset to Auto" could not clear stored overrides.
 *   C4 — Inspector edits made while Tablet/Phone was being edited overwrote Desktop props.
 *
 * Exercised at the real boundaries: the section props schema, the PATCH /sections route
 * (real schema, database stubbed), the responsive-state hash across a save round-trip,
 * and the inspector's device-scoped write routing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deviceScopedPatch,
  getResponsiveState,
  hashBaseProps,
  markResponsiveCustom,
  mergeDeviceAwareSectionProps,
  storeAutoOverrides,
} from "@/lib/create/device-overrides";
import { sectionPropsSchemas } from "@/lib/create/website-schema";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const PAGE_ID = "22222222-2222-4222-8222-222222222222";
const SECTION_ID = "33333333-3333-4333-8333-333333333333";

// ── Route harness: real handler + real schema, database stubbed ──────────────

const stored = vi.hoisted(() => ({ props: {} as Record<string, unknown>, lastUpdate: null as Record<string, unknown> | null }));

vi.mock("@/lib/create/auth", () => ({
  requireUser: async () => ({ user: { id: "owner-1", email: "owner@test.invalid" }, supabase: {} }),
  logCreate: () => {},
}));

vi.mock("@/lib/create/project-access", () => {
  function table(name: string) {
    const q: Record<string, unknown> = {};
    let pendingUpdate: Record<string, unknown> | null = null;
    const chain = () => q;
    q.select = chain;
    q.eq = chain;
    q.is = chain; // 3C: `.is("parent_id", null)` — every fixture row is a page root
    q.update = (payload: Record<string, unknown>) => {
      if (name === "project_sections") pendingUpdate = payload;
      return q;
    };
    q.maybeSingle = async () => {
      if (name === "project_sections") return { data: { id: SECTION_ID, page_id: PAGE_ID, section_type: "faq", props: stored.props, sort_order: 0 } };
      if (name === "project_pages") return { data: { id: PAGE_ID, project_id: PROJECT_ID } };
      return { data: null };
    };
    q.single = async () => {
      stored.lastUpdate = pendingUpdate;
      if (pendingUpdate?.props) stored.props = pendingUpdate.props as Record<string, unknown>;
      return { data: { id: SECTION_ID, page_id: PAGE_ID, section_type: "faq", sort_order: 0, props: stored.props }, error: null };
    };
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
    return q;
  }
  const db = { from: table };
  return {
    assertProjectEditorAccess: async () => ({ project: { id: PROJECT_ID, owner_id: "owner-1" }, via: "owner" }),
    dbForProjectAccess: () => db,
  };
});

async function patchSection(props: Record<string, unknown>) {
  const { PATCH } = await import("@/app/api/projects/[id]/sections/route");
  const req = new Request(`http://localhost/api/projects/${PROJECT_ID}/sections`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionId: SECTION_ID, props }),
  });
  return PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
}

const FAQ_BASE = { heading: "FAQ heading", items: [{ question: "Q?", answer: "A." }] };

beforeEach(() => {
  stored.props = { ...FAQ_BASE };
  stored.lastUpdate = null;
});

// ── E3: persistence ──────────────────────────────────────────────────────────

describe("responsive state survives save (E3)", () => {
  it("the section props schema keeps deviceOverrides._state", () => {
    const parsed = sectionPropsSchemas.faq.parse({
      ...FAQ_BASE,
      deviceOverrides: { tablet: { heading: "T" }, _state: { mode: "custom", baseHash: "abc123" } },
    }) as { deviceOverrides?: unknown };
    expect(parsed.deviceOverrides).toEqual({ tablet: { heading: "T" }, _state: { mode: "custom", baseHash: "abc123" } });
  });

  it("rejects an invalid responsive state instead of storing it", () => {
    const result = sectionPropsSchemas.faq.safeParse({ ...FAQ_BASE, deviceOverrides: { _state: { mode: "bogus" } } });
    expect(result.success).toBe(false);
  });

  it("PATCH /sections persists Customize (_state) — it is not stripped", async () => {
    const customized = markResponsiveCustom({ ...FAQ_BASE }, "faq");
    const res = await patchSection(customized);
    expect(res.status).toBe(200);
    const saved = stored.lastUpdate?.props as Record<string, unknown>;
    expect((saved.deviceOverrides as { _state?: { mode: string } })._state?.mode).toBe("custom");
    expect(getResponsiveState(saved, "faq")).toBe("custom");
  });

  it("PATCH /sections with deviceOverrides: null clears stored overrides (Reset to Auto)", async () => {
    stored.props = { ...FAQ_BASE, deviceOverrides: { tablet: { heading: "T" }, _state: { mode: "custom", baseHash: "x" } } };
    const res = await patchSection({ ...FAQ_BASE, deviceOverrides: null });
    expect(res.status).toBe(200);
    const saved = stored.lastUpdate?.props as Record<string, unknown>;
    expect(saved).not.toHaveProperty("deviceOverrides");
    expect(saved.heading).toBe(FAQ_BASE.heading);
    expect(getResponsiveState(saved, "faq")).toBe("auto");
  });

  it("a partial PATCH succeeds when a previous Reset left a stored deviceOverrides: null", async () => {
    // /sections/batch (Undo/Redo) persists props wholesale, so Redo of a Reset can store a literal null.
    stored.props = { ...FAQ_BASE, deviceOverrides: null };
    const res = await patchSection({ heading: "Partial edit" });
    expect(res.status).toBe(200);
    const saved = stored.lastUpdate?.props as Record<string, unknown>;
    expect(saved.heading).toBe("Partial edit");
    expect(saved.items).toEqual(FAQ_BASE.items);
    expect(saved).not.toHaveProperty("deviceOverrides");
    expect(getResponsiveState(saved, "faq")).toBe("auto");
  });

  it("an omitted deviceOverrides key leaves stored overrides untouched (merge semantics)", async () => {
    stored.props = { ...FAQ_BASE, deviceOverrides: { tablet: { heading: "T" } } };
    await patchSection({ heading: "New desktop heading" });
    expect((stored.lastUpdate?.props as { deviceOverrides?: unknown }).deviceOverrides).toEqual({ tablet: { heading: "T" } });
  });
});

describe("responsive state across a save round-trip (Customize → Desktop edit → Needs review)", () => {
  const save = (props: Record<string, unknown>) => sectionPropsSchemas.faq.parse(props) as Record<string, unknown>;

  it("hash is identical for raw props and their saved (schema-normalised) form", () => {
    expect(hashBaseProps(save({ ...FAQ_BASE }), "faq")).toBe(hashBaseProps({ ...FAQ_BASE }, "faq"));
  });

  it("hash ignores key order and treats null as absent", () => {
    const reordered = { items: FAQ_BASE.items, heading: FAQ_BASE.heading };
    expect(hashBaseProps(reordered, "faq")).toBe(hashBaseProps({ ...FAQ_BASE }, "faq"));
    expect(hashBaseProps({ ...FAQ_BASE, _visibility: null }, "faq")).toBe(hashBaseProps({ ...FAQ_BASE }, "faq"));
  });

  it("Customize persists as Customized, and a later Desktop edit becomes Needs review — before and after saving", async () => {
    const customized = save(markResponsiveCustom({ ...FAQ_BASE }, "faq"));
    expect(getResponsiveState(customized, "faq")).toBe("custom");

    const withTabletCopy = save({ ...customized, deviceOverrides: { ...(customized.deviceOverrides as object), tablet: { heading: "Tablet copy" } } });
    expect(getResponsiveState(withTabletCopy, "faq")).toBe("custom");

    const desktopEdited = { ...withTabletCopy, heading: "Desktop v2" };
    expect(getResponsiveState(desktopEdited, "faq")).toBe("needs-review");
    const reloaded = save(desktopEdited);
    expect(getResponsiveState(reloaded, "faq")).toBe("needs-review");
    expect((reloaded.deviceOverrides as { tablet?: { heading?: string } }).tablet?.heading).toBe("Tablet copy");
  });

  it("\"Keep — mark reviewed\" returns a needs-review section to Customized", () => {
    const stale = { ...save(markResponsiveCustom({ ...FAQ_BASE }, "faq")), heading: "Desktop v2" };
    expect(getResponsiveState(stale, "faq")).toBe("needs-review");
    expect(getResponsiveState(save(markResponsiveCustom(stale, "faq")), "faq")).toBe("custom");
  });

  it("auto-generated overrides stay Auto-designed until the base changes", () => {
    const auto = save(storeAutoOverrides({ ...FAQ_BASE }, { mobile: { heading: "Short" } }, "faq"));
    expect(getResponsiveState(auto, "faq")).toBe("auto");
    expect(getResponsiveState({ ...auto, heading: "Changed" }, "faq")).toBe("needs-review");
  });
});

// ── C4: device-scoped inspector edits ────────────────────────────────────────

describe("inspector edits while Tablet/Phone is edited (C4)", () => {
  const HERO = { heading: "Desktop heading", subheading: "Desktop sub", imageUrl: "/a.jpg" };

  it("a Tablet heading edit lands in deviceOverrides.tablet and leaves Desktop untouched", () => {
    const patch = deviceScopedPatch("hero", HERO, "tablet", { heading: "Tablet heading" });
    expect(patch).not.toHaveProperty("heading");
    const next = { ...HERO, ...patch };
    expect(next.heading).toBe("Desktop heading");
    expect(mergeDeviceAwareSectionProps(next, "tablet").heading).toBe("Tablet heading");
    expect(mergeDeviceAwareSectionProps(next, "mobile").heading).toBe("Desktop heading");
    expect(mergeDeviceAwareSectionProps(next, "desktop").heading).toBe("Desktop heading");
    expect(getResponsiveState(next, "hero")).toBe("custom");
  });

  it("keys that are not device-editable stay shared base content", () => {
    const patch = deviceScopedPatch("hero", HERO, "mobile", { imageUrl: "/b.jpg", _visibility: { hideOn: ["tablet"] } });
    expect(patch).toEqual({ imageUrl: "/b.jpg", _visibility: { hideOn: ["tablet"] } });
  });

  it("a mixed edit splits: device keys to the device, shared keys to base", () => {
    const patch = deviceScopedPatch("hero", HERO, "mobile", { heading: "Phone heading", imageUrl: "/c.jpg" });
    const next = { ...HERO, ...patch };
    expect(next.imageUrl).toBe("/c.jpg");
    expect(next.heading).toBe("Desktop heading");
    expect(mergeDeviceAwareSectionProps(next, "mobile").heading).toBe("Phone heading");
  });

  it("Tablet and Phone overrides are independent", () => {
    const afterTablet = { ...HERO, ...deviceScopedPatch("hero", HERO, "tablet", { heading: "Tablet heading" }) };
    const afterPhone = { ...afterTablet, ...deviceScopedPatch("hero", afterTablet, "mobile", { heading: "Phone heading" }) };
    expect(mergeDeviceAwareSectionProps(afterPhone, "tablet").heading).toBe("Tablet heading");
    expect(mergeDeviceAwareSectionProps(afterPhone, "mobile").heading).toBe("Phone heading");
    expect(afterPhone.heading).toBe("Desktop heading");
  });

  it("Desktop edits are base edits", () => {
    expect(deviceScopedPatch("hero", HERO, "desktop", { heading: "New" })).toEqual({ heading: "New" });
  });

  it("the device-scoped edit survives the save schema", () => {
    const next = sectionPropsSchemas.hero.parse({ ...HERO, ...deviceScopedPatch("hero", HERO, "tablet", { heading: "Tablet heading" }) }) as Record<string, unknown>;
    expect(next.heading).toBe("Desktop heading");
    expect(mergeDeviceAwareSectionProps(next, "tablet").heading).toBe("Tablet heading");
    expect(getResponsiveState(next, "hero")).toBe("custom");
  });
});
