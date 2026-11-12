# Kebu Builder — editor shell

## Meta

| Field | Value |
|-------|-------|
| **Screen name** | Builder editor shell |
| **Route / entry** | `/create/[id]` |
| **Product area** | Kebu Builder |
| **Slice** | UX/UI slice 1 — shell, navigation, canvas hierarchy |
| **Status** | Implemented — shell slice 1 |
| **Reference images** | User-provided commerce-builder screenshot — layout and interaction-density reference only; no brand, imagery, palette, copy, or visual styling is copied |

## Purpose

Give a site owner one calm, canvas-first place to understand their site, move between pages and editing tools, directly edit real persisted content, see save state, preview responsive output, and publish with confidence. The shell must feel unmistakably Kebu: Galaxy cream and white surfaces, black structural typography, and restrained orange/red accents.

## Product architect decisions

- The website canvas is the dominant surface. Tooling frames it and never impersonates the website being edited.
- The left rail answers **what kind of work am I doing?** The adjacent contextual panel answers **what can I change?**
- The right inspector appears only when a section or element is selected. It answers **what is selected and how does it behave?**
- Page switching has one primary control in the top bar. The Pages tool is for hierarchy management, not a competing page picker.
- Yande is a contextual site collaborator launched from the canvas command bar. It keeps the existing preview → review → apply/discard contract.
- Preview is secondary to Publish. Save state is visible but does not compete with creation actions.
- Every exposed control maps to existing Builder state and Supabase persistence. Unavailable capabilities are omitted rather than simulated.

## Primary regions

1. **Kebu top bar** — Kebu wordmark, current site/page context, responsive viewport selector, undo/redo, save state, Preview, Publish.
2. **Tool rail** — compact labeled tools for Sections, Pages, Layers, Design, Assets, Navigation, History, Shop, plus real site settings/support destinations.
3. **Context panel** — the active tool’s existing real controls, with a clear title, description, and mobile dismissal.
4. **Canvas stage** — warm Galaxy workspace containing the live site canvas, viewport label, zoom/fit framing, and direct-manipulation affordances.
5. **Inspector** — selection-aware element/section controls; absent when nothing is selected.
6. **Yande command bar** — compact bottom-canvas entry that opens the existing proposal workflow without obscuring the canvas by default.

## Reference mapping

| Reference pattern | Kebu adaptation |
|---|---|
| Narrow tool rail + adjacent library | Kebu rail with Galaxy active state and real Builder panels |
| Large central storefront canvas | Existing live `SiteRenderer`/editable preview, framed as the primary surface |
| Contextual right properties panel | Existing element and section inspectors with Galaxy hierarchy |
| Floating bottom actions | Yande command entry and contextual creation actions only where already functional |
| Compact Preview/Publish hierarchy | Existing Preview route and publish mutation, styled with Kebu priorities |

## Data dependencies

| Entity | Source | Auth |
|--------|--------|------|
| Project, pages, sections, site chrome | Existing project API / Supabase | Project owner or authorized support session |
| Assets | Existing project asset APIs / Supabase Storage | Project owner |
| Versions | Existing Builder version API | Project owner |
| Shop | Existing Shop routes and project relationship | Project owner |
| Publish and billing state | Existing project publish/billing APIs | Project owner |

## Actions inventory

| Action | Trigger | Result | Persists? |
|--------|---------|--------|-----------|
| Switch tool | Rail button | Opens/toggles corresponding contextual panel | UI state only |
| Switch page | Top-bar selector or Pages panel | Loads selected page into canvas | Selection no; page edits yes |
| Select section/element | Canvas or Layers | Opens contextual inspector | UI state only |
| Edit content/style/layout/motion | Inspector control or direct manipulation | Updates live canvas and autosave queue | Yes, existing autosave/API |
| Change viewport | Desktop/tablet/mobile control | Uses real responsive preview viewport | UI state; device-specific overrides persist |
| Undo/redo | Top-bar controls | Applies existing history/future state | Result autosaves |
| Save now | Explicit save action | Flushes the existing autosave path | Yes |
| Preview | Preview action | Opens existing preview route | No |
| Publish | Publish action | Runs existing validated publish workflow | Yes |
| Ask Yande | Command entry | Opens existing preview-first change workflow | Only after Apply |

## Interaction detail

- Clicking the active rail item closes its panel and returns maximum width to the canvas.
- Selected tools use a Kebu orange indicator and high-contrast state; they do not invert the whole rail into a generic dark pill.
- Hover labels supplement visible short labels; keyboard focus is always visible.
- The current page and current viewport remain understandable without reconstructing context from multiple panels.
- Undo/redo disabled state remains explicit. Save status uses text plus a state icon; color is supplementary.
- Publish retains existing billing, validation, error, and recovery behavior.
- The shell never overlays editing panels on desktop unless viewport space is constrained.

## States

### Loading

Keep the stable Kebu shell visible and show a quiet structured canvas placeholder rather than a lone text line.

### Empty

Existing panel-specific empty states remain honest and offer only working actions. A page without editable layers explains that limitation.

### Error

Show the existing specific error with Retry or the relevant recovery destination. Save/publish errors remain visible and are never converted into success styling.

### Success

Saved and live states are shown compactly in the top bar. Successful publish continues to expose the confirmed live URL.

### Permission denied

The existing server/API authorization remains authoritative. The shell does not infer ownership client-side.

## Responsive

| Breakpoint | Behavior |
|------------|----------|
| Mobile | Canvas is the default full-screen composition. The tool rail becomes a bottom tool dock; tool and inspector surfaces open as dismissible full-height sheets. Primary actions respect safe areas. |
| Tablet | Compact rail stays available; one contextual panel or inspector is visible at a time, never both if it makes the canvas unusable. |
| Desktop | Rail, contextual panel, canvas, and selection inspector can coexist; the canvas receives all remaining width. |

## Accessibility and keyboard

- All icon controls have accessible names, tooltips, pressed/disabled states, and 44px touch targets on mobile.
- Focus order follows top bar → tools → panel → canvas → inspector.
- `Escape` closes the foremost transient panel or Yande surface without discarding persisted edits.
- Existing editable controls keep semantic labels; selection is not communicated by color alone.
- Reduced-motion preference disables nonessential shell transitions.

## Persistence

Panel openness, transient selection, and viewport choice are workspace UI state. Site/page/section/chrome edits continue through the existing autosave and offline queue. Yande changes persist only after explicit Apply. Publish remains separate from draft persistence.

## Backend

No new backend system is introduced in this slice. Existing project, page, section, asset, version, Yande, billing, and publish paths remain authoritative. UI work must not bypass RLS, server authorization, validation, or the established autosave queue.

## Acceptance criteria

- [ ] Uses Kebu Galaxy logo, color, typography, spacing, focus, and motion primitives.
- [ ] Reference is used only for layout/interaction principles.
- [ ] Live canvas is visually dominant on desktop, tablet, and mobile.
- [ ] Every visible control invokes an existing working behavior or persisted state.
- [ ] Pages, Layers, Assets, Design, Navigation, History, Shop, inspector, viewport, undo/redo, Preview, Publish, and Yande remain reachable.
- [ ] Save, saving, queued/unsaved, saved, and error states are understandable without color alone.
- [ ] Mobile uses a tool dock and sheets rather than a squeezed desktop sidebar.
- [ ] Keyboard, focus, touch targets, reduced motion, empty/error/loading states are verified.
- [ ] Focused Builder tests, typecheck, lint, and production build pass.
- [ ] All applicable Definition of Done items pass.

## Out of scope (this slice)

- Replacing Builder persistence, Supabase schema, publishing, Shop, or Yande backends.
- Inventing an Apps marketplace or controls not backed by the existing block registry.
- Copying the reference site’s Luma identity, beige palette, assets, copy, or component styling.
- Rebuilding individual customer templates or performing the later full visual polish of every inspector field.
- Production deployment or merge to `main`.
