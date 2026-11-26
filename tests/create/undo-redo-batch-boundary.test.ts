/**
 * B1 — Undo/Redo persistence (POST /sections/batch → batch_update_section_props RPC) must pass
 * the same save boundary as PATCH /sections (lib/create/section-props-boundary.ts).
 *
 * Before: the route forwarded client snapshots to the RPC untouched — no per-type schema, no
 * extension-key validation, no unsafe-content check. Stale or invalid history could be stored.
 *
 * Real route handler + real schema/boundary; the database is stubbed and the RPC payload captured.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getResponsiveState, markResponsiveCustom } from "@/lib/create/device-overrides";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PAGE = "99999999-9999-4999-8999-999999999999";
const HERO = "33333333-3333-4333-8333-333333333333";
const FAQ = "44444444-4444-4444-8444-444444444444";
const TEXT = "55555555-5555-4555-8555-555555555555";
const FOREIGN = "66666666-6666-4666-8666-666666666666";
const PHOTO = "https://skqnxyaeimvbyrmdfzvk.supabase.co/storage/v1/object/public/site-assets/u/p/section-1.jpg";

const db = vi.hoisted(() => ({
  rpcCalls: [] as { fn: string; args: { p_project_id: string; p_updates: { id: string; props: Record<string, unknown> }[] } }[],
  /** Structural writes: row inserts (re-created sections), deletes and position updates. */
  writes: [] as { op: "insert" | "delete" | "update"; rows?: Record<string, unknown>[]; ids?: string[]; patch?: Record<string, unknown>; id?: string }[],
}));

vi.mock("@/lib/create/auth", () => ({
  requireUser: async () => ({ user: { id: "owner-1", email: "owner@test.invalid" }, supabase: {} }),
  logCreate: () => {},
}));

vi.mock("@/lib/create/project-access", () => {
  const rows = [
    { id: "33333333-3333-4333-8333-333333333333", page_id: "22222222-2222-4222-8222-222222222222", section_type: "hero", sort_order: 0 },
    { id: "44444444-4444-4444-8444-444444444444", page_id: "22222222-2222-4222-8222-222222222222", section_type: "faq", sort_order: 1 },
    { id: "55555555-5555-4555-8555-555555555555", page_id: "22222222-2222-4222-8222-222222222222", section_type: "text", sort_order: 2 },
    // A section on another project's page.
    { id: "66666666-6666-4666-8666-666666666666", page_id: "99999999-9999-4999-8999-999999999999", section_type: "text", sort_order: 0 },
  ];
  function table(name: string) {
    let ids: string[] | null = null;
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.is = () => q; // 3C: `.is("parent_id", null)` — every fixture row is a page root
    let op: "select" | "delete" | "update" = "select";
    let patch: Record<string, unknown> | undefined;
    q.in = (_col: string, values: string[]) => {
      ids = values;
      if (op === "delete") db.writes.push({ op: "delete", ids: values });
      return q;
    };
    q.insert = (rowsIn: Record<string, unknown>[]) => {
      db.writes.push({ op: "insert", rows: rowsIn });
      return Promise.resolve({ error: null });
    };
    q.delete = () => { op = "delete"; return q; };
    q.update = (p: Record<string, unknown>) => { op = "update"; patch = p; return q; };
    q.eq = (_col: string, value: string) => {
      if (op === "update") db.writes.push({ op: "update", id: value, patch });
      return q;
    };
    q.then = (resolve: (v: unknown) => unknown) =>
      resolve(
        name === "project_pages"
          ? { data: [{ id: "22222222-2222-4222-8222-222222222222" }], error: null }
          : { data: rows.filter((r) => !ids || ids.includes(r.id)), error: null },
      );
    return q;
  }
  const client = {
    from: table,
    rpc: async (fn: string, args: (typeof db.rpcCalls)[number]["args"]) => {
      db.rpcCalls.push({ fn, args });
      return { data: args.p_updates.length, error: null };
    },
  };
  return {
    assertProjectEditorAccess: async () => ({ project: { id: PROJECT_ID, owner_id: "owner-1" }, via: "owner" }),
    dbForProjectAccess: () => client,
  };
});

async function post(rawBody: string) {
  const { POST } = await import("@/app/api/projects/[id]/sections/batch/route");
  const res = await POST(
    new Request(`http://localhost/api/projects/${PROJECT_ID}/sections/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawBody,
    }),
    { params: Promise.resolve({ id: PROJECT_ID }) },
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

type Entry = { id: string; props: Record<string, unknown>; sort_order?: number; restore?: { page_id: string; section_type: string; sort_order: number } };
const batch = (updates: Entry[]) => post(JSON.stringify({ updates }));

const written = () => db.rpcCalls.at(-1)?.args.p_updates ?? null;
const writtenProps = (id: string) => written()?.find((u) => u.id === id)?.props;

const HERO_PROPS = { heading: "Hero", subheading: "Sub", buttonLabel: "Go", buttonHref: "#", align: "center", minHeight: "100vh", image: PHOTO, overlayOpacity: 0.6 };
const FAQ_PROPS = { heading: "FAQ", items: [{ question: "Q?", answer: "A." }] };

beforeEach(() => {
  db.rpcCalls = [];
  db.writes = [];
});

describe("B1 — Undo/Redo snapshots pass the canonical save boundary", () => {
  it("a valid snapshot is restored intact (Hero height/image/overlay, device overrides + state, extension keys)", async () => {
    const faq = markResponsiveCustom({ ...FAQ_PROPS, deviceOverrides: { tablet: { heading: "Tablet FAQ" } } }, "faq");
    const text = { heading: "T", body: "B", _visibility: { hideOn: ["tablet"] } };
    const res = await batch([
      { id: HERO, props: HERO_PROPS },
      { id: FAQ, props: faq },
      { id: TEXT, props: text },
    ]);
    expect(res.status).toBe(200);
    expect(writtenProps(HERO)).toMatchObject(HERO_PROPS);
    expect(writtenProps(FAQ)?.deviceOverrides).toEqual(faq.deviceOverrides);
    expect(getResponsiveState(writtenProps(FAQ)!, "faq")).toBe("custom");
    expect(writtenProps(TEXT)?._visibility).toEqual(text._visibility);
  });

  it("stale history is normalized like a normal save: unknown keys stripped, invalid optional values dropped, legacy Hero fields mapped, deviceOverrides:null removed", async () => {
    const res = await batch([
      {
        id: HERO,
        props: { heading: "Old", subheading: "", backgroundImage: PHOTO, accentColor: "#ff0000", minHeight: "37px", backgroundImageUrl: PHOTO, overlay: 0.3, deviceOverrides: null },
      },
    ]);
    expect(res.status).toBe(200);
    const hero = writtenProps(HERO)!;
    expect(hero).toMatchObject({ heading: "Old", image: PHOTO, overlayOpacity: 0.3 });
    for (const key of ["backgroundImage", "accentColor", "backgroundImageUrl", "overlay", "deviceOverrides"]) expect(hero, key).not.toHaveProperty(key);
    expect(hero.minHeight).toBeUndefined();
  });

  it("writes exactly what PATCH /sections would store for the same props (one boundary, no duplicated rules)", async () => {
    const props = { ...HERO_PROPS, stale: 1, _visibility: { hideOn: ["mobile"] } };
    await batch([{ id: HERO, props }]);
    const viaBoundary = sectionPropsForSave("hero", props);
    expect(viaBoundary.ok).toBe(true);
    expect(writtenProps(HERO)).toEqual(viaBoundary.ok ? viaBoundary.props : null);
  });

  it("an invalid entry rejects the whole batch and nothing is written", async () => {
    const res = await batch([
      { id: FAQ, props: FAQ_PROPS },
      { id: HERO, props: { ...HERO_PROPS, heading: "" } },
    ]);
    expect(res.status).toBe(400);
    expect((res.body.rejected as { id: string }[]).map((r) => r.id)).toEqual([HERO]);
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("unsafe content in a snapshot is rejected, not stored", async () => {
    const res = await batch([{ id: TEXT, props: { heading: "T", body: '<script>alert(1)</script>' } }]);
    expect(res.status).toBe(400);
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("an invalid extension value is dropped; valid ones are kept", async () => {
    await batch([{ id: TEXT, props: { heading: "T", body: "B", _visibility: { showOn: ["tablet"], hideOn: ["tablet"] }, _a11y: { label: "Intro" } } }]);
    const text = writtenProps(TEXT)!;
    expect(text, "contradictory visibility dropped").not.toHaveProperty("_visibility");
    expect(text._a11y).toEqual({ label: "Intro" });
  });

  it("a malformed history entry rejects the request before anything is read or written", async () => {
    const malformed: [string, string][] = [
      ["id is not a uuid", JSON.stringify({ updates: [{ id: "hero-1", props: HERO_PROPS }] })],
      ["props is null", JSON.stringify({ updates: [{ id: HERO, props: null }] })],
      ["props is an array", JSON.stringify({ updates: [{ id: HERO, props: [HERO_PROPS] }] })],
      ["props is a string", JSON.stringify({ updates: [{ id: HERO, props: "heading" }] })],
      ["props missing", JSON.stringify({ updates: [{ id: HERO }] })],
      ["updates missing", JSON.stringify({})],
      ["updates empty", JSON.stringify({ updates: [] })],
      ["more than 50 entries", JSON.stringify({ updates: Array.from({ length: 51 }, () => ({ id: HERO, props: HERO_PROPS })) })],
      ["body is not JSON", "{ updates: "],
    ];
    for (const [label, body] of malformed) {
      const res = await post(body);
      expect(res.status, label).toBe(400);
    }
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("sections outside this project are not written (as before: the RPC ignored them)", async () => {
    const res = await batch([
      { id: HERO, props: HERO_PROPS },
      { id: FOREIGN, props: { heading: "x", body: "y" } },
    ]);
    expect(res.status).toBe(200);
    expect(written()?.map((u) => u.id)).toEqual([HERO]);
    void OTHER_PAGE;
  });
});

// ── O5: Undo/Redo of Add / Remove / Move converge the rows on the snapshot ─────────────────
const REMOVED = "77777777-7777-4777-8777-777777777777";
const PAGE = "22222222-2222-4222-8222-222222222222";

describe("O5 — Undo/Redo writes structure (re-create, delete, move) through the same boundary", () => {
  it("Undo of Remove / Redo of Add: a missing section is re-created with the same id, page, type, position and validated props", async () => {
    const res = await batch([{ id: REMOVED, props: { ...HERO_PROPS, stale: 1 }, sort_order: 1, restore: { page_id: PAGE, section_type: "hero", sort_order: 1 } }]);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({ restored: 1, deleted: 0 });
    const inserted = db.writes.find((w) => w.op === "insert")!.rows![0]!;
    const viaBoundary = sectionPropsForSave("hero", { ...HERO_PROPS, stale: 1 });
    expect(inserted).toEqual({ id: REMOVED, page_id: PAGE, section_type: "hero", sort_order: 1, props: viaBoundary.ok ? viaBoundary.props : null });
    expect(db.rpcCalls, "no props update for a row that did not exist").toHaveLength(0);
  });

  it("Undo of Add / Redo of Remove: sections the snapshot lacks are deleted; missing and foreign ids are not touched", async () => {
    const res = await post(JSON.stringify({ updates: [], deletes: [TEXT, REMOVED, FOREIGN] }));
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(db.writes.filter((w) => w.op === "delete")).toEqual([{ op: "delete", ids: [TEXT] }]);
  });

  it("Undo of Move: an existing section whose snapshot position differs is moved back", async () => {
    const res = await batch([{ id: FAQ, props: FAQ_PROPS, sort_order: 2 }, { id: HERO, props: HERO_PROPS, sort_order: 0 }]);
    expect(res.status).toBe(200);
    expect(db.writes.filter((w) => w.op === "update")).toEqual([{ op: "update", id: FAQ, patch: { sort_order: 2 } }]);
  });

  it("an invalid re-created section rejects the whole request before anything is written", async () => {
    const res = await post(JSON.stringify({
      updates: [{ id: REMOVED, props: { ...HERO_PROPS, heading: "<script>x</script>" }, restore: { page_id: PAGE, section_type: "hero", sort_order: 1 } }],
      deletes: [TEXT],
    }));
    expect(res.status).toBe(400);
    expect(db.writes).toEqual([]);
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("a section cannot be re-created on another project's page", async () => {
    const res = await batch([{ id: REMOVED, props: HERO_PROPS, restore: { page_id: OTHER_PAGE, section_type: "hero", sort_order: 0 } }]);
    expect(res.status).toBe(400);
    expect(db.writes).toEqual([]);
  });

  it("a missing section without placement (older clients) is skipped, as before", async () => {
    const res = await batch([{ id: REMOVED, props: HERO_PROPS }]);
    expect(res.status).toBe(200);
    expect(db.writes).toEqual([]);
  });
});
