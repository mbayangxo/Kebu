# Yande shared gateway — implementation audit (October 20, 2026)

User-directed: consolidate Yande AI into "one common gateway... one system," with real usage logging as the honest first step toward "continuously learns" (not a claim that learning exists yet), and a design that doesn't need rearchitecting when an MCP tool connection is added later.

Working branch: `work/kebu-yande-gateway-oct20`, created from `work/kebu-completion-audit-oct13` at `4a7eb05` — the same shared checkpoint every other branch this session is built from.

## What exists and what this touches

Confirmed by direct investigation before writing anything (not assumed): "Yande" was real but fragmented across at least four independent direct-Anthropic call sites:

1. `app/api/yande/assist/route.ts` — the site-wide floating chat assistant.
2. `lib/create/ai-improve.ts` — Builder's "AI improve."
3. `lib/studio/ai-generate.ts` — Studio's AI generation.
4. `lib/create/experience-model-gateway.ts` — one existing, already well-built structured-output gateway (tool-forced JSON, prompt-injection discipline) with exactly one caller (`app/api/projects/[id]/experience-engine/route.ts`).

Also found while scoping: this session's own Liguey work added a **fifth** independent call site (`lib/liguey/applicant-insight.ts`, built earlier today, before this consolidation was requested).

**Decision — only (1) and (5) are touched in this round.** (2), (3), and (4), plus their route and test files, sit under `lib/create/`, `app/api/projects/`, and (adjacent, same continuation effort) `lib/studio/` — territory this session's standing instructions mark as another agent's (Codex's) active Builder/Create/Studio work, not to be edited without coordinating. Touching them now would mean editing files someone else is concurrently working on, risking a real merge conflict, not just a code-quality risk. This is flagged to the user as a decision point, not silently skipped or silently done anyway.

## Built

- `supabase/migrations/20261020001000_yande_shared_gateway.sql` — `yande_interactions`: one real row per model call (feature tag, mode, user id, model, outcome, token counts, error message), RLS so a user can read their own usage and nothing else, writes restricted to `service_role`. `feature` is format-checked (lowercase snake_case), not an exact-value CHECK constraint — deliberately, because this repository already has one broken migration (`20261010134141_atomic_account_ai_reservations.sql`, found during the Liguey Yande work) that took the exact-value-list approach and had to be abandoned as new features arrived; this avoids repeating that failure mode.
- `lib/yande/gateway.ts` — `yandeChat()` (free-text, for the assistant) and `yandeStructured()` (tool-forced structured output, generalizing `experience-model-gateway.ts`'s already-proven pattern so other features can use it without copying it). Both: a shared `YANDE_IDENTITY` preamble prepended to every system prompt ("one system... not a separate bot per feature," plus a standing prompt-injection defense), a single configured-model constant, a clean thrown error with no fake fallback when unconfigured or when the model's response doesn't fit, and a best-effort usage-log write that can never fail or block the real response (wrapped in its own try/catch).
- Migrated `app/api/yande/assist/route.ts` to call `yandeChat()` instead of constructing its own `Anthropic` client. Response codes/behavior preserved exactly (503 unconfigured, 400 invalid body, 401 unauthenticated, 502 on model failure) — this was a drop-in migration, not a rewrite of the route's own logic (auth, per-user context building, rate limiting all untouched).

## Verified for real

- `tests/yande/gateway.test.ts` (8 mocked-Anthropic-SDK cases) — refuses to fake a reply/result when unconfigured; a real successful chat call is logged with the right feature/outcome and the shared identity preamble is actually present in the system prompt sent to the model; a failed call is logged as `error` with the real error message, not swallowed; a logging failure (service client throws) never breaks the real response; structured mode forces `tool_choice`; fails closed (no fabricated fallback) when the model skips the tool or returns schema-invalid input; an oversized input is rejected before ever calling the model.
- `tests/yande/assist-route.test.ts` (5 mocked-route cases) — 503 without attempting auth when unconfigured; 401 unauthenticated; 400 invalid body; a real call routes through the gateway with the real feature tag (`chat_assistant`) and real user id; 502 on gateway failure, never a fabricated reply.
- `tests/yande/interactions.local.test.ts` (4 real-SQL PGlite cases) — a user reads their own usage, a stranger reads none; an ordinary authenticated session cannot insert/update/delete usage rows at all (grant-level denial, not just RLS — found and fixed a gap where the migration only revoked privileges from `anon`, not `authenticated`, so writes were silently caught by RLS instead of failing at the stronger grant level the rest of this codebase uses for sensitive tables); a malformed feature tag or invalid mode/outcome is rejected by the schema; a system-level interaction with no associated user is accepted (`user_id` nullable).

**Full validation gate**: `tsc --noEmit` 0 errors; `eslint` 0 errors/0 new warnings; `vitest run` 6036 passed/255 skipped without `KEBU_LOCAL_PGLITE_ROOT` (same 3 pre-existing hosted-QA-only failures, unrelated), 6174 passed/117 skipped with it set, all real-SQL files passing; `npm run build` exit 0.

## Explicitly open

- `lib/create/ai-improve.ts`, `lib/create/experience-model-gateway.ts`, `app/api/projects/[id]/experience-engine/route.ts`, `lib/studio/ai-generate.ts` remain on their own direct-Anthropic call paths — full consolidation needs these migrated too, and that decision (proceed into Codex's active territory now, or coordinate/wait) belongs to the user, reported separately rather than acted on unilaterally.
- `lib/liguey/applicant-insight.ts` (this session's own prior work, on a separate branch, `work/kebu-liguey-yande-oct20`) is the one call site safely within this session's own scope to migrate — done as a separate commit on that branch, not here, to keep each branch's diff reviewable on its own.
- "Continuously learns" / MCP connection: not attempted beyond the usage log above. Actual learning (retrieval over past interactions, fine-tuning, memory) and an MCP tool connection are both separate, substantial pieces of work this round does not claim to have started.
