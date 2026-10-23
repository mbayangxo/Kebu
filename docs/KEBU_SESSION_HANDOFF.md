# Kebu — Session Handoff and Recovery

Updated: 2026-10-23
Status: branch ancestry checked; hosted authenticated acceptance and production promotion OPEN.

## Source of truth
GitHub commits and reviewed branches are authoritative. This document records evidence, not release certification.

## Reconciliation evidence (2026-10-23)
- main: 71815f99c50022482e545e22e1f6e040ee1cafe4 (September 19).
- work/claude-sync-oct20 is 609 commits ahead of main, zero behind.
- work/codex-builder-frame-verified-oct21 is 623 ahead of main, zero behind.
- work/codex-studio-marquee-oct22 is 637 ahead of main, zero behind.
- Comparing Claude sync to Studio marquee: Studio marquee is 28 ahead, zero behind. Comparing Builder frame verified to Studio marquee: Studio marquee is 14 ahead, zero behind. These two branches are ancestors of Studio marquee; do not independently replay their work.
- work/codex-hosted-release-oct21 is 618 ahead of main; ancestry relative to Studio marquee not yet established.
- work/builder-p0-stabilization removes many unrelated app routes relative to main; DO NOT merge without detailed review.
- No merges, promotions, or changes to Claude's branches were performed during this checkpoint.

## Existing Studio evidence (read from docs/audits/KEBU_STUDIO_SELECTION_2026-10-22.md on Studio marquee)
- Remote CI run 39724550969: TypeScript/build passed, 6,536 tests pass, 338 skipped, 347 existing lint warnings.
- Browser run 39724550965: 44 passes; studio marquee, cancellation and editor regressions covered.
- Hosted public smoke run 39724697662: 533 passes, 35 skipped; NOT authenticated hosted acceptance.
- READY preview reported: kebu-3f6qrxx6n-mbayangxos-projects.vercel.app; production not promoted.
- These results are recorded from the branch audit, not independently rerun this session.

## Product requirements
- Builder: immersive responsive visual creation, editing, saved projects, publishing, strong design/reference parity.
- Studio: immersive creative OS, isolated canvas, back navigation, versions, rich tools, exports, templates, collaboration.
- Hosted Supabase Auth/RLS, permissions, publishing and integrations must be verified against hosted services.
- Mail provider implementation and Type Foundry original fonts/licensing remain separate workstreams.
- Preserve Claude's work, avoid stale checkout tasks.

## Open blockers and next implementation actions
1. Compare Studio marquee with hosted-release, payment, and latest Claude branches in both directions; select nonconflicting base.
2. Inspect Builder and Studio remaining feature gaps and implement isolated, testable changes on a dedicated branch.
3. Secure hosted QA access and production schema prerequisites; run signed-in Auth/RLS, publishing and integration acceptance.
4. Verify deployment status with actual deployment provider, not only a recorded preview URL.
5. Merge only reviewed changes via PR after passing CI; do not infer production readiness from local fixtures.

## Session protocol
Update this file with commit SHA, actual test evidence, deployment status, and next action. Do not mark tests passed unless run or independently verified. Never overwrite existing feature work.
