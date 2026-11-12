# Claude handoff: shared Builder and Studio generation

User instruction: finish generation and repair for Builder and Studio; make the source available to Claude; **do not deploy anything**.

Source branch: `work/codex-shared-generation-repair-oct26`, based on authoritative development checkpoint `679180a3a8c9a06cf8bd231c998bd3b0874a7aa6`. Keep this feature branch isolated while the no-deployment instruction stands. Its first pushed tree disables Vercel Git deployments for this exact branch in `vercel.json`. Do not merge to a deployment-enabled branch, apply hosted SQL, configure hosted scheduling, or promote a deployment as part of this handoff.

## Connected journey

Builder's native Experience controls and Studio's editable design editor link to `/generation/builder/:projectId` or `/generation/studio/:designId`. The same workbench and engine handle:

1. Authenticated brief and immutable source capture; idempotent durable creation.
2. Proposed creative direction and explicit approval.
3. Native editable candidate generation: Builder's existing validated plans/transactions or Studio pages/layers.
4. Actual private Next preview using the same native renderers as the editors.
5. Browser inspection at 360/390/768/1280px across every candidate page, with immutable private JPEG evidence.
6. Multimodal review of actual evidence in batches covering every page.
7. Zero, one or two allowlisted presentation repairs, followed by the same browser and visual checks.
8. Review and explicit acceptance into the saved draft; no publishing/export/deployment side effect.

Studio format briefs include slides, carousels, portfolios, documents, e-books, static ads, stickers, quotes, social posts and other native designs. Accepted artwork stays editable in the existing Studio and uses its existing export controls. A carousel is an editable sequence of Studio pages; a live interactive website carousel remains a Builder composition. This does not introduce arbitrary source-code execution, third-party asset generation, a new video editor or a new document engine.

## Read the implementation

- `lib/generation/contracts.ts`: shared schemas, bounded brief/repair contracts and persisted states.
- `lib/generation/provider.ts`: direct Anthropic SDK and OpenAI-compatible structured/multimodal adapters; no Higgsfield dependency or automatic provider fallback.
- `lib/generation/targets.ts`: native candidate validation, approved media, locked artwork, bounded style repairs and native Builder transactions.
- `lib/generation/engine.ts`: durable stage orchestration and all-page browser/vision batches.
- `lib/generation/browser.ts`, `preview-token.ts`, `preview-checks.ts`: browser isolation, scoped preview capability and actual rendered checks.
- `app/api/generation/`: authenticated creation/status/control/acceptance and the private preview API.
- `app/api/cron/creative-generation/route.ts`: authenticated recovery worker entry point; **not added to the hosted cron configuration**.
- `supabase/migrations/20261026001108_creative_generation_pipeline.sql`: source-only table/RLS/lease/quota/acceptance/private-evidence migration.
- `scripts/creative-generation-worker.mjs`: serial unattended stage driver, bounded receipts, backoff and graceful shutdown.
- `tests/generation/`, `scripts/verify-generation-local.mjs`, `.github/workflows/creative-generation.yml`: reproducible local acceptance and strict CI gate.

## Durable execution and safety

The generic platform worker supports notifications and fulfillment, but has no persisted creative stages, direction approval, native base, candidate report or transactional document acceptance. This feature uses a dedicated small run table with fenced 110-second stage leases, rather than making a long multi-stage build fit a generic task lease. It reuses the existing atomic account AI reservation and Builder native write authority. `after()` performs one bounded stage after a request; workbench polling resumes queued stages. The included `npm run generation:worker` process continuously calls the authenticated recovery endpoint when no browser is open; it is stopped/uninstalled on hosted environments under the no-deployment instruction. An existing authorized scheduler can call the same endpoint instead. Durable records do not depend on the browser remaining connected.

Provider submission is reserved once per lease before calling the provider. A provider timeout with uncertain receipt is `needs_attention`, not an automatic resubmission. Attempt allowance may be used even on failure/cancellation; UI discloses that. Late workers and cancelled runs cannot commit. Permission is checked at creation, claim, reservation, private preview and completion/acceptance. Business membership removal revokes run/evidence access. Both acceptance paths compare the saved source and retain the previous work: Studio version checkpoint, Builder operation journal plus immutable run base.

Generation or manual revision produces a separately approved complete candidate; it may replace pages/artwork, which the UI states. Automatic repairs cannot change wording, media, links, IDs, page order, locks, ownership, forms, commerce or access. Arbitrary content revisions require reviewing a new candidate or using the existing visual editor. Copy/factual review stays a human responsibility; screenshots cannot certify business claims.

## Runtime setup, intentionally not performed on hosted services

After the user authorizes a release, review and apply the new migration against the actual hosted schema using the normal migration/release procedure. Do not blindly replay unrelated migrations or treat source SQL as applied.

Server configuration:

- Default provider: existing `ANTHROPIC_API_KEY`, existing model default; optional `CREATIVE_GENERATION_MODEL` and existing `ANTHROPIC_BASE_URL`.
- Alternative: `CREATIVE_GENERATION_PROVIDER=openai_compatible`, `CREATIVE_GENERATION_BASE_URL` (HTTPS API base), `CREATIVE_GENERATION_API_KEY`, `CREATIVE_GENERATION_MODEL`. The configured model must support image inputs and forced structured tool output. `CREATIVE_GENERATION_VISION=disabled` disables readiness instead of pretending visual QA passed.
- `CREATIVE_GENERATION_APP_URL`: reachable canonical Kebu origin, HTTPS outside loopback.
- `CREATIVE_CHROMIUM_EXECUTABLE_PATH`: executable Chromium in the worker runtime. Existing `KEBU_CHROMIUM_EXECUTABLE_PATH` is an alternative. Playwright is a runtime dependency; the executable is an explicit runtime provisioning requirement, not an automatic browser download in an API call.
- `CREATIVE_PREVIEW_SECRET`: independent random secret of at least32 characters, server-only.
- Existing Supabase public/server service configuration; existing account AI metering and reservation tables/RPCs.
- `CREATIVE_GENERATION_MEDIA_HOSTS`: optional comma-separated trusted public media hostnames. Exact saved HTTPS media URLs on the configured hosts and `*.supabase.co` are allowed; other worker network destinations are blocked. Preview credentials are only attached to the exact private preview API, never external media.
- Existing `CRON_SECRET` when a recovery scheduler is separately authorized. Worker endpoint: `GET /api/cron/creative-generation`, bearer authentication. One stage per call, bounded120-second route duration. No new hosted cron was enabled here.

### Unattended worker operation

The worker command is implemented and tested; it was not started against hosted services. Once runtime activation is authorized, provision the server configuration above and supply `CRON_SECRET` plus `CREATIVE_GENERATION_WORKER_URL` from a secret/environment manager. The worker URL is the Kebu app origin, not a Supabase or provider endpoint. If unset, it uses `CREATIVE_GENERATION_APP_URL`.

Run `npm run generation:worker` under the deployment's process supervisor. It sends one authenticated request at a time to `/api/cron/creative-generation`, then waits5seconds before the next stage. `CREATIVE_GENERATION_WORKER_INTERVAL_MS` permits1000–60000milliseconds. Multiple supervised workers can share the existing SQL lease/skip-locked authority. `npm run generation:worker -- --once` processes one claim/check and exits; this is a real execution command and can consume a queued request's approved allowance, not a dry run.

The driver never decides that a generation passed and never reads/forwards provider or Supabase credentials. The app endpoint retains quota, permission, lease, repair-budget and acceptance authority. Non-2xx, invalid/oversized receipts and transport failures remain unconfirmed; the process backs off to at most60seconds. It refuses credential-bearing URLs and redirects, redacts response bodies/secrets and bounds requests at125seconds. SIGINT/SIGTERM stops further claims; an interrupted HTTP request does not mean the server stage was cancelled. SQL leases preserve the existing ambiguous-provider/no-rebilling behavior. No hosted scheduler or system service was installed or enabled.

No environment values or credentials are included in this handoff.

## Bounds and actual quality scope

Builder retains its current12-page/100-new-node native plan limits. Studio retains20 pages/64 layers per page,500 characters per text layer and the existing native canvas dimensions. Users choose a maximum generated page count; long supplied text is paginated into editable native layers within those bounds. Larger books need separate documents or a future native document extension; no unlimited-book claim.

Browser stages inspect at most two pages per lease, preserving completed evidence; multimodal stages review at most two pages/four screenshots per call. Every page must finish before readiness. A generation allows at most `2 + ceil(pageLimit/2)*(1+maxRepairs) + maxRepairs` provider attempts; inspection-only allows `ceil(existingPages/2)` and cannot be accepted as a replacement. This is an attempt ceiling, not a promise all attempts will be needed.

Mandatory checks in this slice: native validation, permitted existing media, actual render/runtime failures, four responsive widths, text/bounds/readability, missing images/videos, anchor and internal page links, keyboard reachability, scroll-triggered render, reduced-motion render/running animation detection, size/resource limits and visual review. Native plan schemas do not generate transaction forms/commerce backends; those existing application features retain their independent acceptance gates. Internal navigation is validated and a candidate link is activated without leaving the private preview. Screenshot evidence is full-page; large pages fail the documented budget instead of receiving a false pass.

Budgets:65seconds per two-page browser stage;55seconds per provider submission;16,000px page height;3,000 rendered preview elements;8MB resource transfer where Resource Timing exposes it;2MB private image storage;2,000,000-byte structured model input and parsed proposal output;3,000,000-byte compatible-provider response envelope. Cross-origin resource timing can omit transfer sizes without Timing-Allow-Origin; page-weight measurement is not a complete bandwidth certificate. Non-allowlisted media, missing metrics/assets, oversized model inputs/evidence or incomplete checks stop the run visibly. Performance here is a bounded native preview check, not a Lighthouse or production hosting SLA.

## Verification and remaining release gate

See `docs/audits/KEBU_SHARED_GENERATION_REPAIR_2026-10-26.md` for the final exact results. Local SQL tests execute the actual migration chain and native Builder acceptance function in disposable PostgreSQL (PGlite). Browser tests use the actual running Next previews, preview API and native renderers against loopback transport fixtures. The model transport is exercised with the actual Anthropic SDK and HTTP fixture plus compatible-provider request tests; no paid live model/media call was made. UI transport tests and database tests are identified separately; they are not a claim of managed hosted acceptance.

Production remains unchanged. Hosted migration application, executable/browser provisioning, production provider configuration, an end-to-end paid-model/hosted permission run and scheduler activation remain release acceptance steps after separate user authorization. Missing configuration returns unavailable/unchecked states; there is no success-shaped placeholder generation.

## Recovered review fixes

The uploaded `ff33e9b` patch is applied locally with Claude authorship retained, followed by tighter direct-RPC direction validation and prepared-input bounds. Current independent acceptance:68/68zero skips/failures; full CI6688passed/376explicit skips, TypeScript/lint/build pass. See the audit and its canonical local-acceptance.json for the reproduced gaps, exact scope and runtime hashes. These fixes are not pushed: the reported automatic push rejection remains unresolved. Restore from the recovery archive and use only the permitted source-push workflow. Keep PR22 draft/unmerged and all hosted activation paused.
