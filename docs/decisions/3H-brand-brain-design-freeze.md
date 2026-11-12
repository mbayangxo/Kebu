# 3H Brand Brain — architect phase and design freeze

2026-10-08 UTC. The user's “Next” authorizes 3H after the completed 3F/3G local gates. Signed-in S8 remains deferred; production migrations, deployment, defaults and rollout are not authorized.

## Product / information architecture

Brand Brain is durable creative direction, not an AI chat or a second site document. It contains four editable profiles: Brand DNA (identity, audience, voice, languages, approved assets, palette/type), Creative DNA (composition, photography, density, hierarchy and rules), Taste DNA (liked/disliked directions, labelled reference URLs and exclusions), Motion DNA (allowed entrance/interaction styles and timing limits). Missing direction stays missing; no inferred ethnicity, fake reference analysis or invented business facts.

Reuse `business_brand_kits` and its existing Brand DNA columns as the single brand identity. Add versioned creative/taste/motion data on the same row, not a duplicate identity table. Legacy Studio consumers continue to read the original columns. Structured values compile to deterministic, labelled data for 3I; user-authored text is untrusted reference content, never a system instruction. Site changes still require validated KCD transactions.

## Navigation, surfaces and components

Extend the existing `/studio/brand` destination into Brand Brain. Studio navigation stays compatible. A compact saved-profile selector supports existing owner profiles, including profiles without a business. Each profile has an optional existing owned Kebu business association. Four native details accordions keep fields grouped and keyboard-accessible; existing Kebu shell tokens, labelled inputs/selects and 12px utility text govern the form. No new modal or competing editor. The saved version and unsaved/saving/error states stay next to Save. A readable compiled-direction summary explains the actual persisted settings; no Generate control before 3I.

## Journeys / interactions

Load profiles → select or New profile → edit the four groups → Save → authoritative response → refresh retains the same profile. Changing selection or starting a new profile while dirty requires explicit discard confirmation. Save failures retain the draft. Concurrent saves reject stale revision with an explicit reload-saved action; reload requires confirming draft loss. Keyboard uses native labels/tab/Enter/details; Escape does not erase work. Browser navigation gets a beforeunload warning while dirty. Narrow screens use one-column fields; wider screens use two columns only for short values.

## Data / backend / permission model

Version-1 strict profile schemas bound all text, list sizes, reference URLs, colors, fonts and motion values. Existing brand columns remain authoritative; `brain_profile` stores only creative/taste/motion, and `brain_revision` is optimistic concurrency, independent of legacy capped `dna_version`. A trigger advances revision whenever any legacy or new field changes, so old APIs cannot silently overwrite a new editor's work. Writes check owner and owned business association, lock the row, compare revision, and return the canonical saved row. The RPC is security-invoker with pinned search path; existing owner RLS continues to protect all reads/writes. No service key in the browser, no public profile access, no client owner field accepted.

The first vertical slice is complete four-profile authoring and durable save/reload with revision protection. Subsequent 3H slices connect the selected saved profile to Builder editing and produce validated, undoable KCD applications of palette/motion intent. 3I owns model calls/reference analysis/site planning; 3J owns the real-content benchmark. Profile authoring alone does not close all 3H.

## States / integration

Loading disables authoring; empty offers New profile; unauthenticated requests are rejected; load errors offer Retry without claiming an empty account; validation names the field; busy prevents duplicate requests; save success uses returned revision; failure retains draft and does not auto-retry an uncertain commit. Existing Studio DNA/kit consumers remain compatible. New fields are opt-in and do not rewrite any site, deployed snapshot or old kit.

## Verification / ordered gates

1. Strict schema/compiler and legacy-row round trips, hostile links/foreign keys, empty/default preservation.
2. Actual forward migration in disposable PostgreSQL: owner/non-owner/anonymous read/write, business association, legacy-write revision advance and stale conflict rollback.
3. API auth/validation/error/acknowledgement tests.
4. Running browser: create/edit/save/reload, all four groups, dirty selection/reload, failure/conflict recovery, desktop/phone labels and overflow; manual screenshots.
5. Full Node 20 CI and unchanged existing Builder regressions. Record exact local evidence; signed-in verification remains explicitly open.

References: existing Shopify reference dossier informs compact accordion density only; existing Studio Brand DNA owns navigation/data compatibility. No proprietary assets copied. No new external paid service is required.

## Authoring slice result

The first slice is locally complete: four-profile authoring, owner-scoped revision RPC, strict schemas, detached compiler data and legacy compatibility. 27 focused tests, seven final browser cases and Node 20.20.2 CI passed (5,403 tests / 110 environment skips, zero lint errors / 289 existing warnings, 202-page build). See `evidence/3h/profiles/README.md`. No silent legacy truncation, default replacement of unknown versions, or fake AI/site application. Normal internal links and reload/close warn while dirty; SPA history traversal is not claimed as guarded in this slice. Original Brand DNA editing is preserved for incompatible records.

Remaining 3H: selected-profile attachment to Builder, approved asset curation, validated undoable palette/motion application and the combined phase integration gate. 3H is **in progress**, not complete; 3I/3J and signed-in/internal-readiness gates remain later work.

2026-10-09 update: the above is the historical authoring checkpoint. All remaining 3H features are now implemented; `3H-completion-design-freeze.md` and `../../evidence/3h/complete/README.md` record combined functional verification and the still-open absolute timing sign-off. Hosted signed-in QA remains deferred.
