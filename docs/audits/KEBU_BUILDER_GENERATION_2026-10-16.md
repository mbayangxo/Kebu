# Builder generation repair — October 16, 2026

Status: local repair TESTED within the evidence limits below; live AI activation and artist-site acceptance remain BLOCKED. This is not a completion certificate for Kebu, Builder or 3J.

## Reproduction and cause

The authenticated live creation journey created unpublished project `a7306f08-673a-4be9-b079-34417a1557d8` for May Lècor. The editor explicitly reported that Yande was not used. The result contained Home/About/Contact, copied design instructions into visitor-facing text, and had generic business content without artist photographs. Manual hero edits persisted after reload; that does not establish AI generation quality.

Read-only Vercel inspection identified the actual project as `kebu` (`prj_P4Ou2No89MPIp1KdmnJHepJ818ED`), which lists `alkebulan-platform.vercel.app` among its domains. Environment metadata requested with `decrypt=false` lists no `ANTHROPIC_API_KEY`; `hiddenProductionEnvCount` is zero. No secret values were read, no configuration changed and no provider request was made.

Source causes:

- `generateWebsiteWithAi` returned `ok: true` and a deterministic fallback on absent credentials, invalid output or provider exceptions. Persistence therefore allocated a project for a failed AI operation, including raw brief text in the template.
- The creation form hard-coded three pages for music, overriding category-aware generator defaults.
- The provider prompt advertised unsupported `spacing: spacious` (schema accepts `airy`) and did not check that all requested pages were returned.

## Changes

- Missing AI configuration returns 503 before template seeding, usage reservation or site persistence. Provider/invalid-output failures return 502 without creating a fallback project. Existing successful-attempt metering remains unchanged; failures after reservation disclose that retry may consume another allowance.
- A real AI success is the only successful result of AI mode. Explicit template/blank/photo creation remains available. Historical drafts no longer claim their non-AI content was generated from the user's words.
- Music defaults are Home, Music, Videos, About and Contact. The user can specify up to eight page addresses. A deliberate one-page request stays one page; omitted pages use category defaults. The shared page helper is client-safe and does not import the provider SDK into the form bundle.
- The generator validates the requested page set, permits one schema/page repair attempt, rejects token-truncated output, uses the provider's system field, corrects the spacing vocabulary and bounds network time/retries. The existing model default is retained; an optional server-side `KEBU_WEBSITE_AI_MODEL` override supports an account-authorized model.
- Prompt instructions forbid copying the creative brief into visitor copy, inventing factual/social proof or using unauthorized faces/media. These instructions are not a claim that all model hallucinations have been technically eliminated.

## Verification

**Final `npm run ci`: exit 0 on Node 24.19.0** — TypeScript zero errors; lint zero errors / 348 existing warnings; Vitest 5,939 passed / 168 explicit skips (358 files passed / 22 skipped); production build passed. Local browser gate: **2 passed**, zero skipped/unexpected/flaky, at 1440px and 390px. It runs the actual Next.js wizard with explicitly controlled HTTP responses and verifies artist defaults, custom page submission, retained brief/name/pages, a visible error, usable retry, unchanged creation URL and no horizontal overflow. Provider calls and persistence in the route/unit tests are mocks; these are not hosted AI or SQL proof.

Initial checks found two environment/harness issues: the existing Chromium binary was truncated, and the existing Turbopack database contained a truncated cache block. Chromium was restored from its installed package; generated build cache was moved aside and regenerated. The first browser attempt after restoring Chromium filled before hydration; the test now waits for the wizard's business-loading response before interacting. No production code bypasses or relaxed assertions were introduced.

Evidence: `evidence/builder-generation-oct16/verification.json` and desktop/phone screenshots in that directory. Native harness cleanup confirms stopped child processes, restored configuration and no leftover fixture routes. Runtime: Node 24.19.0; the Node 20 matrix was not repeated for this repair.

## Release and remaining work

No push, merge, deployment, production migration, provider credential change or paid resource creation was performed. No schema migration is required by this patch.

This checkout descends from verified `1771ce6` plus the Liguey documentation addendum. Claude's later commits (`9204c21`, `769143e`, `1167543`, `0c55b6e`) are not available here. Integrate this narrow repair onto the latest verified continuation before preparing a release; do not replace that newer work with this older checkout.

Before live activation: securely configure an approved provider credential in the intended environment, confirm model access and usage budget, then obtain deployment approval. Test a fresh unpublished artist draft against the genuine provider: all requested pages, authorized May Lècor assets, valid site-local links, no invented releases/contact information, save/reload, desktop/phone design review and failure behavior. The existing generic draft has not been automatically redesigned by this code change. Its observed global `/contact` CTA is a separate unresolved link-resolution issue. Full 3J and the 99-group completion queue remain open.
