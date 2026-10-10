# 3C — Creative Document Core: DESIGN FREEZE

Status: **APPROVED 2026-09-28 (human).** Approved direction: D1(a), D2, D3 pilot, D4 exact 3B inheritance,
D5 `lib/creative-core`, D6 branch from the verified line. Capability intersection (node capabilities × renderer
capabilities → editor behavior) is a central rule. Implementation proceeds slice by slice (§17); progress per slice is
recorded in §21.

**Approval confirmations (binding):**
1. **Per-project opt-in** — existing projects stay on exact 3B behavior; no destructive migration. The end-of-3C gate (S8)
   must decide whether KCD becomes the default for NEW projects. Opt-in must not become an indefinite split architecture.
2. **Legacy save validation** — `legacy-section:*` keeps 3B `sectionPropsForSave` semantics; native primitives use strict
   schemas and reject unknown props. Legacy unknown-key stripping is tracked compatibility debt (see end of document).
3. **Journal is minimal** (§14) — no whole documents, large payloads, sensitive content or secrets.
4. **Performance** (§15) — baselines established in S1/S2; budgets set afterwards from evidence; no brittle ratio rule;
   a clearly quadratic curve is a blocker.

---

## 1. Source line

| | |
|---|---|
| 3C branch / worktree | `creative-core/3c` · `/Users/mbayangdiallo/kebu-3c` (local only) |
| Source commit | `509cbe9c076811a3e225d081561048a58964b55a` |
| Source tree | `a75550d30d58785f824085a1cf241d6ef0f7bb5c` |
| Why 509cbe9 (not 97d0eab) | `509cbe9` = reconciled 3B release `97d0eab` (tree `62c77d9…`) + final 3B sign-off docs + F0-A containment. It is the only commit containing all verified 3B/O5/O6 work **and** F0-A. Builder source is byte-identical to the frozen `phase3b/tested-freeze` (`0e035b6`, tree `9936bac…`). |
| Frozen checkpoints (untouched) | `phase3b/tested-freeze` `0e035b6` · `builder/release-reconciled` `97d0eab` · `builder/release-candidate` `509cbe9` |

---

## 2. Canonical document / node model (`lib/creative-core/model.ts`)

```ts
export const KCD_SCHEMA_VERSION = "kcd-1" as const;

/** Opaque, permanent identity. UUID v4. Never encodes position, parent, device or order. */
export type NodeId = string & { readonly __brand: "NodeId" };
export type PageId = string & { readonly __brand: "PageId" };

/** Desktop is the base; only these two device slots can override (D4). */
export type OverrideDevice = "tablet" | "mobile";
export type Device = "desktop" | OverrideDevice;

export interface KcdDocument {
  schemaVersion: typeof KCD_SCHEMA_VERSION;
  id: string;                     // project id (site) or design id (Studio, later)
  kind: "site" | "design";        // renderer-agnostic; "design" reserved for Studio
  title: string;
  tokens: TokenSet;               // today's theme → tokens (colors, fonts, spacing, radius, motion flags)
  meta: DocumentMeta;             // seo, provenance, template origin (opaque to the core)
  pages: KcdPage[];               // ordered by orderKey
  nodes: Record<NodeId, KcdNode>; // normalized flat map; tree via parentId + orderKey
  unknown?: Record<string, unknown>; // preserved document-level data from newer/foreign versions
}

export interface KcdPage {
  id: PageId;
  slug: string;
  title: string;
  orderKey: string;
  /** Page-scoped per-device composition of ROOT nodes — today's project_pages.device_layouts, unchanged semantics. */
  deviceLayout: { tablet?: DeviceComposition; mobile?: DeviceComposition };
  layoutVersion: number;          // optimistic concurrency for deviceLayout
}
export interface DeviceComposition { order?: NodeId[]; hidden?: NodeId[] }

export interface KcdNode {
  id: NodeId;
  type: NodeTypeId;               // e.g. "group" | "text" | "image" | "legacy-section:hero"
  typeVersion: number;            // per-type schema version
  pageId: PageId;
  parentId: NodeId | null;        // null = page root
  orderKey: string;               // fractional key among siblings (§7)
  props: Record<string, unknown>; // BASE (desktop) values, validated by the type definition
  overrides: Partial<Record<OverrideDevice, Record<string, unknown>>>; // sparse, per-key (§5)
  responsiveState?: { mode: "auto" | "custom" | "needs-review"; baseHash?: string }; // 3B _state, preserved
  visibility?: { hideOn?: Device[]; showOn?: Device[] }; // 3B _visibility, preserved
  a11y?: NodeA11y;                // semantics live in the model (req. 9)
  motion?: unknown;               // opaque payload; capability "motion" governs use (3E defines it)
  interaction?: unknown;          // opaque, capability-gated (3E)
  dataBinding?: unknown;          // opaque, capability-gated (later product integration)
  locked?: boolean;               // stored now; enforced by editor in 3D
  unknown?: Record<string, unknown>; // unrecognized data preserved verbatim
  version: number;                // node_version (server authority, §8)
}

export interface NodeA11y {
  role?: "region" | "banner" | "contentinfo" | "navigation" | "heading" | "img" | "presentation" | "none";
  label?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  alt?: string;                   // media
  decorative?: boolean;           // media: alt intentionally empty
  lang?: string;
}
```

Pilot node types (D3): `section` (new generic container), `group`, `text`, `image`.
Compatibility node types: `legacy-section:<one of the 41 existing section types>` — props, overrides, extensions
exactly as stored today; rendered by the existing web section code.

---

## 3. Capability registry (`lib/creative-core/registry.ts`)

```ts
export type Capability =
  | "layout.flow" | "layout.positioned" | "nesting" | "responsive.overrides"
  | "text.edit" | "media" | "typography" | "fill" | "effects" | "mask"
  | "a11y" | "links" | "motion" | "interaction" | "component" | "dataBinding";

export interface PropertyDescriptor {
  key: string;                    // prop path
  label: string;                  // REQUIRED accessible label (fixes O7 structurally)
  control: "text" | "textarea" | "select" | "color" | "number" | "range" | "toggle" | "media" | "link";
  capability: Capability;         // control exists only if the type AND renderer support it
  overridable: boolean;           // may be set per device (§5)
  group?: "content" | "layout" | "style" | "a11y" | "advanced";
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface NodeTypeDefinition<P = Record<string, unknown>> {
  type: NodeTypeId;
  version: number;
  displayName: string;
  capabilities: ReadonlySet<Capability>;
  propsSchema: ZodType<P>;        // known props
  writePolicy: "reject-unknown" | "legacy-3b-boundary"; // primitives reject unknown keys on write;
                                  // legacy-section keeps today's sectionPropsForSave semantics (non-regression)
  properties: ReadonlyArray<PropertyDescriptor>;
  children: "none" | { allow: ReadonlyArray<NodeTypeId>; max?: number };
  migrations: ReadonlyArray<{ from: number; to: number; up: (props: unknown) => unknown }>;
  a11yDefaults?: Partial<NodeA11y>;
}

/** What a renderer can actually realize. Negotiated against the registry. */
export interface RendererManifest {
  renderer: "web-dom" | string;
  version: number;
  supports: (type: NodeTypeId, capability: Capability) => boolean;
  supportsNodeType: (type: NodeTypeId, typeVersion: number) => boolean;
}
```

**Negotiation rules**
1. An inspector control is shown only if `descriptor.capability ∈ type.capabilities` **and** `manifest.supports(type, capability)`.
2. A stored value whose capability the active renderer does not support is **shown as "not supported by this renderer"**,
   preserved, and **publish preflight blocks** (explicit message) — never silently ignored.
3. Unknown node type / unmigratable version → `UnsupportedNode` placeholder in the editor; data preserved verbatim;
   not deletable by accident (explicit remove only); publish preflight blocks unless a renderer supports it.
4. Existing 3B extensions map to capabilities: `_motion`→`motion`, `_interaction`→`interaction` (unsupported by web
   renderer today → surfaced, F0-C), `_dataBinding`→`dataBinding` (unsupported → surfaced), `_a11y`→`a11y`,
   `_visibility`→`responsive.overrides`.

---

## 4. Operation vocabulary and invariants (`lib/creative-core/ops.ts`)

```ts
export type Op =
  | { op: "insertNode"; node: NewNode; parentId: NodeId | null; pageId: PageId; orderKey: string }
  | { op: "insertSubtree"; nodes: NewNode[] }                  // duplicate/paste (new ids)
  | { op: "removeNode"; id: NodeId }                           // removes the whole subtree
  | { op: "restoreSubtree"; nodes: KcdNode[] }                 // Undo of remove: SAME ids, recorded versions
  | { op: "moveNode"; id: NodeId; parentId: NodeId | null; orderKey: string } // identity preserved
  | { op: "setProp"; id: NodeId; path: string; value: unknown }
  | { op: "unsetProp"; id: NodeId; path: string }              // back to type default / absent
  | { op: "setOverride"; id: NodeId; device: OverrideDevice; key: string; value: unknown }
  | { op: "clearOverride"; id: NodeId; device: OverrideDevice; key?: string } // no key = Reset to Auto
  | { op: "setDeviceComposition"; pageId: PageId; device: OverrideDevice; composition: DeviceComposition | null }
  | { op: "setA11y" | "setVisibility" | "setLocked"; id: NodeId; value: unknown };

export interface Transaction {
  txId: string;                       // client UUID; idempotency key
  origin: "user" | "ai" | "system" | "migration";
  label: string;                      // history label
  ops: Op[];                          // applied atomically, in order
  expect: Record<string, number>;     // node id / page id → expected version (§8)
}
```

**Invariants (validated in the core AND in the database function)**
- Tree: acyclic; `parentId` on the same page; the parent type allows the child type; root nodes have `parentId = null`.
- Identity: ids are UUID v4 generated by the client (inserts) or reused only by `restoreSubtree` for ids removed in
  this document; ids never change on move/reorder/reparent/device edits; `duplicate` = `insertSubtree` with new ids.
- Ordering: `(parentId, orderKey)` unique among siblings; tie-break `(orderKey, id)` for read determinism.
- Props: every `setProp`/`setOverride` validates the resulting node against the type (`reject-unknown` for primitives;
  3B boundary for legacy sections); `setOverride` only for `overridable` descriptors.
- Authorization: every transaction runs as the session user (owner) or an authorized team/support path; never anon.
- Versioning: every existing node/page touched must match `expect`; each touched row's version increments by 1.
- Auditability: each committed transaction writes one journal row (§14). Rejected transactions are telemetry only.
- Invertibility: the client computes inverse ops from the confirmed pre-state:
  `insertNode↔removeNode`, `removeNode↔restoreSubtree`, `moveNode↔moveNode(old)`, `setProp↔setProp(old)|unsetProp`,
  `setOverride↔setOverride(old)|clearOverride(key)`, `clearOverride↔setOverride(old values)`,
  `setDeviceComposition↔setDeviceComposition(old)`.

AI/Yande (3I) will submit `Transaction`s with `origin: "ai"` through the same server authority — never direct writes.

---

## 5. Responsive inheritance algorithm (D4 — exact 3B contract)

```ts
function resolveProp(node, device, key) {
  if (device === "desktop") return node.props[key];
  const o = node.overrides[device]?.[key];
  return o !== undefined ? o : node.props[key];   // Tablet and Phone each fall back to DESKTOP, never to each other
}
```
- Per-key replacement, **no deep merge** (identical to today's `readDeviceOverride`).
- Only `overridable` keys may be overridden; stored non-overridable override keys are preserved and reported, not applied.
- Root-node order per device: `page.deviceLayout[device].order` (listed ids first in that order, then remaining roots by
  `orderKey`) — identical to `orderSectionsForDevice`. Hidden: `page.deviceLayout[device].hidden` OR node `visibility`.
- Chrome (header/footer) pinned first/last as in 3B `device-composition.ts`.
- Nested children in 3C: base order only (per-device reorder of nested children is 3D); per-device hide via
  `visibility`. Responsive state (`auto/custom/needs-review` + `baseHash`) keeps 3B semantics.

---

## 6. History model

- History entry = `{ txId, label, origin, forward: Op[], inverse: Op[], affected: Set<id>, at }`.
- Undo = submit `inverse` as a new transaction (`expect` = current confirmed versions); Redo = re-submit `forward`.
- Coalescing: consecutive `setProp`/`setOverride` on the same node+key within 750 ms merge into one entry.
- Caps: 200 entries or ~5 MB (oldest dropped). Session-scoped in 3C; the journal (§14) makes durable history possible later.
- Conflicts: if an Undo's affected versions changed elsewhere → explicit "can't undo: changed elsewhere", no overwrite.
- Deterministic reload: reloading reconstructs the identical document from rows (+ migrations), independent of history.
- **Coexistence with 3B:** projects with `document_schema_version IS NULL` keep today's snapshot history + save
  coordinator + batch RPC unchanged. The operation path is enabled per project (flag) only after slice gates pass.

---

## 7. Persistence / storage schema (D1a — evolve `project_sections`)

Additive migration (no rewrite of existing rows' props):
```sql
alter table public.project_sections
  add column if not exists parent_id    uuid null references public.project_sections(id) on delete cascade,
  add column if not exists order_key    text collate "C",
  add column if not exists node_version bigint  not null default 1,
  add column if not exists type_version integer not null default 1;
-- backfill order_key for existing rows from sort_order (per page, dense, evenly spaced keys); then:
alter table public.project_sections alter column order_key set not null;
create unique index if not exists project_sections_sibling_order_uidx
  on public.project_sections (page_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'), order_key);
create index if not exists project_sections_parent_idx on public.project_sections (parent_id);
-- section_type allow-list (existing CHECK) extended with: 'section','group','text','image'
alter table public.project_pages add column if not exists layout_version bigint not null default 1;
alter table public.projects      add column if not exists document_schema_version text null; -- null = 3B path; 'kcd-1' = opted in
alter table public.deployments   add column if not exists schema_version text not null default 'website-v1',
                                 add column if not exists content_hash   text null;
create table public.creative_op_journal (...);  -- §14
```
- **Storage shape of props is unchanged** for legacy sections (`props` + reserved `deviceOverrides`, `_motion`, …) so every
  3B route keeps working. Pilot node types store the same shape (base props + `deviceOverrides` + reserved keys) so one
  storage convention exists; the core adapter lifts reserved keys into `KcdNode` fields (as `editor-definition.ts` does).
- `sort_order` retained for compatibility: `apply_node_ops` maintains a dense `sort_order` for root nodes while legacy
  readers exist; legacy readers are restricted to root nodes (`parent_id is null`) in slice 4.
- **Fractional order keys:** base-62 variable-length keys (`keyBetween(a, b)`), deterministic. Append = key after last
  sibling. **Rebalance** when any sibling key exceeds 24 chars or a parent exceeds 1,000 children: the database function
  reassigns evenly spaced keys to that parent's children **inside the same transaction**, bumps their `node_version`,
  and returns them so clients refresh. Rebalancing never changes relative order or identity.
- **Subtree operations are transactional:** one `apply_node_ops(project_id, tx jsonb)` SECURITY DEFINER function applies
  the whole transaction or nothing (subtree insert/restore/remove/move included). Ordinary edits touch only the
  affected rows (never rewrite a page).

---

## 8. Concurrency / version model
- `node_version` per node, `layout_version` per page. Transactions carry `expect`.
- `apply_node_ops` locks the affected rows `FOR UPDATE` in ascending id order (deadlock-free), plus the parents of moved/
  inserted nodes and the page row for composition changes; compares versions; on mismatch raises
  `KCD_CONFLICT` → HTTP **409** `{ conflicts: [{ id, expected, actual }] }`. No last-write-wins.
- Idempotency: `txId` unique in the journal; a replayed committed `txId` returns the original result (offline queue safe).
- Client: the 3B save coordinator generalizes to per-node slots + transaction barriers (same semantics as `exclusive`);
  prop edits coalesce per node; structural transactions are barriers. 3C assumes single active editor per document;
  conflicts are surfaced (reload prompt). Realtime multi-user merge is a non-goal.

---

## 9. Schema / version migration model
- Document: `schemaVersion` (`kcd-1`); inputs of `website-v1` (definitions, templates, AI output, old snapshots) and 3B
  rows pass through the deterministic adapter chain `website-v1 → kcd-1`.
- Node types: `typeVersion` + ordered pure migrations `n → n+1`; applied on read in memory; idempotent at the target
  version; persisted lazily on the node's next write (`type_version` updated). Stored rows are never bulk-rewritten.
- Unknown fields are preserved (`unknown` bags), never stripped by the core. Legacy-section writes keep the 3B boundary
  (which strips unknown keys by design) — recorded as migration debt, no worse than today.
- Fixtures: every template, all Gate 2 fixtures, owner-portfolio sites, T1/O6 legacy shapes, malformed/stale documents.
- Published snapshots are never migrated in storage; the renderer handles the compatibility window at render time.

---

## 10. Legacy adapter boundaries (`lib/create/kcd-adapter/`)
- `rowsToDocument(project, pages, rows) → KcdDocument` — replaces the internals of `buildDefinitionFromProjectParts`
  (lift reserved keys; chrome → header/footer root nodes; `device_layouts` → `page.deviceLayout`).
- `websiteV1ToDocument(def) → KcdDocument` — templates, AI generation, old snapshots.
- `opToRowWrites(op, doc)` — persistence mapping (legacy nodes re-packed in the exact 3B props shape).
- `documentToWebsiteV1(doc)` — **temporary** bridge for code not yet migrated (AI improve, portfolio sync); legacy-only
  documents only; refuses documents containing primitive nodes (explicit error).

---

## 11. Publish snapshot contract (D2)
```ts
interface PublishedSnapshotKcd {
  format: "kcd-1";
  document: KcdDocument;          // unresolved: base + overrides; the renderer resolves per breakpoint
  rendererRequirement: { renderer: "web-dom"; minVersion: number };
  contentHash: string;            // sha256 of canonical JSON
  publishedAt: string;
}
```
- Publishing runs one transactional database function: read rows at a consistent snapshot → preflight (capabilities,
  unsupported nodes, validation) → insert an immutable `deployments` row (`schema_version = 'kcd-1'`, `content_hash`) →
  flip the live pointer (supersede previous) → append `website_versions`. A trigger forbids updating `definition` /
  `schema_version` / `content_hash` after insert (status changes only).
- Live rendering switches on `schema_version`: `kcd-1` → kcd web renderer; `website-v1` → today's `SiteRenderer` path.
  **Compatibility window:** both supported through 3J; ending it requires an explicit decision + republish plan.
- Editor schema evolution never touches existing snapshots.

---

## 12. Renderer boundary
- Core exports pure functions only: `resolveProp`, `resolveNode(node, device)`, `rootOrder(page, device)`,
  `children(doc, id)`, `isVisible(node, page, device)`, `validate`, `negotiate(manifest)`.
- Web renderer (`app/components/create/kcd/`): walks nodes; pilot primitives rendered by new components; every
  `legacy-section:<type>` delegates to `renderLegacySection(type, props, ctx)` — a **mechanical extraction** of today's
  `site-renderer.tsx` switch (no behavior change, proven byte-identical HTML on the corpus).
- Same single-DOM responsive strategy as 3B (CSS order/visibility per breakpoint; DOM = screen reader = Tab order).
- Editor, preview (iframe) and live all use the same renderer on the same `KcdDocument` semantics.

---

## 13. Builder / Studio shared-core boundary
- `lib/creative-core` imports **only** `zod` (+ pure utilities). No React, Next.js, Supabase, DOM, `lib/create`.
  Enforced by an import-boundary test.
- Builder-specific: adapters (`lib/create/kcd-adapter`), persistence API, web renderer, inspector UI.
- Studio (after 3J): `canvas-document` v2 maps to `kind: "design"` — pages → artboards, layers → nodes with
  `layout.positioned`, `groupId` → `group` nodes. Studio renderers (canvas/export) implement `RendererManifest`.

---

## 14. Security / RLS
- Direct-table RLS policies unchanged (owner via page → project). New columns inherit them.
- All node/structure writes on the kcd path go through `apply_node_ops` (SECURITY DEFINER, `search_path` pinned) with the
  proven guard: `auth.uid()` must own the project, or `auth.uid() IS NULL` (service role behind server-side team/support
  authorization); **no `anon` EXECUTE** (same revoke discipline as `20260925012420`).
- Inside the function: every node, parent and page must belong to `p_project_id` (no cross-tenant parenting); payload
  limits (≤ 500 ops/tx, ≤ 256 KB props per node, ≤ 2 MB per tx).
- `creative_op_journal` — **minimal** (approval confirmation 3). Records: tx/idempotency id; project / document identity;
  actor and authorized execution path (owner session, service role behind team/support authorization); op types and
  count; expected and resulting versions; result (`committed` / `rejected` / `conflicted`); timestamp; small diagnostic
  metadata (error code, conflicting ids). **Never** whole documents, prop values, large payloads, sensitive content or
  secrets. RLS owner select; insert only by the function; no update/delete. Rejected/conflicted rows are written only for
  authenticated, authorized callers (malformed/unauthenticated requests stay telemetry, never audit rows).
- Unsafe-content checks (`containsUnsafeSiteContent`) apply to every prop write, as in 3B. AI never writes directly.

---

## 15. Performance — baselines first, then evidence-backed budgets (approval confirmation 4)

Measured at **100 / 500 / 2,000 nodes**: normalize/load, canonical serialization, operation application (validate +
apply), history/inversion, responsive resolution (all nodes, one device), and — from S3/S5 — server render and Builder
edit → canvas update. `apply_node_ops` latency is measured in S4 (QA).

- **S1/S2 establish baselines** (median of repeated runs, recorded in the slice evidence). Budgets are set **afterwards**
  from those baselines, with headroom for machine variance and fixed costs — not invented up front.
- **No brittle ratio rule.** Growth is judged on the curve: a **clearly quadratic** curve (time growing ~with n² across
  100 → 500 → 2,000) is a **blocker**; near-linear growth with fixed overhead is acceptable.
- Single-node edits must not re-validate, re-render or re-serialize the whole document (React memo keyed by
  `id + version` in the renderer).

---

## 16. Failure / recovery behavior
| Failure | Behavior |
|---|---|
| Validation / capability rejection | Transaction rejected (400); optimistic local change rolled back via inverse; visible error |
| Version conflict | 409 with conflicting ids; local state keeps user's view; "reload to continue" |
| Network / offline | Transaction queued (existing offline queue, one item per tx); replay is idempotent via `txId` |
| Partial failure | Impossible — single database transaction |
| Unknown node type / failed migration | `UnsupportedNode` placeholder with preserved raw data + error; publish blocked |
| Renderer error for a node | Editor error boundary placeholder; publish preflight blocks |
| Publish preflight failure | Publish blocked with the list of unsupported nodes/capabilities |
| Rebalance | Automatic inside the triggering transaction; clients refresh returned keys |

---

## 17. Slice plan (dependency order)
- **S1 — Core library:** model, registry, capability negotiation, responsive resolution, fractional keys, migration
  framework, op validation + inversion (pure), perf harness. No app wiring.
- **S2 — Legacy adapter (read):** rows / website-v1 → kcd; lossless round trip on the full corpus.
- **S3 — Web renderer boundary:** kcd web renderer + `renderLegacySection` extraction; editor/preview/live can render via
  kcd behind a per-project flag; byte-identical HTML vs today.
- **S4 — Storage + authority:** additive migration (QA only), `apply_node_ops`, journal, deployments immutability trigger,
  legacy readers restricted to root nodes; QA DB suites.
- **S5 — Operations + history in the Builder:** edits emit transactions; per-node coordinator; operation Undo/Redo;
  flag on only after all 3B gates pass on the kcd path.
- **S6 — Primitive pilot:** `section`/`group`/`text`/`image` end-to-end (flow layout, nesting, responsive overrides, a11y);
  capability-driven, labelled inspector (O7 pattern).

- **S7 — kcd-1 publishing:** transactional publish, preflight, compatibility window, live switch on `schema_version`.
- **S8 — 3C gate:** full regression, perf budgets, QA baseline, human visual review of the pilot UI, closure record,
  and the **decision whether KCD becomes the default for NEW projects** (approval confirmation 1).

**2026-10-03 continuation authorization:** the user deferred credential-dependent
S5 QA and authorized continued development while away from their computer.
S6 may proceed as development; S5 sign-off and all required final checks remain
open. See `docs/decisions/3C-S6-development-with-deferred-QA.md`. This exception
does not authorize release or count skipped checks as passed.

---

## 18. Test gates per slice
| Slice | Gates (all must pass; mutation-checked where applicable) |
|---|---|
| S1 | Serialization round trip; stable ids through move/reparent/override; duplicate creates new ids; fractional keys (between/append/rebalance, determinism, 10k random ops); responsive resolution == `readDeviceOverride` on every 3B fixture; op inversion property tests (apply∘inverse = identity); migration chain + idempotence; unknown-field preservation; malformed/stale rejection; import-boundary test; perf baselines at 100/500/2,000 + no quadratic curve |
| S2 | Lossless rows → kcd → rows and website-v1 → kcd → website-v1 on all templates (126), Gate 2 fixtures, owner sites, T1/O6 legacy shapes; extensions and overrides preserved; normalization idempotent |
| S3 | Byte-identical HTML (kcd renderer vs SiteRenderer) for every corpus site at desktop/tablet/phone editDevice; Gate 2 A–Z, DOM/focus, console/fonts, Hero on the kcd path |
| S4 | QA DB suites: RLS, cross-tenant parenting rejected, anon no EXECUTE, conflicts (409), idempotent replay, transactional subtree ops, rebalance, deployments immutability trigger, journal RLS; existing 3B DB suites unchanged |
| S5 | Gate 2 save ordering, B1, O5, Hero, O6 green on the kcd path; operation Undo/Redo → reload → publish; history coalescing; conflict surfaced; perf at 500/2,000 nodes |
| S6 | Nesting persistence + reload + publish; per-device overrides on children; a11y preserved to live DOM; every inspector control labelled (automated); unsupported capability surfaced; browser suite at 1440/768/390 |
| S7 | kcd-1 publish immutable + hashed; old website-v1 deployments render unchanged; preview = publish = live parity; preflight blocks unsupported content |
| S8 | `npm run ci` (Node 20), all Gate 2 suites, QA DB suites, R1 production build, perf budgets, QA baseline before = after, human visual sign-off of pilot UI, KCD-default-for-new-projects decision |

---

## 19. Rollback / compatibility strategy
- All schema changes additive; existing props untouched; `sort_order` maintained for roots.
- Per-project opt-in (`projects.document_schema_version`); `NULL` = exact 3B behavior (snapshot history, website-v1
  publish). Turning a project back to `NULL` is allowed only if it contains no primitive nodes (checked); otherwise the
  legacy path renders them as explicit placeholders — never silently dropped.
- Published website-v1 snapshots keep rendering indefinitely during the window.
- Each slice ships behind the flag; the 3B Gate 2 suites are a non-regression contract on both paths.

---

## 20. Explicit non-goals for 3C
Free positioning, drag/resize, snapping, z-order UI, layers panel (3D) · per-device reorder of nested children (3D) ·
Phone→Tablet inheritance (3D, explicit design only) · motion engine (3E) · masks, video primitives, rich text runs,
effects (3F) · decomposing Hero / editorial / commerce / owner-portfolio sections (3F/3G/3J) · Brand/Taste/Motion DNA (3H) ·
AI/Yande generation on the new ops (3I) · realtime multi-user merge · durable cross-session Undo UI · Studio migration ·
production deploys/migrations · Commerce/Jobs · removing website-v1 support.

---

## Trace: existing website-v1 site through the new core

```
[stored 3B rows]  projects + project_pages(device_layouts) + project_sections(props incl. deviceOverrides, _motion, …)
      │  S2 rowsToDocument (lift reserved keys; chrome → nodes; device_layouts → page.deviceLayout)
      ▼
[KcdDocument kcd-1]  pages → root nodes "legacy-section:hero", "legacy-section:faq", … (same ids, props, overrides)
      │  S5 edit through operations: setProp(hero.heading) / setOverride(hero, mobile, align) / moveNode(...)
      ▼
[Transaction]  validated by registry (legacy nodes: 3B boundary semantics) → coordinator → apply_node_ops (S4)
      │  rows updated in place: props (same 3B shape), node_version+1, order_key; journal row appended
      ▼
[reload]  rows → rowsToDocument → identical KcdDocument (deterministic)
      ▼
[preview]  Builder canvas / iframe: kcd web renderer
      │     legacy-section:* → renderLegacySection(...)   ◄── COMPATIBILITY RENDERING (existing section code)
      │     group/text/image → new primitive components
      ▼
[publish]  apply publish function: preflight → immutable deployments row (schema_version 'kcd-1', content_hash)
      ▼
[live]  /sites/[subdomain] reads deployment.schema_version
        'kcd-1'      → kcd web renderer (legacy-section nodes still rendered by the compatibility renderer)
        'website-v1' → today's SiteRenderer (old snapshots, untouched)   ◄── COMPATIBILITY WINDOW
```
Compatibility rendering remains in two places: (1) every `legacy-section:*` node (until 3F/3G/3J replace those sections
with real primitives — tracked migration debt), and (2) every existing `website-v1` published snapshot.

## Legacy wrappers tracked as migration debt
All 41 section types start as `legacy-section:*`. Target phases: Hero/editorial/gallery/media-heavy → 3F/3G;
motion-bearing (marquee, countdown, floating CTA) → 3E; commerce (products, reviews, joko) → product/commerce integration;
owner-portfolio (`maylecor-*`, `kdirection-*`, `legally-blonde-hero`) → 3J (rebuilt from ordinary primitives).

**Compatibility debt — legacy unknown-key stripping:** legacy-section writes keep the 3B `sectionPropsForSave` boundary,
which strips keys unknown to the section's schema. The core itself never strips (`unknown` bags); the stripping happens
only at the legacy write boundary, exactly as in 3B. Retired when each section type is replaced by native primitives.

---

## 21. Slice progress

### S1 — Core library · COMPLETE (2026-09-29)

No app wiring; nothing imports `lib/creative-core` outside its tests. 3B behavior is untouched.

**Delivered (`lib/creative-core/`, imports only `zod`):**
`model.ts` (types, identity, reserved keys) · `order-keys.ts` (base-62 fractional keys, evenly spaced rebalance keys) ·
`schemas.ts` (a11y / visibility / composition / responsive-state, 3B constraints mirrored) · `document.ts` (canonical JSON,
parse / serialize, structure check) · `registry.ts` (capabilities, definitions, negotiation, publish preflight) ·
`primitives.ts` (pilot `section` / `group` / `text` / `image`) · `migrate.ts` · `tree.ts` · `responsive.ts` · `ops.ts`
(op vocabulary, `applyTransaction`, inversion, versions, limits, rebalance, `duplicateSubtreeOp`) · `index.ts`.

**Gate evidence (`tests/creative-core/`, 165 tests):**

| Gate (§18) | Suite | Result |
|---|---|---|
| Serialization round trip · unknown-field preservation · malformed/stale rejection | `document.test.ts` | pass (36) |
| Fractional keys: between/append/prepend/bulk/rebalance, determinism, 10k random inserts | `order-keys.test.ts` | pass (11) |
| Responsive resolution == 3B on every template seed × {stored, composer, random} overrides & layouts (`readDeviceOverride`, `mergeDeviceAwareSectionProps`, `orderSectionsForDevice`, `isSectionVisibleOnDevice`) | `responsive-parity.test.ts` | pass (5; >10k key checks) |
| Registry integrity, capability intersection, preflight, override policy, migration chain + idempotence | `registry.test.ts` | pass (24) |
| Op invariants, stable ids through move/reparent/override, duplicate = new ids, atomicity, 409 conflicts, limits, legacy 3B boundary, unsupported nodes, rebalance | `ops.test.ts` | pass (56) |
| apply∘inverse = identity, redo = forward, id stability, invariants — 12 seeds × 60 random multi-op transactions | `ops-property.test.ts` | pass (2) |
| Import boundary (zod + siblings only; no host globals) | `import-boundary.test.ts` | pass (24) |
| Perf baselines 100/500/2,000 + no quadratic curve | `perf.test.ts` | pass (7) |

Mutation-checked: Tablet→Phone fallback, unpinned chrome, ignored `props.hidden` (parity suite); wrong `setOverride`
inverse, root-only restore, missing version bump (ops suites) — each mutation fails the suites; sources restored.
`npm run ci` green (typecheck · lint 0 errors · 1,979 tests · production build) on Node 24.15 — the S8 gate re-runs on Node 20.

**Performance baselines** (median of 7 batches ≥ 4 ms; Apple silicon, Node 24; µs per call):

| Measure | 100 | 500 | 2,000 | growth exponent |
|---|---:|---:|---:|---:|
| load (parse + validate) | 1,862 | 5,263 | 21,936 | 0.82 |
| canonical serialization | 891 | 5,646 | 21,818 | 1.07 |
| apply setProp (1 node) | 65 | 242 | 965 | 0.90 |
| apply moveNode (structural) | 124 | 845 | 3,529 | 1.12 |
| remove subtree + undo | 732 | 1,052 | 4,019 | 0.57 |
| responsive resolution (all nodes, phone) | 278 | 1,001 | 4,520 | 0.93 |

All near-linear; none quadratic. Finding: the linear term of a single-node edit is the immutable copy of the
`nodes: Record` map (~0.5–1 ms at 2,000 nodes, measured). No validation, serialization or rendering of the whole document
happens on a single edit. Budgets are set from these numbers in S5 (with the 750 ms keystroke coalescing).

**Interpretations within the freeze (recorded, not silent):**
1. `NodeA11y` additionally carries 3B `_a11y` fields `landmark`, `skipTarget`, `liveRegion` (same rules as
   `sectionA11ySchema`) so legacy sections lift losslessly. `KcdPage` gained an `unknown` bag (page-level preservation).
2. `NodeTypeDefinition` gained `placement: "root" | "any" | "nested"` (legacy sections and `section` are root-only;
   `group`/`text`/`image` nested) and `validateWrite(node)` — the adapter injects the 3B `sectionPropsForSave` boundary
   because the core cannot import `lib/create`. The core accepts/rejects only; it never adopts the boundary's stripped
   output (stripping stays at the persistence boundary, as recorded in the compatibility debt).
3. `insertSubtree` takes placed nodes (`Omit<KcdNode, "version">`), parents first.
4. `restoreSubtree` writes version = recorded + 1, so versions only ever increase and stale clients conflict.
5. Rebalance triggers on key length > 24 only. A child-count trigger (> 1,000) would rewrite every sibling on each insert
   into such a parent; child counts are instead bounded by `children.max` (pilot containers: 50).
6. Sibling-key uniqueness is checked when the transaction completes, so swaps may pass through transient collisions.
   S4 must match this (deferrable uniqueness or end-of-function check).
7. Override application: legacy sections apply every stored override key (exact 3B render semantics); native
   primitives apply only overridable keys, and `inertOverrideKeys` reports the rest.
8. Chrome pinning is a parameter (`RootOrderOptions.pinnedFirst/Last`); chrome ids are not UUIDs — S2 decides their
   node representation.
9. The unsafe-content check is injected (`ApplyOptions.isUnsafeContent` ← `containsUnsafeSiteContent`); one source of truth.
10. Device-composition writes keep 3B tolerance (ids that are not current roots are ignored at resolution) and 3B bounds
    (40 ids per list).
11. A transaction of no-ops returns an empty inverse; S5 history records no entry for it.
12. Pilot primitive prop schemas are defined now (needed for the registry/op gates); S6 may refine them before any data
    exists.

**Open items handed to later slices:**
- **S5 decision needed — responsive state on device edits.** 3B marks a section `custom` with a `baseHash` (FNV of the
  schema-normalized base props) on every device-scoped edit (`deviceScopedPatch` → `markResponsiveCustom`). The frozen op
  vocabulary has no op that writes `responsiveState`, and the database cannot compute the zod-normalized hash. S5 needs
  either a `setResponsiveState` op or a `responsiveState` field on `setOverride`/`clearOverride`. Not needed for S2–S4.
- S2: `website-v1` section ids are not UUIDs (`"hero-1"`, chrome ids) — the adapter must mint/map ids deterministically;
  move the test-only legacy registry (`tests/creative-core/helpers.ts`) into `lib/create/kcd-adapter`.
- S4: `restoreSubtree` "ids removed in this document" is enforced by the database (journal/tombstones); the pure core
  can only check the id is absent.
- Migrations transform base props only (frozen signature). All types are v1 today; a future migration renaming an
  overridable key needs an override-migration hook.

### S2 — Legacy adapter · COMPLETE (2026-09-29)

No app wiring; nothing outside `tests/` imports `lib/create/kcd-adapter`. 3B behavior is untouched (the only 3B source
change is `export` on `deviceOverridesSchema` in `website-schema.ts`).

**Delivered (`lib/create/kcd-adapter/`):**
`rows.ts` (`rowsToDocument` / `documentToRows`) · `website-v1.ts` (`websiteV1ToDocument` / `documentToWebsiteV1`, the
temporary legacy-only bridge) · `stored-props.ts` (reserved-key lift / repack) · `sections.ts` (one section ⇄ one node,
rows and website-v1 forms) · `legacy.ts` (preserved originals, theme ⇄ tokens, device layouts, sort orders) ·
`chrome.ts` (site chrome projection, pinning, suppression, write-back) · `ids.ts` (UUID v5, pure SHA-1) ·
`legacy-registry.ts` (the production `legacy-section:*` registry, moved from the S1 test helpers; `builderRegistry`) ·
`errors.ts` · `index.ts`.

**Gate evidence (`tests/creative-core/`, 1,594 tests in the creative-core suites; 3,413 in `npm run ci`):**

| Gate (§18) | Suite | Result |
|---|---|---|
| rows → kcd → rows byte-identical (canonical JSON; rows compared as a set) on 126 templates × {schema-normalized, raw legacy props + extensions, seeded adversarial mutation}, Gate 2 seed (+ mutated), empty project — 381 cases | `adapter-roundtrip.test.ts` | pass |
| website-v1 → kcd → website-v1 byte-identical on 126 templates + 126 seeded variants (foreign keys, odd ids, invalid extensions, layouts) — 252 cases | `adapter-roundtrip.test.ts` | pass |
| Normalization idempotent (kcd → rows/v1 → kcd identical), deterministic (twice → identical), valid (`parseDocument`), preflight clean with `builderRegistry` | `adapter-roundtrip.test.ts` | pass |
| Owner sites (May Lecor, K-Direction, DkLNS, Ndaoan, RECT, Mayjor Good) and T1 (≥ 39 legacy Heroes) / O6 (≥ 37 editorial heroes) stored shapes in the corpus | `adapter-roundtrip.test.ts` | pass |
| 3B parity: kcd → website-v1 pages == `buildDefinitionFromProjectParts`; per-device composition (chrome pinned, stripped nav/footer rows, layouts, visibility) == 3B editor composition (`buildEditorPreviewDefinition` → `composeSectionsForDevice`) on every page × device — 760 cases | `adapter-roundtrip.test.ts` | pass |
| Extensions and overrides lifted with their stored values; values that cannot take effect reported, not dropped | `adapter-roundtrip.test.ts`, `adapter-shapes.test.ts` | pass |
| Each odd stored shape, edits written from the model, Undo restores stored originals, chrome projection/write-back/refusals, deterministic ids (SHA-1 FIPS vectors, RFC 4122 v5 vector), input never mutated, explicit refusals | `adapter-shapes.test.ts` | pass (28) |
| Model schemas == 3B schemas (combinatorial: a11y, visibility, responsive state, device composition) | `schema-parity.test.ts` | pass (4) |
| Perf baselines 100/500/2,000 sections + no quadratic curve | `adapter-perf.test.ts` | pass (4) |

Mutation-checked (each fails the suites; sources restored): theme shadow dropped · sort orders always dense · chrome ids not
mapped back · shadow resurrecting stale content · `_motion: null` lifted · ordered+hidden id kept in order · ties ordered by
id · embedded-nav rule ignored · `baseHash` bound 64. Two of these initially survived (chrome back-mapping, id-ordered ties)
and exposed test gaps, closed with targeted tests. `npm run ci` green on Node 24.15 (S8 re-runs on Node 20).

**Performance baselines** (median; Apple silicon, Node 24; µs per call; 40-section pages with chrome, overrides, layouts):

| Measure | 100 | 500 | 2,000 | growth exponent |
|---|---:|---:|---:|---:|
| rows → document (incl. self-check parse) | 11,401 | 52,537 | 202,028 | 0.96 |
| document → rows | 1,454 | 5,369 | 21,687 | 0.90 |
| website-v1 → document | 9,999 | 50,997 | 215,367 | 1.02 |
| document → website-v1 | 1,189 | 4,818 | 19,596 | 0.94 |

All linear. The largest real site (May Lecor owner site, 48 sections, 30 KB) converts in ~6.7 ms, of which ~40% is the
self-check that re-parses the produced document (kept: the adapter never returns an invalid document). Budgets set in S5.

**Interpretations within the freeze (recorded, not silent):**
1. **Lossless by preserved originals.** Stored data the model cannot hold exactly (e.g. `deviceOverrides: {}`/`null`,
   `_motion: null`, an invalid `_a11y`, a malformed device layout, a non-scalar theme entry, foreign website-v1 keys,
   non-dense `sort_order`) is kept verbatim in `unknown.legacy` (node/page) or `meta.legacy` (document). Write-back rule:
   if re-lifting the original gives exactly the model's current content, the original is written; otherwise the model's
   content is written canonically. Unchanged documents round-trip byte-for-byte; a preserved original can never resurrect
   stale content (mutation-checked); Undo back to the original content writes the original again.
2. **Values that never took effect are dropped on edit, as in 3B.** When an edited node had a stored value the model
   could not apply (reported as a `LiftIssue` at load), it is written canonically without it — 3B's save boundary drops
   the same values (`sectionPropsForSave`). The KCD path is more lenient in one case: 3B rejects the whole save when a
   device bucket is not an object; the canonical form simply omits it.
3. **Extensions are lifted as the model schema parses them** (e.g. trimmed labels), or as 3B normalizes them when only
   3B's stripping of unknown keys makes them valid — so stored data 3B accepts is never refused by the stricter model.
4. **Ids.** Row ids are node/page ids. website-v1: UUID section ids kept; others minted as UUID v5 of (document id,
   legacy id) and remembered; id-less sections minted from (page slug, position) and written back without an id; page ids
   minted from the slug.
5. **Site chrome = per-page projected root nodes** (freeze §10): one `legacy-section:navigation`/`footer` copy per page,
   deterministic id, pinned first/last (`chromeRootOptions`), synthetic `kebu-chrome-*` ids in device layouts mapped to
   them. `projects.site_chrome` stays the single stored source; copies must agree on write-back (disagreeing or missing
   copies are refused: `chrome-diverged` / `chrome-missing`). When chrome applies, stored navigation/footer rows are kept
   but not rendered (`chromeSuppressedIds`), as `stripChromeSections` does. Applicability follows the **editor**
   (`buildEditorPreviewDefinition`): enabled, has header/footer, no embedded-nav flagship section.
6. **Device layouts** are read 3B-tolerantly (non-string, empty, duplicate, unmappable ids ignored; ordered+hidden → hidden)
   — render-equivalent; more than 40 live ids is refused (`unrepresentable-layout`), never truncated.
7. Rows order: `sort_order`, ties in input order (3B's stable sort); rows are compared as a set.
8. `documentToWebsiteV1` excludes projected chrome copies (chrome is project-level, as in `buildDefinitionFromProjectParts`)
   and refuses primitive or nested nodes. It returns stored theme/SEO; 3B's render-time resolution (`resolveEditorTheme`,
   `mergeSiteSeo`) stays where 3B does it.
9. `opToRowWrites` (freeze §10) is persistence mapping and moves to **S4** with the storage columns; `documentToRows` is
   its whole-document reference (every S4 row write must agree with it).

**S1 repair made in S2 (root cause → fix → regression test):** `schemas.ts` claimed its 3B constraints were verified by
`tests/creative-core/parity.test.ts`, which did not exist. Writing it found one drift: `responsiveState.baseHash` allowed
64 characters where 3B allows 32. Fixed to 32; `schema-parity.test.ts` now verifies all four leaf schemas against 3B
(mutation-checked). The strict-vs-strip difference is documented and handled by interpretation 3.

**Open items handed to later slices:**
- **S3 — three 3B render paths disagree on chrome.** Editor canvas: chrome unless embedded nav. Preview page
  (`/create/[id]/preview`): `buildDefinitionFromProjectParts` — no chrome. Publish (`buildSnapshotFromDb`): applies stored
  chrome without the embedded-nav check, and bootstraps (writes) chrome when absent. S3's byte-identity proof must state
  which path each comparison targets; the adapter follows the editor. Unifying them is a product-visible change and needs
  an explicit decision (not taken in S2).
- S3: `chromeSuppressedIds` and `chromeRootOptions` are the renderer's inputs for chrome; invalid stored extensions reported
  as `LiftIssue`s do not render through the model (3B passes some of them to its renderer) — S3 must compare on the corpus
  and surface any visible difference.
- S4: `opToRowWrites`; `node_version`/`order_key`/`parent_id` columns replace the adapter's version 1 / derived keys / roots.
- S5: the responsive-state op decision from S1 is still open.

### S3 — Renderer boundary + site-chrome convergence · COMPLETE (2026-09-29)

**Characterization first** (`docs/product/3C-S3-SITE-CHROME-CHARACTERIZATION.md`, read-only): Editor, standalone Preview
and Published/Live compared on all 126 templates × every page × Desktop/Tablet/Phone. Editor = Published everywhere;
standalone Preview ≠ Editor on 122/126 (it ignores site chrome — an accident); the only Editor ≠ Published state is
enabled stored chrome on an embedded-navigation flagship site, reachable through the Shop Pages panel and the section
routes (3B side doors). No product decision was needed to converge: the canonical rule is the Editor's, and the one case
that would change a live site is reported and blocked instead of chosen (below). **Finding:** 3B's go-live refuses every
multi-page site that uses site chrome (`Duplicate section id: kebu-chrome-header`) — a defect in the frozen 3B release,
reproduced with the real `goLiveWebsiteProject`; not changed by S3 (needs a separately approved 3B fix).

**Delivered:**
- **One site-chrome semantic** (`lib/create/kcd-adapter/chrome.ts`): source of truth = `document.meta.siteChrome`
  (stored verbatim, the only copy); applies = enabled ∧ header/footer ∧ no embedded-navigation flagship; page projection
  = pure render-time function (header first, footer last, synthetic ids, stored navigation/footer suppressed);
  `composeKcdPage` is the canonical page composition. **Revises S2 interpretation 5** (per-page stored chrome node copies
  removed — they were editable duplicates guarded only at write-back); freeze §10's "chrome → header/footer root nodes"
  now means render-time root projections, not stored nodes.
- **Conflict** (enabled chrome + embedded navigation): `site_chrome` issue from `rowsToDocument`,
  `canonicalSiteChrome(doc).conflict`; renders the canonical (Editor) result; S7 must block kcd-1 publication until an
  owner decision resolves the stored state.
- **Renderer boundary** (`render-view.ts`): `kcdRenderDefinition(doc)` — the one function Editor, Preview and kcd-1
  Published/Live consume; legacy sections render through today's `SiteRenderer` from exactly the section 3B gives them;
  `WEB_DOM_MANIFEST` (legacy types; `interaction`/`dataBinding` not rendered — preflight surfaces them); primitives refused
  explicitly until S6. website-v1 snapshots keep rendering through `SiteRenderer` unchanged (compatibility renderer).
- **Builder wiring behind a QA-only flag** (`lib/create/kcd-render-flag.ts`: `KEBU_KCD_RENDER=all|ids`; never on a
  production deployment or the production database): `GET /api/projects/[id]` adds `renderPath`; the Editor canvas
  (desktop inline and tablet/phone iframe) and the standalone Preview page use `builderKcdView` — failures shown, never a
  silent fallback. Flag unset = exact 3B behavior.
- **Key order preserved** in memory (core `parseDocument` and the adapter copy validate canonically but keep input key
  order; only serialization is canonical): renderers serialize values into markup (motion specs), so sorted in-memory keys
  changed bytes — found by the byte-identity gate.

**Gate evidence (§18):**

| Gate | Suite | Result |
|---|---|---|
| Byte-identical HTML, Editor/Preview: every page × editDevice Desktop/Tablet/Phone vs `SiteRenderer(buildEditorPreviewDefinition)` — 380 corpus sites (126 templates normalized/raw/mutated, Gate 2) | `render-parity.test.ts` | pass |
| Byte-identical HTML, Published/Live: every page vs `SiteRenderer` on 3B's published snapshot (composition → schema parse, as go-live and the live loader) — all 126 templates as stored + every other schema-valid snapshot (258 sites; 231 of them 3B's go-live refuses, see finding) | `render-parity.test.ts` | pass |
| Site chrome == 3B Editor on every page × device (empty pages, multi-page, missing/disabled/garbage chrome, layouts hiding chrome ids, owner/template fixtures, conflict state on all 4 embedded-navigation templates) | `site-chrome-parity.test.ts` | pass (846) |
| Site chrome == 3B Publish except the reported conflict, where they differ only by the chrome; Editor/Preview/kcd-1 consume one representation | `site-chrome-parity.test.ts` | pass |
| One source, projection not stored and not an op target, source edit reaches every page, missing and conflict cases | `adapter-shapes.test.ts` | pass |
| Builder view = 3B canvas markup for every owner site; flag guard (never production); failures surfaced | `builder-render-path.test.ts` | pass (11) |
| Running app on the KCD path (local, QA): API reports `kcd`; canvas chrome first/last, stored nav suppressed; standalone Preview = Editor; zero console errors | `phase3c-kcd-path.gate2.e2e.ts` | 4/4 |
| Gate 2 A–Z (Builder), DOM/focus (responsive), console/fonts, Hero — with `KEBU_KCD_RENDER=all` | `phase3b-*.gate2.e2e.ts` | 8/8 · 5/5 · 4/4 · 11/11 |
| QA discipline | preflight 14/14; baseline before = after (all 0, storage empty); every spec's cleanup 0 errors | `~/kebu-3c-evidence/s3/` |

`npm run ci` green (typecheck · lint 0 errors, warnings at baseline · all tests · build) on Node 24.15.

**Deviation from the freeze text (recorded):** §12 names a mechanical extraction `renderLegacySection(type, props, ctx)`
out of `site-renderer.tsx`. S3 instead feeds the render view to `SiteRenderer` itself, which *is* today's legacy section
code — byte-identical by construction and proven on the corpus, with no 1,800-line move and no second copy. The extraction
is only needed where native primitives must be interleaved with legacy roots; it moves to **S6**, which introduces them.

**3B code touched (additive, flag-gated):** `GET /api/projects/[id]` returns `renderPath`; the Editor and Preview pages
use `builderKcdView` only when it is `"kcd"`. With `KEBU_KCD_RENDER` unset the behavior is exactly 3B's.

**Open items:**
- **3B go-live defect** (characterization §12) — needs a separately approved 3B fix.
- **Conflict state** (enabled chrome + embedded navigation, e.g. via the Shop Pages panel) — S7 blocks kcd-1 publication;
  the resolution is an owner/product decision per affected project. Whether any production project is in this state is
  unknown (no production access); May Lecor's owner site is the most plausible.
- S5: chrome edits on the KCD path write the one source (today `PATCH /site-chrome`); bootstrap stays an explicit
  load-time write, never a render side effect.
- S7: kcd-1 publish merges catalog products as 3B's publish does (a data merge, not rendering).

### S4 — Storage + database authority · COMPLETE (2026-10-01)

**Decisions taken at the start of S4 (asked and approved 2026-09-30):**
1. **Validation split.** `apply_node_ops` enforces structure and security: authorization, cross-project isolation, tree
   (same page, acyclic), placement and allowed children (from `kcd_node_types`, generated from the TypeScript registry and
   parity-tested), identity rules, versions/409, idempotency, limits, sibling order and rebalance, journal. Node *content*
   (type schemas, the 3B save boundary, unsafe content) is validated by the TypeScript core in the API before the call. An
   owner calling the RPC directly could store schema-invalid props on their own project — the same exposure as today's
   owner RLS table writes.
2. **3B save boundary on the KCD path** (approval confirmation 2) is applied by the API (S5) before the RPC; the database
   stores exactly what it receives.
3. **Storage of fields without a 3B key:** `locked` ↔ `props._locked` (reserved-key convention, added to the core's
   `RESERVED_PROP_KEYS` and the adapter lift/repack); a node carrying a non-empty `unknown` bag is rejected on insert
   (adapter shadows are client-side only — S5 strips `unknown.legacy` before sending).
4. **Ordering vs 3B writers:** a BEFORE INSERT trigger keys every 3B insert after its last sibling (advisory-locked per
   page, so concurrent inserts never collide); `sort_order` stays authoritative for 3B-path projects; `apply_node_ops`
   refuses projects not marked `document_schema_version = 'kcd-1'`; opting in rebases root keys from `sort_order`
   (trigger, any writer); opting out is refused while nested or native elements exist (§19).

**Delivered (`supabase/migrations/20260930010000_kcd_document_storage.sql`, additive):**
- `project_sections.parent_id / order_key (collate "C", backfilled from 3B order, NOT NULL, valid) / node_version /
  type_version`; sibling-key uniqueness `UNIQUE NULLS NOT DISTINCT (page_id, parent_id, order_key) DEFERRABLE`;
  `project_pages.layout_version`; `projects.document_schema_version ∈ {'kcd-1'}`; `deployments.schema_version` (default
  `website-v1`) + `content_hash` with an **immutability trigger** (snapshot / schema_version / content_hash / project_id
  frozen; status changes still allowed).
- **Integrity for every writer (3B routes included):** versions bump on any content/structure change; parent on the same
  page (hence project) and acyclic; nested/native rows only in opted-in projects; placement consistent with the type.
- Section types: the 3B list unchanged + `section`, `group`. Type ⇄ storage: `(section_type, parent_id IS NULL)` —
  `text`/`image` are pilot primitives only when nested (pilot placement rules make this unambiguous). If a future
  primitive may sit at the page root under a 3B type name, storage needs a type prefix (record for S6+).
- `kcd_node_types` (45 rows, generated from `builderRegistry`), `creative_op_journal` (minimal; owner read-only RLS; no
  direct writes; partial unique index on committed `tx_id`; `removed_nodes` = id → version tombstones so Undo restores the
  SAME ids and a removed id is never reused), SQL order-key functions identical to the TypeScript ones.
- `apply_node_ops(project_id, tx)` (SECURITY DEFINER, `search_path` pinned): owner or service role, never anon; project
  row lock (single writer per document, deadlock-free) + addressed rows `FOR UPDATE` in id order; all-or-nothing via a
  subtransaction; returns `{status: committed|rejected|conflicted, …}` and journals every authorized request with a valid
  txId (unauthorized / malformed requests raise and leave no row); committed `txId` replays return the recorded result.
- **3B readers restricted to page roots** (`.is("parent_id", null)`) where they feed editing, rendering or publishing:
  project GET, section routes, batch route, publish snapshot, catalog sync, upgrade routes. The asset-usage scan is
  deliberately **not** restricted (an image used by a nested element must not be deletable). **Release rule: this code
  requires the S4 migration first** (the filter names a new column).
- Adapter: `rowsToDocument`/`documentToRows` read and write the storage columns — opted-in projects take structure from
  `parent_id/order_key/node_version/type_version` (sort_order derived: dense roots, 0 nested; disagreement reported);
  3B-path projects carry versions while `order_key/parent_id` stay database-owned.

**Interpretations (recorded):** byte limits in SQL are backstops on `jsonb::text` (320 KB per node, 2.5 MB per
transaction) — the exact TX_LIMITS are enforced by the TypeScript core before the call; locking is per project (stricter
than per row, matching §8's single active editor); `setA11y`/`setVisibility` values must be objects in SQL (content rules
in TS). Pre-existing 3B drift found: 8 registry section types (`joko`, `countdown`, `trust-badges`, `social-proof`,
`floating-cta`, `before-after`, `hotspot-image`, `reviews`) are not allowed by the 3B database check — unchanged by S4.

**Gate evidence (§18; database suites on disposable databases of the QA cluster, built from the real 3B migrations
under Supabase default privileges; evidence in `~/kebu-3c-evidence/s4/`):**

| Gate | Suite | Result |
|---|---|---|
| Additive migration over existing 3B data (gaps, ties): keys backfilled in 3B order, props untouched; SQL order keys ≡ TS; type rules ≡ registry | `db/kcd-storage.db.test.ts` | pass |
| 3B keeps working: keyless inserts (also 12 concurrent), reorder/batch RPCs, versions follow every writer, layout_version, deployments immutable but status-updatable | `db/kcd-storage.db.test.ts` | pass |
| Structure for every writer: cross-page / cross-project parent refused (owner RLS path included), cycles, placement, unique sibling keys, native/nested only when opted in; opt-in rebase / opt-out refusal | `db/kcd-storage.db.test.ts` | pass (18) |
| RLS / grants: anon no EXECUTE (under Supabase default grants), internals not callable, journal owner-read-only and not writable | `db/kcd-storage.db.test.ts` | pass |
| Authorization (owner / service / stranger / anon / missing / not opted in), **atomic failed transactions**, sibling collision rollback, swaps commit | `db/kcd-apply.db.test.ts` | pass |
| **Stale versions conflict (409 shape)** — incl. after a 3B write; 4-way race → exactly one commit | `db/kcd-apply.db.test.ts` | pass |
| **Idempotency**: replay returns the recorded result; 5 concurrent replays → one apply; foreign txId refused | `db/kcd-apply.db.test.ts` | pass |
| **Cross-project movement rejected** even with attacker-supplied versions; restore never across projects; tombstoned ids never reused; restore = SAME ids at recorded version + 1 | `db/kcd-apply.db.test.ts` | pass |
| **Rebalance inside the transaction preserves ids and order**; dense 3B sort_order of roots; limits (ops, path depth, node/tx size, label) | `db/kcd-apply.db.test.ts` | pass |
| **Journal minimal; committed/rejected/conflicted rows only for authorized callers** | `db/kcd-apply.db.test.ts` | pass (21) |
| apply_node_ops ≡ core `applyTransaction` on 180 random transactions (3 seeds × 60): accept/reject, versions, removed, rebalanced, full document | `db/kcd-parity.db.test.ts` | pass |
| Adapter storage paths (kcd-1 and 3B-path with columns) | `adapter-storage.test.ts` | pass (9) |
| Existing 3B DB suites (authz, anon grants, RLS, concurrency) | `tests/create/builder-*.db.test.ts` | 28 pass, 3 pre-existing `[BLOCKED]` skips |
| Migration applied to the **QA project** (guards, one transaction, recorded in `schema_migrations`, verified grants/RLS/types) | `qa-migration-verify.json` | applied |
| Gate 2 on QA with the migration, **3B path**: Builder A–Z 8/8 · DOM/focus 5/5 · console/fonts 4/4 · Hero 11/11 · undo/redo 6/6 · structure-undo 5/5 · secondary CTA 5/5 · save-ordering 4/4 (×2) | `phase3b-*.gate2.e2e.ts` | pass ¹ |
| Gate 2 on QA with the migration, **KCD path**: KCD-path 4/4 · Builder 8/8 · DOM/focus 5/5 · Hero 11/11 | `phase3c-kcd-path` + `phase3b-*` | pass |
| QA discipline: preflight 14/14; baseline before = after (all 0, journal 0, storage empty); 6 disposable databases orphaned by an aborted mutation batch dropped by exact guarded name; none left | `preflight.txt`, `qa-baseline-*.json` | clean |

¹ save-ordering failed once ("Undo while an autosave is in flight") in the full sequential run and passed 4/4 in two
isolated reruns; S4 does not change how PATCH or the batch RPC write props (triggers only bump versions and check
structure) — recorded as a timing flake of the fixed-wait test; both logs kept.

**Mutation-checked SQL** (each planted defect fails the suites; migration restored): no version check · no project
scoping · no idempotent replay · no tombstone check · double version bump · anon keeps EXECUTE · journal stores the
transaction · rebalance disabled · opt-in without rebase. Two survived at first and exposed weak tests (cross-project
attempts rejected for a missing version; restores rejected for a position clash) — strengthened, then killed.

**Latency baselines** (server-side execution of `apply_node_ops`, median of 9, QA cluster):

| Elements | setProp | moveNode | duplicate 10-element subtree |
|---:|---:|---:|---:|
| 100 | 2.62 ms | 2.53 ms | 7.93 ms |
| 500 | 2.64 ms | 2.65 ms | 9.43 ms |
| 2,000 | 2.81 ms | 2.66 ms | 13.80 ms |

Single-element edits are flat in document size (no whole-document work, §15); budgets are set in S5.

**Open items handed to later slices:**
- **S5:** the API applies the core (content validation, 3B boundary normalization, unsafe content), strips adapter
  `unknown.legacy`, preserves `_locked` through the 3B boundary, maps results to 409; 3B write routes are disabled for
  opted-in projects (3B reorder would change `sort_order` without `order_key`); bootstrap of site chrome remains an
  explicit load-time write; the responsive-state op decision (from S1) is still open.
- **Release rule:** the S4 migration must be applied before this code is deployed (3B readers filter on `parent_id`).
- Unresolved, unchanged by S4: the 3B multi-page + site-chrome go-live defect (needs separate approval); the site-chrome
  conflict-site decision (required before S7).

### S5 — Operations + history in the Builder · IN PROGRESS (2026-10-02)

Development continuation starts at `9ec174b` on `work/3c-continuation`.
The user authorized resolution of the responsive-state architecture item:
`setResponsiveState` is a dedicated, invertible operation, paired atomically
with device edits. See `docs/decisions/3C-S5-responsive-state.md`.

Delivered foundations: core validation/inversion for responsive state; session
operation history with 750 ms property coalescing, history barriers, bounded
entries, external-version conflict refusal, and repeated remove/restore travel
using the same ids and current restore versions. A separate migration extends
the internal SQL operation implementation; the S4 migration is unchanged.

Evidence and limitations: `evidence/3c/s5/README.md`. The QA transaction-contained
SQL smoke check rolls back the temporary function replacement and every test
row. It is supplemental evidence, not a replacement for the required QA DB
and authenticated Builder browser suites. The next development checkpoint adds
an authorized, QA-gated operation API, strict transaction validation, the 3B
normalization boundary, immutable retry transport, ordered offline replay, and
a tested operation coordinator. The Builder now routes opted-in property/device
and structural edits, Save draft and Undo/Redo through that coordinator, with
durable unsent checkpoints, project replay leases and incremental projection.
Legacy section/replacement/publish writers are guarded; writes require a separate
QA-only operation flag disabled by default. Eight controlled-authority local
browser checks pass, including retry/conflict and responsive viewport loading.
The complete writer audit, full edit-to-canvas measurements and authenticated
QA gates remain pending; local checks do not constitute S5 sign-off.
No later slice is marked complete.

Further S5 checkpoint (2026-10-03): opted-in rendering consumes the coordinator
model directly with unchanged-node projection caching; the source writer audit
adds shared portfolio/publisher and legacy page-route guards plus preserved
legacy offline-intent blockers. `npm run ci`: 5,152 passed / 102 skipped on
Node 24; 11 controlled-authority local browser checks pass. Desktop canvas
baseline at 2,000 nodes improves from 176.9 to 140.8 ms in this environment.
Source audit, limitations and exact measurements are in the S5 evidence README.
Page lifecycle operations are a proposed freeze extension, awaiting user decision
(`docs/decisions/3C-S5-page-operations-proposal.md`); this progress record does
not approve it. Catalog synchronization, React section memoization, remaining
performance gates and authenticated QA still prevent S5 sign-off.


Approved page extension checkpoint (2026-10-03): the user approved the recommended
page lifecycle direction. The explicit follow-up contract is
`docs/decisions/3C-S5-page-operations-design.md`; the earlier proposal paragraph
above records the historical state before this approval. Page add with seed
nodes, rename/slug, reorder, delete and restore now use atomic transactions,
canonical page acknowledgements and shared history. A new migration extends the
protocol to 3; it has only been compiled/exercised locally, not applied remotely.
Source navigation synchronizes separately and visibly queues/reports failure.
Local CI: 5,176 passed / 106 skipped. Ten active controlled-authority browser
journeys pass; three optional performance measurements were not run in this
checkpoint. Eleven isolated PGlite SQL authority smoke checks pass, including
later opt-in preserving 3B page order. These do not replace Supabase QA auth,
RLS, multi-connection tests or user-perspective sign-off. S5 remains IN PROGRESS;
S6–S8/final 3C and later roadmap stages are not complete.


Catalog/rendering continuation (2026-10-03): catalog projection now submits
normalized versioned system transactions, with successful catalog writes reported
separately from pending website sync and retry. Shared React section memoization
and incremental responsive iframe updates preserve unchanged section identity.
Local mobile hydration/header regressions are corrected. Twenty-two controlled
browser checks pass, including nine device/size measurements and one-section
iframe delta assertions. Local median budgets are 200/250/500 ms at
100/500/2,000 nodes, set from recorded worst-device baselines with headroom.
Exact scope, boundary correction and limitations: `evidence/3c/s5/catalog-rendering/README.md`.
S5 remains IN PROGRESS: authenticated QA and final gates are not waived.

Final local Node 20.20.2 CI for the catalog/rendering checkpoint passes:
5,200 tests passed / 106 skipped, 0 lint errors, production build. Four final
catalog/rendering checks pass, including the selected-project race regression
(23 distinct local browser journeys total). This does not replace QA.

### S6 — Native primitive editor · IN PROGRESS (2026-10-05)

User-authorized development while credential-dependent S5 QA is deferred.
The native section/group/text/image pilot now has a shared mixed-page renderer,
capability-driven labelled inspector, tree selection/nesting/reparenting,
responsive child edits, a11y/media controls and transactional duplicate/remove
history. Desktop and iframe previews share canonical KCD with incremental node
updates. Native content is not converted to persisted website-v1 sections.
Phone save state is visible; unsupported native payloads are preserved and reported.

Controlled local browser journeys at 1440/768/390 and transaction/adapter/renderer
checks are recorded in `evidence/3c/s6/README.md`. These do not replace authenticated
QA or S7 publish/live checks. The release manifest remains legacy-only. S5/S6 and
final 3C sign-off remain open; no later roadmap stage is marked complete.


## 2026-10-05 S7 implementation checkpoint (no release sign-off)

The native publisher and compatible public loader are implemented with service-only source staging, preflight, detached hashed envelopes and an atomic source-check/deployment/project/history transaction. Local PostgreSQL/WASM transaction tests, native/public/legacy browser checks and native performance budgets are recorded in `evidence/3c/s7/README.md`. Authenticated QA and S8's human visual/default decision gates remain open. This entry changes no frozen product decision or default and authorizes no production rollout.
