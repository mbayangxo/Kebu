# Kebu Builder — contextual panels and inspector

## Meta

| Field | Value |
|---|---|
| Screen | Builder contextual panels and inspector |
| Route | `/create/[id]` |
| Product | Kebu Builder |
| Slice | UX/UI slice 2 |
| Status | Implemented |
| Foundation | Existing project/page/section/assets APIs and autosave |

## Purpose

Make every editing surface feel like one coherent Kebu product while preserving the Builder’s real page hierarchy, asset library, layer model, responsive overrides, section geometry, motion, and persistence behavior.

## Interaction model

- The active rail tool owns the left contextual panel.
- Every panel begins with a consistent eyebrow, title, short job-focused explanation, and optional primary action.
- Panels use flat rows and compact groups rather than nested cards for every field.
- Orange communicates Kebu context, selection, focus, and editable emphasis. Black remains the primary action color.
- Element and section controls appear only for a real current selection.
- Device-specific values remain labeled as inherited or overridden and retain their existing reset behavior.

## Real operations

| Surface | Operations | Persistence |
|---|---|---|
| Pages | create, select, rename, URL, hierarchy, reorder, delete | Existing pages API + Supabase |
| Layers | select, arrange, hide/show, lock/unlock | Existing section patch/autosave path |
| Assets | upload, filter, reuse, drag to canvas | Existing assets APIs + storage |
| Layout | spacing, dimensions, margins, overflow, visibility | Existing section patch/autosave path |
| Motion | preset, duration, delay | Existing `builderMotion` section state |
| Element inspector | content, media, geometry, stacking, opacity, rotation, responsive reset | Existing device-aware section patch path |

## States

- **Loading:** compact in-panel feedback without replacing the canvas.
- **Empty:** honest dashed state explaining what the user must select or upload.
- **Error:** existing specific API error remains visible; optimistic page order rolls back.
- **Busy:** mutation controls disable without making the canvas disappear.
- **Selected:** visible through background, type weight, and focus—not color alone.

## Responsive behavior

- Desktop: contextual panel stays beside the canvas; selection controls remain compact.
- Tablet: one editing surface at a time when necessary to preserve useful canvas width.
- Mobile: panels use the existing full-height dismissible sheet; the bottom tool dock remains reachable.

## Accessibility

- All buttons and selection controls have visible keyboard focus.
- Segmented controls expose `aria-pressed`.
- Form fields retain labels, constraints, and native input semantics.
- Empty states and disabled/busy states do not depend only on color.

## Acceptance

- [x] Uses Galaxy tokens and reusable editor primitives.
- [x] No fake controls or local-only site changes.
- [x] Pages, assets, layers, geometry, motion, and responsive overrides retain persistence.
- [x] Empty states explain recovery or the required next action.
- [x] Builder TypeScript, tests, lint, and production build are required before push.

## Out of scope

- New backend entities or migrations.
- A fake Apps marketplace.
- Replacing page, section, asset, or publish APIs.
- The later detailed typography and header/footer editing pass.
