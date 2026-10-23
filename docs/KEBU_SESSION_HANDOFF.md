# Kebu — Session Handoff and Recovery

Updated: 2026-10-23
Status: historical context recovered; branch reconciliation and hosted verification outstanding.

## Source of truth
GitHub commits and reviewed branches are authoritative for code. Chat conversations are not a substitute for commits. This handoff is a planning record, not proof of feature completion.

## Verified repository observations
- Repository: mbayangxo/Kebu
- At this checkpoint main was 71815f99c50022482e545e22e1f6e040ee1cafe4 (September 19).
- Newer work branches exist, including work/claude-sync-oct20, work/codex-builder-frame-verified-oct21, work/codex-hosted-release-oct21, work/codex-studio-marquee-oct22, work/codex-payment-adapters-oct21, work/codex-yande-experience-oct22.
- Presence of branches does not prove they are merged, tested, or deployed.

## Product requirements retained
- Builder: advanced visual website creation, responsive layout, original design capabilities, save/publish, production-grade UX.
- Studio: immersive creative operating system with dedicated canvas workspace, return navigation, versions, media/design tools, exports, templates.
- Shared account and hosted Supabase Auth/RLS, permissions, publishing, billing, and payments must work end-to-end.
- Search and Mail are distinct major workstreams; Mail is not established as a functioning provider.
- Kebu Type Foundry: 12 original font families first; scale later; clear licensing and original outlines.
- Avoid repeating stale checkout tasks or overwriting Claude/Codex changes.

## Next actions
1. Compare all recent work branches against main and one another. Identify conflicts and authoritative branch for each subsystem.
2. Inspect code and test results for Builder and Studio; record feature-level pass/fail evidence.
3. Verify hosted Supabase Auth/RLS, real user journeys, deployment status, and provider integrations. Do not claim production-ready based on local tests.
4. Merge only reviewed nonconflicting work through appropriate PRs and deploy after checks.
5. Update this file after each significant work session with commits, tests, blockers, and the exact next action.

## Session protocol
At the beginning of each new session, read this handoff and recent GitHub branches. At the end, commit changes and update handoff. Never mark work saved unless GitHub confirms a commit SHA. Never claim a deployment without deployment evidence.
