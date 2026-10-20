# Kebu Liguey — recovered scope and continuation addendum

Recorded October 16, 2026 UTC; formalized as a standalone product doc October 20, 2026 UTC. Supplements K004, K065–K068 and the original 99-group recovered audit (`docs/KEBU-RECOVERED-REQUEST-AUDIT.md`). This is a scope correction and implementation handoff, not a completion certificate or evidence of code changes in another agent's workspace.

## Name and confirmed requirements

Use **Kebu Liguey**, the name supplied directly by the user and recovered in the October 15 SAFA discussion. Do not invent another name or leave the product indefinitely represented only as an unspecified Jobs/Careers placeholder.

Relevant retrieved history:

- **September 4**: accepted Jobs/Careers scope distinct from Opportunity OS: jobs, internships, apprenticeships, freelance/gigs and remote work; African employers and international roles for Africans, including student, startup, government, creator and research work.
- **September 8**: include people with documented life experience who have not held formal jobs; connect them with people, communities, apprenticeships, jobs and opportunities.
- **September 12**: job/networking platform with chat rooms supporting progress in work, business and life, alongside the requested integrated asset marketplace.
- **September 28**: Jobs and Opportunity OS are distinct products within an optional connected ecosystem; do not reduce Kebu to Builder or merge all opportunity-related products together.
- **October 15**: explicit request that Kebu Liguey is important so Africans can sign up and apply for SAFA work.
- **October 16**: explicit instruction to ensure Kebu Liguey is built and to recover its definition from other chats.

Retrieval returns summaries/excerpts rather than an exhaustive transcript. Dates above are retrieval timestamps and may differ near midnight in the user's local timezone. Do not claim every earlier detail was recovered.

## Product boundaries

- **Kebu Liguey**: employment, recruitment and access to work. The original K066 Jobs/Careers requirement now has its explicit product name. Map relevant K068 project/provider-matching work to this product where governing specifications support it; do not silently decide every marketplace detail from the name alone.
- **Kebu Opportunity OS / standalone Opportunity OS**: preserve their existing distinct definitions and service boundaries. Neither is a substitute for worker/employer/application workflows.
- **Kebu Work / team workspaces (K065)**: organizing ongoing company/project work with roles, tasks, files, documents and collaboration. It can integrate with Liguey but does not replace it.
- **Network, Rooms, Library and Studio**: connected discovery, conversations, files and portfolio/creation capabilities. Reuse verified foundations; do not recreate separate accounts or weaken access boundaries.
- **SAFA**: a connected consumer of recruitment/applications. Kebu recruitment and SAFA language-data production are separate concerns. Recover the current SAFA specification and API contract before claiming the full handoff or implementing its internal task system inside Kebu.

## Acceptance cases to implement or reconcile

These are an implementation decomposition of the confirmed work requirement and existing audit, not a claim that every field or workflow was separately approved in prior chats. Follow authoritative detailed specifications where present; document decisions and surface genuine unresolved product choices.

1. **Worker access and profile**: one Kebu account, durable worker profile, skills/languages, relevant experience and portfolio/evidence. Support informal/life experience rather than requiring a conventional employment record. Distinguish self-reported information from verified qualifications; do not invent credentials, scores or eligibility checks.
2. **Real work discovery**: actual authorized listings with meaningful details, requirements, location/remote eligibility, application method and open/closed state. No invented jobs/employers/pay or static cards presented as real work.
3. **Applications**: create, validate, save/submit, confirm and reload an application; protect applicant information and prevent accidental duplicate submissions. Define any draft/withdraw/status behavior from the applicable specification rather than displaying unsupported controls.
4. **Employer/recruiter workflow**: authorized posting and applicant review with tenant-scoped access and honest decision/status handling. Applicants and other employers cannot access another applicant's private materials or recruiter-only state.
5. **SAFA first connected journey**: a worker can find an actual SAFA role/assignment opening, understand its language/qualification requirements, submit an application and confirm its persisted status. Authorized SAFA reviewers can review it through the approved integration. Test the identity/application handoff and retry/failure behavior; no fake acceptance or claim of task completion from recruitment alone.
6. **Meaningful integration**: connect verified work/portfolio evidence, relevant Network/Rooms conversations and authorized files where specified, preserving private/public visibility and revocation. Broad services/contract/payment workflows remain within K068 and existing commerce requirements, not automatically complete from applications.
7. **Multilingual and mobile**: English, French and Wolof interface coverage, accessible labels/errors/status, stable canonical values and user-authored content. Changing language must preserve drafts. Fluent Wolof review is required; generated or existing dictionary text is not proof of linguistic acceptance.
8. **Verification**: real browser → actual API → scoped SQL → response → reload, independent worker/employer roles, failure and retry checks, unauthorized reads/writes, phone/desktop behavior and appropriate CI. Clearly distinguish local fixture identity from hosted Auth/Storage/provider acceptance.

## Prior assistant proposals that are not automatically approved requirements

Earlier assistants proposed proof-of-work passports, a numeric "70% qualified" explanation, Learn → Build → Portfolio → Apply, detailed interview/hire/pay flows, and SAFA categories such as Record, Speak, Transcribe, Translate, Verify, Dialects, Voice Studio and Dubbing Review. Treat these as proposal/reference material unless accepted elsewhere or already established by governing specifications. Do not fabricate matching percentages, impose fixed 30-minute missions, invent compensation/fees, or claim a voice-cloning product from those suggestions. Any voice reuse/training/cloning capability requires its own explicit authorized purpose and consent contract; applying for work is not blanket consent.

## Shared schema and RLS dependency (business_members)

Investigating Liguey surfaced a genuine `business_members` RLS recursion defect, independent of Liguey itself. Handling guidance: inspect the actual variants, migration-history rules and latest available evidence before changing anything; a narrowly scoped local forward repair can be prepared and tested without declaring the deferred full `businesses`/`business_members`/`business_invites` bootstrap complete; do not copy a privileged helper merely because another module uses one — review its authority, caller identity, execution grants and schema/search-path boundaries; keep the full canonical bootstrap and hosted compatibility gates open until a reviewed actual schema baseline and isolated migration rehearsal are available; never execute archived SQL or mutate production to manufacture evidence. This dependency belongs to shared identity/team infrastructure; fixing it does not itself build Liguey. (Status: repaired as a narrow forward migration — see `docs/audits/KEBU-LIGUEY-AUDIT.md`.)

## Continuation and coordination boundaries

Liguey work proceeds on a Liguey-specific branch, separate from any branch Codex or another agent is using for May's site/Builder/Create work. Do not edit Codex's active May/Builder/Create files, shared auth, root layouts, package files, or the global completion docs (`docs/KEBU-COMPLETION-QUEUE.md`, `docs/KEBU-RECOVERED-REQUEST-AUDIT.md`) without coordinating first. Liguey evidence lives in `docs/audits/KEBU-LIGUEY-AUDIT.md`, a Liguey-specific audit, not scattered into the global queue. Any proposed change that would touch shared files is reported separately rather than applied unilaterally.

Add Liguey explicitly to K066 and cross-reference K004/K065/K067/K068. Preserve every original group, completed 3C–3I and full 3J acceptance requirements. Inspect existing implementation before building duplicate foundations. Select and complete one real acceptance case at a time while continuing independent work around external blockers.

No push, merge, deployment, production migration/change, DNS change, purchase, paid-infrastructure action, or external message is authorized by this addendum. User approval remains required at those boundaries.
