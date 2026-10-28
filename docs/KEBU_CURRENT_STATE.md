# Kebu — current development state

This is the current status entry point. Older dated handoffs and audits are historical evidence, not current readiness claims.

## One development line

Use `work/kebu-completion-audit-oct13`. The local branch includes the fetched authoritative checkpoint plus the reviewed additions listed below. The deployed site has not changed. Reviewed source is being shared on this branch through the GitHub connector; use the fetched remote SHA as the durable checkpoint. Do not switch to old feature branches as a new base. Preserve their history until their unique patches are classified. The user authorized source updates to GitHub on October 28. Do not deploy, apply hosted migrations or activate workers.

Source before this status update: `c9d41d544e05adf9d2d841bc994a3817467a1b78`. The complete fetched-ref inventory is [BRANCH_CONSOLIDATION_2026-10-26.json](audits/BRANCH_CONSOLIDATION_2026-10-26.json): 45/55 remote tips are ancestors of the local development line; 10 divergent/historical tips still require patch review. A divergent tip can contain changes already reconciled differently, so it is not a count of missing features.

## May draft verification — October 28

See [the current May audit](audits/KEBU_MAY_LOCAL_DESIGN_2026-10-28.md). The private native candidate has 14 pages. Scene text and shaped videos are editable through normal Builder controls. Canonical editing, legacy page actions, direction planning and generation now agree with website-v1’s 20-page limit. The new page-limit migration is tested locally, not applied to hosted Supabase. Original image files and the previously missing local condensed font have been recovered. This is not hosted launch or exact reference-motion certification.

## Incorporated locally

- Shared Builder/Studio generation pipeline and recovered review/security fixes; phone draft reopen regression.
- CLI-generated forward direction-validation migration and original generation migration restoration; repeated-text preservation fix.
- Claude Search Business/Products and additional modes through `8dfc5fd` (Opportunities, People, Research, Trade, Africa, Culture).
- Packaged Chromium preparation through `2203999`.
- Type Foundry specification `8ed2a2f`; the specification is not an implementation claim.
- Inspector verification checkpoint `8854ded`; preserved Mail attachment origin guard and tests from the other Codex checkout.
- Claude sync and May contact work were already ancestors; not replayed.

## Still pending consolidation

- Claude's Search journey verification `96a847e` and current Stores/Payments audit package. Do not duplicate Claude's payment work or claim the two old fulfillment patches are integrated until checked.
- Ten historical divergent tips remain in the inventory, including older Studio/Liguey/Yande/Mail lines. Three equivalent histories (generation review, access errors, Afrique ID security) were reconciled without runtime changes. Network language support from 1167543 was genuinely missing and is now recovered. The two digital-fulfillment implementations are already present in lib/shop/digital-downloads.ts; their unmerged commit IDs alone do not establish missing code. Preserve later shared changes; do not bulk merge obsolete implementations.
- Newer reported May composition checkpoints `814fa63` / `9f46081` are absent from the available object database. The newer composition is not certified from chat descriptions.

## May Lècor main site — not finished

The requested reference is Ksendr's Legally Blonde composition, with May's own content and original photos, adapted across desktop/tablet/phone. Existing May data must be preserved; the actual published project is `c11f9749-2d33-46d1-9649-8d762db4ce25`. A generic signed-in draft or five-page fixture is a different project, not acceptance of the real portfolio.

Current source already uses a shared edit/preview collage renderer. This supersedes the older source-parity defect; it does not certify the live site or the complete design. The latest available owner-site readback audit (October 22) records 13 saved pages and remaining Russian-artwork/checkerboard/layout/social-link defects. Fresh read-only production metadata during consolidation confirms the same project still has 13 pages / 36 sections and updated_at 2026-10-17T04:15:23.507328Z. No owner-site write or fresh hosted acceptance was performed. The page inventory has no separate Contact page, and Home/Music share sort_order 1. These need resolution through an authorized native edit; they have not been silently repaired with admin SQL.

Remaining May acceptance: recover or rebuild the missing approved composition; verify every intended page and destination; finish reference-inspired scroll choreography, masks, text reveals, interactive cutouts and music/video scenes; use approved clean assets without changing May's face; check desktop/tablet/phone and reduced motion; verify normal Builder editing/save/reload/publish parity. Read [exact-reference acceptance](audits/KEBU_MAY_EXACT_REFERENCE_ACCEPTANCE_2026-10-18.md). Main-site completion cannot be inferred from Builder capability tests.

## Validation and release boundary

First combined run at `38fc6ee`: TypeScript and lint passed (346 existing warnings); tests 6743 passed / 400 explicit skips. Build rejected an external node_modules symlink; this is a local environment failure, not an accepted build. Newer Search/browser integration requires a fresh exact-source check. Final combined source `1250e99` passes full local CI: TypeScript, lint (zero errors / 346 existing warnings), 6745 tests passed / 414 explicit environment skips, and a successful production build with 231 prerendered pages. Strict generation on the same runtime passes 73/73 with zero skips/failures, including 25 actual local PGlite SQL cases and 7 actual Chromium/Next cases. The browser run used Chromium 143.0.7499.0 and fixture AI/vision responses; it is not live-provider or hosted-user acceptance. The packaged dependency is installed at the lockfile version 140.0.0. Its extraction failed in this sandbox with a chown EINVAL; the packaged browser remains unverified on Vercel.

The generation approval fix passed 25 local PGlite cases before consolidation. It is now a CLI-generated forward migration at `supabase/migrations/20261027022036_creative_generation_direction_validation.sql`, tested locally and not applied hosted. Production still has the earlier validation according to the last read-only inspection. Real AI-provider, signed-in hosted isolation, payment/email integrations and production parity remain separate open acceptance items. No API/provider key, customer data, DNS, production schema, worker, or deployment changed.

## Recovery of this consolidated work

A local recovery bundle is prepared against the durable remote base `1f677e7145cdc117c3a87e34ffd11c7f81b774ab`. It contains the included development history; it does not include missing Claude local work or claim that every divergent historical branch has been accepted. Restore that exact base from GitHub first, then verify and fetch the bundle. Keep the no-push/no-deploy hold.

## Network recovery and continuity protection

Recovered Claude's Network English/French/Wolof slice as `328fc49`, preserving the current pending-submission fieldset. Unit tests 32 pass. Eight actual Chromium/local-PGlite journeys pass with zero skips/unexpected/flaky outcomes, including French canonical enum submission, switching language without losing a draft, Wolof's unreviewed-translation notice and blocked-storage behavior. These are loopback auth fixtures, not real hosted GoTrue acceptance. Full local CI on this application runtime passes 6745 tests / 414 explicit skips, TypeScript, lint zero errors / 346 warnings, and the 231-page production build.

The continuity check now rejects a worktree missing commits from the local consolidated branch even when it matches GitHub. Two isolated Git-repository regression cases pass and preserve dirty work. The same guard script was copied to the preserved older checkout so its workspace check also enforces this gate; its application/Mail work was not overwritten. Source push and deployment remain forbidden under the current hold.

## Final consolidated validation and public-site readback

Exact source `cc121362987727e1be6d318fb365972d076196b6` passes full local `npm run ci`: TypeScript, lint (zero errors / 346 existing warnings), 6747 tests passed / 414 explicit environment skips and the 231-page production build. The extra two tests exercise the local continuity guard. A fresh bare repository fetched only the durable GitHub base, verified the incremental recovery bundle and restored the consolidated branch successfully. Source tree equality is checked separately before packaging.

A fresh public-browser navigation to https://www.maylecor.com/ displays “This deployment is temporarily paused.” No page editing, sign-in, publication, production write or Vercel action was performed. This is a current hosted availability blocker, distinct from the unfinished May design and the successful local build. The Russian reference URL returned HTTP 402 through retrieval; the Behance page returned 403. Do not claim a new exact-reference visual comparison.

The merged historical Search cron requests a 15-minute schedule. Earlier Vercel Hobby limits rejected that schedule; release requires confirming an adequate scheduler/plan without silently downgrading the product requirement. No cron or worker was activated here. Claude's ongoing audit package and ten conflicting historical tips remain pending; this is one local development line, not a declaration that all Kebu products or May's site are finished.
