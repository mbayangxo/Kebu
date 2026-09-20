# Kebu Builder — reference-led product blueprint

Status: approved implementation blueprint for the reference-led Builder pass.

This blueprint extends `docs/screens/builder-editor-shell.md` and
`docs/screens/builder-context-panels.md`. It does not replace the existing
Builder data, authorization, autosave, preview, publishing, or Yande systems.

## Reference hierarchy

| Priority | Reference | What Kebu learns |
| --- | --- | --- |
| 1 | User-provided May Lècor Builder | Editor composition, density, canvas prominence and contextual inspector; not its default dark palette |
| 2 | User-provided Kebu Library, Rooms and Workspace | Shared rail, Kebu identity, black/cream system, compact information architecture |
| 3 | User-provided Kebu Search home/results | Search hierarchy, editorial display type, high-density discovery |
| 4 | User-provided EVA Mail | Three-column communication workspace and compact list behavior |
| 5 | Shopify reference dossier | Predictability, theme-editor workflows, Preview/Publish clarity; never branding or artwork |

The layouts in the references are product-direction material. Kebu product
chrome must not use generic African stock photography or fabricated people,
activity, files or metrics. A user's site canvas may display that user's real,
licensed or generated project assets because the canvas is their content, not
Kebu's product chrome.

## Cross-cutting product constraints

- Kebu is light-first: warm white/cream canvas, black structure, orange/red
  energy. Dark mode follows the operating-system color preference automatically;
  it is not the default identity.
- Core editing remains useful during intermittent connectivity. Local changes
  queue safely, sync when connectivity returns, and expose honest
  unsaved/saving/queued/saved/error states.
- Security is part of every slice: server authorization, RLS, validated inputs,
  tenant isolation, bounded resource use and auditability where privileged.
- No reference screen authorizes fake data or a decorative control.

## 1. Information architecture

Kebu is the ecosystem. Builder is an immersive capability inside the active
space. The editing hierarchy is:

`Space → Site → Page → Section → Element → Property`

The global Kebu rail answers where the user is. The Builder library answers what
they can add. The canvas answers what they are making. The inspector answers how
the current selection behaves.

## 2. Navigation architecture

- Global rail: Kebu mark, Home, Search, Universe, Spaces, Library, Studio,
  Builder, Work, Opportunities, Calendar and More. Builder is selected.
- Builder top bar: site/page breadcrumb, save status, responsive viewport,
  undo/redo, Preview, Save and Publish.
- Left Builder rail/panel: Sections, Pages, Layers, Assets, Design, Navigation,
  Apps and History.
- Right inspector: Design, Settings and Page contexts. Selection determines the
  default context; no fake controls are shown.
- Mobile: the global rail is suppressed during editing; Builder tools become a
  bottom dock and contextual panels become dismissible sheets.

## 3. Screen inventory

1. Builder loading shell
2. Builder editor with no selection
3. Builder editor with section selection
4. Builder editor with element selection
5. Pages hierarchy manager
6. Layers manager
7. Assets browser/uploader
8. Design and site-chrome panels
9. Apps/block registry
10. Version history
11. Responsive desktop/tablet/mobile preview
12. Yande proposal, review, apply and discard flow
13. Preview
14. Publish/billing/error flows

## 4. Primary journeys

### Edit and publish

Open site → select page → select section/element → edit a real property → see
unsaved/saving/saved status → preview → publish → receive confirmed live state.

### Add content

Open Sections/Apps → choose a real registered section → insert into persisted
page hierarchy → select it → edit → autosave → undo if needed.

### Responsive edit

Switch device → render at a true device viewport → inspect inherited/overridden
values → edit or reset override → persist → verify preview.

### Yande-assisted change

Ask Yande → receive proposal → review individual changes → apply or discard →
applied changes enter normal autosave/history; discarded changes never persist.

## 5. Feature inventory

Preserve: pages/hierarchy, sections, layers, assets, Apps registry, styles,
site chrome, element/section geometry, motion, responsive state, undo/redo,
autosave/offline queue, preview, publish, billing, versions and Yande.

This pass adds product hierarchy, visual coherence, accessibility and state
clarity. It does not introduce decorative controls without a real handler.

## 6. Interaction inventory

- Select canvas section or layer
- Drill into element
- Drag/reorder/resize where supported by existing geometry
- Undo/redo
- Switch page/tool/device
- Open/close contextual panel
- Preview/publish/save now
- Upload/reuse an asset
- Apply/discard Yande proposal
- Escape closes the foremost transient surface
- Focus rings, pressed states and disabled states are visible

## 7. Component inventory

- Kebu brand mark and ecosystem rail
- Builder top bar
- Builder tool rail
- Context panel header/body
- Canvas stage and viewport frame
- Selection breadcrumb and inspector
- Save-status indicator
- Segmented viewport control
- Preview/Save/Publish actions
- Yande command bar and proposal panel
- Existing Galaxy editor primitives

## 8. Data model

No replacement data model. Continue using projects, project pages, project
sections, site chrome, assets/storage, versions, publish/deployment state,
billing state and Yande proposal data already present in the repository.

## 9. Application state

- Persistent: site/page/section/chrome/asset/version/publish data
- Recoverable local: queued offline edits
- Ephemeral: active panel, selection, viewport, open menu, Yande surface
- Save state: idle, unsaved, saving, queued, saved, error
- Publish state: draft, unpublished changes, publishing, live, failed

## 10. Permission model

Server authorization and Supabase RLS remain authoritative. Builder never infers
ownership from a hidden control or URL. Support-assist mode remains scoped,
signed and audited. UI controls may be hidden for clarity but security never
depends on hiding them.

## 11. Surface states

| State | Required behavior |
| --- | --- |
| Loading | Stable dark shell and structured canvas/panel skeleton |
| Empty | Explain what is missing and show only a working recovery action |
| Error | Specific message, preserved work, retry/recovery path |
| Offline/queued | Honest queued status; no false “saved” claim |
| Success | Compact saved/live confirmation |
| Permission denied | Controlled 403/404 state from server authority |
| Destructive | Confirmation and recovery where possible |

## 12. Responsive behavior

- Desktop ≥1280: global rail, Builder library, dominant canvas and inspector can
  coexist. Canvas receives the remaining width.
- Tablet: suppress global rail; show one of library or inspector beside canvas.
- Mobile: canvas-first, bottom tool dock, full-height sheets, safe-area padding,
  44px touch targets and no squeezed multi-column desktop UI.

## 13. Keyboard behavior

- `Escape`: close foremost transient panel/Yande/fullscreen preview
- Existing undo/redo shortcuts remain authoritative
- Tab order: top actions → tools → panel → canvas → inspector
- Page/section/layer selection is keyboard reachable
- No selection or save state is communicated by color alone

## 14. Backend requirements

No new backend for the shell slice. Every mutation continues through existing
validated APIs and Supabase persistence. The concurrent security track hardens
caller-bound tenant authorization, SSRF protection and abuse controls without
changing Builder behavior.

## 15. Integration requirements

- Galaxy logo, tokens and icon registry
- Existing SiteRenderer/editable canvas
- Existing Builder panels and Apps registry
- Existing Yande preview/apply flow
- Existing Preview and Publish routes
- Existing project authorization, RLS and offline queue
- System-driven light/dark appearance without duplicating product state

## 16. Testing requirements

- Focused component/static-contract tests for real action wiring
- TypeScript and lint
- Existing Builder unit/integration suite
- Production build
- Browser QA at desktop, tablet and mobile when a configured preview is
  available
- Verify autosave, undo/redo, page switch, device switch, Preview, Publish and
  Yande apply still operate on real state

## First implementation slice

The first slice is shell-only: Kebu identity, immersive dark chrome, top action
hierarchy, left-tool density, canvas framing and mobile composition. It may
rearrange existing working controls but cannot replace their handlers or data.
The next slice separates selection properties into the right inspector using
the same underlying callbacks.
