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

## October 23 continuation — independent Studio copies
- Base reconciled by fast-forward to authoritative `4d2d96d42ab92a47386c2c6b2e8aba168c956cec`; workspace check passed clean/ahead0/behind0.
- Current base contains Studio marquee, Claude sync, hosted-release and payment-adapter branches. Hosted-release is 24 commits behind this base; payment adapters 33 behind. Older `claude/alkebulan-files-migration-aty6p0` diverges (648 current-only / 56 old-Claude-only); deliberately not merged. No checkout replay or Claude branch mutation.
- Reproduced Studio copy collision: selecting a copied grouped layer expanded selection to its original. Original focused suite: 1 failed/6 passed. Fix assigns fresh group identities per duplication, page-copy and paste operation, preserving copied membership and separating repeated copies.
- Focused final tests: 18 passed across canva-editor, editor-craft, editor-selection-movement. New browser regression covers grouped duplicate movement, undo, save/reload and original preservation; full CI/browser results pending at this checkpoint.
- Local Chromium installation failed with truncated/non-ZIP downloads; do not claim local browser acceptance. Dedicated Studio workflow includes this branch and expects 45 full cases (previously44), preserving existing touch and marquee regressions.
- Fresh hosted read-only catalog check: `reserve_account_ai_generation(uuid,uuid,uuid,integer,text)` absent; `yande_interactions` absent; usage RLS enabled but authenticated usage-table writes still granted. No migration or hosted write performed. This is catalog evidence, not JWT/RLS acceptance.
- Fresh Vercel provider read: production remains READY on `dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2`, source `71815f99c50022482e545e22e1f6e040ee1cafe4`. No promotion.
- Next: inspect CI/browser evidence for this exact source; fix any failures, then integrate verified checkpoint without overwriting newer remote work. Hosted schema reconciliation, signed-in acceptance, May portfolio and all25 Creative OS groups remain open.
