# S6 development while S5 authenticated QA is deferred

User authorization, 2026-10-03: defer the private-credential-dependent QA work
because the user is away from their computer, and continue development.

This permits S6 development before S5's remaining environment-dependent checks.
It does not mark those checks passed, close S5, or authorize release. If deferred
QA exposes a defect in operation persistence/history, repair it and rerun the
affected S6 checks before sign-off. No dependency or test requirement is removed.

## Implementation sequence

1. Native section/group/text/image DOM components, using the existing registry,
   responsive resolver and tree index. Preserve semantic headings and media alt
   text. Report unsupported content explicitly.
2. Mixed legacy/native page rendering, retaining canonical site chrome and the
   exact legacy render semantics. Editor and preview share this boundary.
3. Capability-driven inspector and nesting controls, emitting existing KCD
   transactions through the coordinator. Selection, device overrides and history
   must address permanent node ids. No second document or save model.
4. Persistence/reload tests, responsive browser journeys, labelled controls and
   unsupported-capability behavior. Publish journeys depend on S7.
5. Restore private QA configuration; run the deferred S5 tests and all required
   S6/S7/S8 gates before final sign-off.

## Development checkpoint — 2026-10-05

Native section/group/text/image editing is wired through the existing operation
coordinator. Controls use the registry/renderer capability intersection, with
labelled property controls, independent phone/tablet overrides, resets to desktop
and type defaults, image upload/library selection, semantic headings, alternative
text and decorative media. Tree selection, permitted insertion/reparenting,
sibling/root ordering, duplication and confirmed subtree removal keep stable ids
and use the same transactional history and save path.

The shared SiteRenderer mixes native trees and legacy sections in canonical root
order, preserves site chrome, and shows unsupported native content explicitly.
The native renderer validates schemas and safe links/assets, resolves token colours
and device visibility, and memoizes unchanged subtrees. Desktop and iframe previews
share the same canonical document; sparse node deltas preserve untouched identities,
check sequences and structural validity, and require resynchronization after gaps.
Iframe selection accepts only the current same-origin iframe's document node ids.
Live theme edits update native tokens. Native content is never flattened into a
persisted or published website-v1 definition.

Browser checks exercised the actual Builder at 1440/768/390 pixels against a
controlled authority running the real transaction preparation boundary. They
cover insert/edit/undo/redo/reload, child overrides, image/a11y controls, invalid
address recovery, conflict preservation, labels for all four inspectors,
reparenting, device root order, keyboard/iframe selection, hide/show and preserved
unsupported payloads. This is local UI/storage-adapter evidence, not Supabase auth,
RLS, multi-connection or immutable-publishing evidence. Exact results and remaining
gates are in `evidence/3c/s6/README.md`.

S6 remains IN PROGRESS pending authenticated QA, S7 publish/live parity and required
visual sign-off. The release manifest remains legacy-only; operation editing stays
QA-gated and disabled by default. No production migration, deployment or release
has been performed, and no skipped check counts as passed.
