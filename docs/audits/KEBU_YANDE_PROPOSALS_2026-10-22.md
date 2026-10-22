# Yande proposal transport and media authority — 2026-10-22

Runtime: `5cd43a35e5f8379124ab71cc2568be3eeddeae2b`, integrated on the authoritative recovery branch. This is a verified implementation checkpoint, not platform completion or production acceptance.

Restored the missed Claude Builder improvement and native Experience call sites onto the shared Yande transport. Kept the configured models, thinking, timeout, forced submit_proposal protocol, cancellation, immutable proposals, canonical writes and quotas. Both improvement routes pass the authenticated owner; cross-origin checks execute before auth/body/write, and missing provider configuration is rejected before reserving quota. Apply also checks origin before mutation. Provider failures return safe messages. Structured validation errors retain actual token accounting.

An actual SDK HTTP fixture reproduced valid model output replacing an approved hero photo. The shared recursive media policy now permits only saved references for improvement and supplied photoUrls for generation, including nested/device overrides and CSS url references. Complex escaped CSS is retained only unchanged. Generation now includes the supplied photoUrls in its prompt and allows one schema repair; invalid media never becomes a fabricated successful site. This verifies exact-reference authority, not ownership/licensing, image quality, broader facts or all links.

## Verification

Original generation baseline: 18 failed / 6 passed. Original proposal baseline: 32 failed / 18 passed of 50. Candidate: 24 generation + 54 proposal/authority/API + 4 actual usage SQL tests passed. Installed provider SDK requests reached loopback fixtures only. No real model call or money movement.

| Gate | Exact-source run | Result |
| --- | --- | --- |
| CI | [39730974041](https://github.com/mbayangxo/Kebu/actions/runs/39730974041) | 6602 passed; 338 explicit skips; TypeScript, lint (0 errors/346 existing warnings), finalized build |
| Yande | [39730974071](https://github.com/mbayangxo/Kebu/actions/runs/39730974071) | 24 generation + 54 proposal/authority + 4 SQL passed; 0 skips |
| Native SQL | [39730974190](https://github.com/mbayangxo/Kebu/actions/runs/39730974190) | 10 unique × 3 mandatory = 30 passed |
| Builder SQL/browser | [39730974024](https://github.com/mbayangxo/Kebu/actions/runs/39730974024) | 77 passed; 9 strict performance probes; normal cleanup |
| Studio | [39730974032](https://github.com/mbayangxo/Kebu/actions/runs/39730974032) | 44 full + 6 mandatory phone/tablet = 50 passed; 0 skips/flaky/retries |
| Platform | [39730974003](https://github.com/mbayangxo/Kebu/actions/runs/39730974003) | 20 SQL suites + 21 browser cases passed |
| Public production smoke | [39731239021](https://github.com/mbayangxo/Kebu/actions/runs/39731239021) | 533 passed; 35 explicit skips; not the 26 authenticated hosted acceptance cases |

Local full CI also passed 6602 tests with 338 explicit skips. All seven gates ran against the runtime above. The preview is READY: https://kebu-nbewqgfux-mbayangxos-projects.vercel.app . Production was not promoted. The 98 canonical migration files are unchanged by this slice. Existing hosted schema, session/RLS acceptance, real providers and actual May site acceptance remain open.
