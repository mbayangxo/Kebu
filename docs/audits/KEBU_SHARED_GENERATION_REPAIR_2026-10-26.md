# Shared Builder/Studio generation and repair audit

Source-only feature branch: `work/codex-shared-generation-repair-oct26`.
Base: `679180a3a8c9a06cf8bd231c998bd3b0874a7aa6`.
User explicitly forbids deployment. No hosted migration, cron, provider configuration, deployment or promotion was performed.

Implementation and operational handoff: `docs/handoffs/CLAUDE_SHARED_GENERATION_REPAIR_2026-10-26.md`.

## Regression evidence

The actual PostgreSQL suite exercises idempotent creates, request mismatch rejection, authenticated write/service-RPC denial, wrong-owner invisibility, one reservation per lease, ambiguous-provider expiry without rebilling, expired-worker fencing, immutable-input enforcement, cancellation precedence, direction revision CAS, revoked permission, Studio acceptance/versioning/replay, newer Studio edit preservation, inspection-only refusal, private-evidence membership revocation and real Builder `apply_experience_plan` acceptance.

The stage suite covers native generation and bounded repair for both targets, changed-source refusal, content/media/locked-object guards, malformed IDs, preserved wording, every-page visual batching and expiring/revision-bound preview capabilities.

Provider transport tests use the actual Anthropic SDK against loopback HTTP and a compatible transport fixture. They verify forced schema/tool output, image payloads, token receipts, no ambiguous retry and malformed response refusal. No live provider quality/cost/capacity claim.

API cases cover origin rejection, authentication, authenticated actor attribution, prerequisite/access failure, idempotent receipts, invisible runs, transactional acceptance revision and bounded request bodies.

Actual Chromium/Next tests detect a clipped Studio text box and unreadably small Builder text, produce immutable rendered evidence, apply a bounded native style repair, rerender and send actual JPEGs to a clearly identified vision-response fixture. Separate browser cases exercise submit → approve → actual preview → review → accept controls for both editors with isolated UI transport. Private preview rejects missing capability/session.

During local verification, a proxy-based fixture prevented reliable hydration; it was replaced with a loopback Supabase HTTP transport so actual Next private-preview routing is exercised. An earlier run changed app source during browser verification, invalidating dev hydration; final acceptance runs use a stable source tree. Small Builder text is a deliberately invalid readability fixture; a large heading that wrapped correctly was not treated as an overflow regression. Screenshot review caught a false desktop preview width caused by max-width shrinking the iframe; fixed by retaining the chosen viewport inside a scrolling container. Phone UI checks also require no document-level horizontal overflow and an actually rendered native candidate before acceptance.

React quality review covers primitive effect dependencies, stale status response fencing, bounded polling with cleanup, event-based actions, stable request keys, accessible controls/status/error states, typed native schemas and conditional browser imports. Playwright is an exact-pinned runtime dependency and a Next server external; no arbitrary generated source is executed.

## Final gate results

- Final local `npm run ci`: exit0; TypeScript; lint0errors/346pre-existing warnings;6673tests passed/361explicit environment skips; production build and230generated static pages.
- Final exact runtime focused loopback acceptance:38/38 passed,0failures/0skips:8stage/guard,9API,5provider-transport,9actual-SQL and7browser cases. Both native flows fail actual checks, repair, rerender and reach readiness; desktop1280/phone390review controls require an actual rendered candidate before acceptance. Empty saved-media objects fail inspection; pre-existing locked IDs remain valid, and evidence filenames hash page IDs to prevent path traversal.
- The strict GitHub workflow repeats these38cases and refuses any skipped/failing/incomplete result. Default full CI’s361environment skips include the9SQL+7browser cases explicitly executed above. No skipped test is represented as passed.
- Migration hygiene:99unique timestamped canonical migrations, no executable legacy bundles. New migration was generated through the CLI and tested locally; not applied hosted.
- Actual desktop1280/phone390workbench previews and repaired native screenshots were visually inspected. Native render tests also run360/390/768/1280viewports.
- No live model/media provider call, hosted Supabase mutation, deployment, promotion or hosted scheduler change.

## Limits

This is the shared native generation/inspection/repair workflow, not completion of the entire Studio product specification or the100,000-sites throughput claim. Native page/layer/text limits and documented model/browser budgets apply. Existing forms/commerce, external media generation and production hosting require their own configured/verified flows. Production provider output quality and managed hosted acceptance were not tested, because this task authorizes source work and forbids deployment.

## Unattended-worker completion follow-up

The first source checkpoint exposed the recovery endpoint but depended on review-page polling or separately configured scheduling to drive later stages. Added a standalone supervised worker command so a closed browser does not stop stage progression once the worker is activated. It only invokes the existing authenticated, fenced stage endpoint; model, quota, permission and acceptance authority are unchanged. Production activation remains prohibited by the user's no-deployment instruction.

Ten actual CLI/loopback HTTP cases cover authenticated stage/idle receipts, unsafe URL/credential rejection, missing secret, redirect refusal, unconfirmed responses without private-body leakage, continued serial processing without a browser and clean SIGTERM shutdown. The strict generation workflow now includes these cases and requires48passes without skips. Required full CI now also runs on pull requests targeting the authoritative development branch, alongside the strict generation gate. Final local follow-up gates pass: full CI6683tests/361explicit environment skips, TypeScript, lint0errors/346existing warnings and230-page production build; strict acceptance48/48 with0failures/0skips. The worker CLI10/10cases were also rerun after bounded non-success response cancellation. No production worker process or scheduler was started.


## October 26 — uploaded Claude review fixes recovered and independently verified

Recovered uploaded patch `ff33e9bf6f81a83b8dd614ac28b477b821460c51` with `git am`, retaining Claude's author information. The local applied commit is `82365c14f3ef90aa557fd8702ad2bd014ed3f70e`; its different SHA reflects commit metadata/parent context, not a new authorship claim. The patch closes frameMediaUrl media validation, directly callable approval shape validation, small payload caps, Studio renderer/checker clipping mismatch and duplicate JSON serialization.

The first focused execution of the uploaded patch passes27/27. Fourteen new real-RPC malformed-direction cases then reproduce seven remaining acceptance gaps: empty required text, oversized typography/review, empty/oversized palette, too many reviews and extra fields. The follow-up checks container types before array operations, enforces field/count bounds and rejects unknown fields. A maximum valid direction also passes (the previous10KB total cap rejected a schema-valid11.5KB direction); the bounded64KB envelope accommodates valid Unicode content. Prepared provider inputs still enforce byte/image limits without another JSON.stringify. The strict harness now requires68 cases.

Independent final verification: strict local generation68/68, zero failed/skipped across10engine,9API,8provider transport,24actual PostgreSQL/PGlite,7actual Chromium/Next and10worker cases. Browser143.0.7499.0 was provisioned from a scratch-only pinned package after the standard Playwright browser download failed; no runtime dependency/version change was made. All seven browser cases pass, including the missing-session401 case Claude reported failing in another environment. Fixture transport and visual model replies remain explicitly distinct from live authentication/model acceptance. Desktop native artwork and phone review screenshots were inspected.

Full `NODE_OPTIONS=--max-old-space-size=4096 npm run ci` exits0: TypeScript, lint0errors/346existing warnings,6688tests passed/376explicit skips and230-page production build. The24SQL+7browser environment-gated cases are included in the default skip count and executed separately by strict acceptance. Migration hygiene99/99 and diff whitespace checks pass. The earlier default-heap full CI exited134 in TypeScript at Node's2GB limit; it is rejected evidence, superseded by the complete passing run. The canonical local evidence JSON records the current results and runtime-file hashes.

These recovered changes are LOCAL ONLY, after GitHub base `0442a59415c431b6ced254372a02428b47db8645`. Claude reported automatic approval rejection of git push as a production-deployment risk. No alternate connector/ref write was used to bypass that rejection. A durable recovery archive contains both authored commits, a Git bundle, patches and verification evidence for restoration through the permitted workflow. Do not describe these fixes as pushed, merged, hosted-tested or deployed. The generation migration remains source-only and the worker remains inactive.
