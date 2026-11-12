# KEBU completion audit and build queue — November 5, 2026 (New York)

**Full scope is still open.** This is a requirements-to-source audit, not release certification. Baseline: `9d168e4a1cc39e88bdc3edd143d8e4f86867f7ec` on `work/kebu-completion-audit-oct13`. The audit inventoried all tracked application, library, database and test paths; inspected selected implementation bodies and branch differences, and ran focused publishing and cancellation regressions. It did not execute every flow or read every line. Repository evidence covers 99 recovered KEBU groups and 25 Studio groups; available conversation retrieval supplements the register but cannot establish that every past conversation was recovered. No production write, payment or deployment was made.

**Evidence split:** GitHub [CI 42153333710](https://github.com/mbayangxo/Kebu/actions/runs/42153333710), local browser/SQL and native PostgreSQL gates passed at the audited baseline; [hosted Builder acceptance 42153333594](https://github.com/mbayangxo/Kebu/actions/runs/42153333594) was skipped. [Hosted QA commerce database smoke](KEBU_QA_COMMERCE_VERIFICATION.md) passed with rollback-only fixtures. Vercel production metadata still identifies `71815f99`; newer work is not on that deployment. Broad hosted QA, real provider testing and launch are open.

## Execute in this order

| Priority | Area | Remaining work | Proof to close |
|---|---|---|---|
| P0 | Claude branch reconciliation | Review money, team and concurrency fixes first. Reconcile feature branches rather than overwrite newer source. Resolve conflicting migration version `20261027040000` (AfriID vs Opportunity explore). | Exact integrated diffs, unique migration versions, focused regression and full CI. |
| P0 | QA and preview | Align migration history without replaying the approved QA batch; add only approved missing schema, configure isolated preview, keep production separate. | Fresh/upgrade compatibility, QA Auth/RLS, two users and actual preview URLs. |
| P0 | Accounts, access, privacy | Bring in consent/control-center work; harden invites, claims and verified identity. Resolve signup audience and free-site cap before policy changes. | Signup, recovery, personal/business switching, session revoke and wrong-user denial. |
| P0 | Commerce | Reconcile cancel/restock and all payment write paths, renewal/autopay concurrency and Reach CPC; verify buyer/seller/admin, balances, returns and paid private files. | Actual preview journeys, payment-provider sandbox, no duplicate debit/restock/ledger events. |
| P0 | Builder and May | Legacy publish cache patch verified by the route regression; finish exact saved-site and ordinary-user creation/publish, mobile, domain and rollback. | Verify actual saved May project and independent edits by phone and desktop. |
| P0 | Studio and Yande | Close all 25 groups individually; preserve Claude's tracks/captions/live cursors; finish production-quality editable outputs and exports. | Two actual sessions, decoded video/audio, provider-backed generation and persistence. |
| P1 | Mail, Support, Search | Reconcile shared mailboxes; verify external delivery; finish complete economic search and managed jobs. | External test inboxes, failure evidence, indexed real sources and scheduled refresh. |
| P1 | Work and Business | Finish Library, calendar, Rooms, Liguey, Network, business verification, analytics and billing. | Independent user/role flows, authentic sources and approved partner contracts. |
| Build | Full products still missing | Full installable Browser, Docs editor, Sheets, Slides, calling/meetings, app Cloud, navigation Maps and verified business scoring. Cinema/Worlds and people-to-project matching also need full implementations. | Real vertical slices, not routes, redirects or static UI. |
| Sequenced | Ecosystem and later scope | Finish Exchange entitlements and supplier/buyer workflows; gate third-party runtime and corporate adoption after first-party reliability. | Creator/buyer and developer trials; keep TAKK, KA, standalone Opportunity OS and JOKKO separate from KEBU integration scope. |

## Claude work: dispositions that affect the queue

| Branch / tip | Disposition at baseline | Next action |
|---|---|---|
| November consolidation `0a41a3ae`, audit `f510ff13`, tightening `1f8a69b9`, Chromium `c1fef284` | Ancestors. Includes shipping, fulfillment, May video/community, support, security dashboard and marketplace split work. | Retain; verify managed browser and provider acceptance. |
| Builder/Studio verification `b721d387` | Legacy cache patch was absent: shared publish invalidated only native sites. Reproduced 1 failure / 4 passes; Claude's two-file patch gives 5/5. | Preserve attribution; verify actual legacy public page refresh in hosted preview. |
| Accounts `db1aa20d` | Invite concurrency patch and dedicated tests absent; shared source still does separate read/insert. | Reproduce with concurrent requests and integrate without broadening unique-violation handling. |
| Stores/payments `7be9cdbb` | Paid-once migration and cancel replay tests absent; sequential cancellation replay reproduced (stock restore called twice). Claude’s narrow route patch now passes 2/2; concurrent cancellation and durable recovery are still open. | Trace every payment writer, prove concurrent cancellation and reconcile the proposed ledger constraint with hosted schema/data. |
| Operations `eab766e9` | Renewal-claim and schedule tests absent; shared cron records renewal attempt after provider call. | Prove claim ordering and provider idempotency; review schedules before activating. |
| Reach `73de6f10` | Atomic CPC migration and race tests absent. | Reconcile wallet charge and event replay before running paid campaigns. |
| Account controls `8985d8ac`, AfriID depth `7911852e`, claims `2681a823` | Key APIs/components/tests absent from shared source. | Port and verify UI→API→RLS, with consent and sensitive-document boundaries. |
| Shared mailboxes `c3a5819d` | Manager, shared API and migration absent; existing personal/business Mail remains. | Reconcile branch before rebuilding; prove sharing and revocation. |
| Opportunity `7a541325` / `02e6ac65` | Discovery, trade/import replacement pages and trust-label work absent. | Resolve migration version collision with AfriID; validate provenance and apply no unapproved schema. |
| Domains `5dd02fa1`, cart recovery `d45e7baf` | Cross-site domains API absent; cart recovery files exist but differ. | Compare behavior before importing; prove ownership and exact line-item recovery. |
| Studio captions `45015d64`, cursors `43401dd3`, tracks/keyframes `64b7c453` | Not ancestry-merged, but caption test identical; cursor/track/keyframe paths present with later changes. | Retain present work; review only residual differences and verify hosted use. |

A non-ancestor tip is **not** proof its work is absent. Never merge an entire branch based on this table. Review overlap, migration IDs and tests against the current shared baseline.

## Later accepted work and product boundaries

| Area | Evidence at baseline | Finish or verify |
|---|---|---|
| Kebu Record and help | November help, two-way replies, account context and security/failure feed integrated. | Verify two-user access, operator workflow, real mail receipt and alert coverage. |
| May’s World | Fan community, actual footage source and opening-motion candidate exist. | Verify saved project ownership, all approved pages/scenes, participation/moderation and reduced motion. |
| Native Experience 3C–3J | Shared creative core, versioned snapshots, motion, gateway and operation history exist. | Finish the named showcase matrix through ordinary editable projects; keep legacy and native paths independently safe. |
| Kebu Exchange and Aesthetics | Creator assets/templates, entitlement and payout routes exist; November 85/15 source integrated. | Inventory apps, agents, workflows, skills, services and assets separately. Verify licensing, creator earnings, trust, moderation and buyer/supplier workflows. |
| Developer and corporate readiness | Developer app/catalog surfaces exist. The Claude register identifies the adapter as unintegrated. | Verify scoped identity, permissions, APIs, actual runtime/integrations and distribution, then docs, reliability, support and procurement in trials. |
| Type Foundry | Fonts and design work exist; separate type-foundry design branch inventoried. | Verify licensing, glyph coverage, readability and real export; specimen images do not count as a usable family. |
| Low-data, ownership and privacy | Shared infrastructure, localization and isolation tests exist. | Prove saved work, export/control, data saver, offline recovery and wrong-account denial across products. |
| Security and operations | CI, monitoring and selected race coverage exist. | Close known branch divergences, verify webhook/provider guards, scoped secrets, restore/rollback and supervised workers. |
| Separate ecosystem products | TAKK developer infrastructure, KA identity, JOKKO and standalone Opportunity OS have their own product boundaries. | Track only KEBU integration contracts here; do not count separate implementations as KEBU completion. |

## Patches verified in this audit

- Legacy publish cache: Claude tip `b721d387`; targeted regression failed on baseline (0 invalidation calls), then passed with the focused route patch. Native publish and ownership boundary cases still pass.
- Cancel replay: Claude tip `7be9cdbb`; sequential replay restored stock twice on baseline, then exactly once after the route patch. This does not prove simultaneous cancellation or partial failure recovery. The separate ledger-index migration was not integrated or applied.
- Combined targeted run: **7 passed, 0 skipped**. Both patches require current shared CI and the real preview journeys before release.

## Requirement-by-requirement remaining work (99 groups)

Source of scope: [recovered requests](../KEBU-RECOVERED-REQUEST-AUDIT.md). Paths indicate where to start verification; the status is deliberately bounded and never based on a filename alone for release closure.

| ID | Requirement | Status | Source anchor | Finish or verify |
|---|---|---|---|---|
| K001 | Economic operating system for life, work, creation and business; not only a website builder | Partial | `app/layout.tsx` | Close the individual product rows below; shell coverage is not product coverage. |
| K002 | One identity/login across all products; Sign in with Kebu | Partial + branch | `app/account/page.tsx` | Reconcile Claude’s consent control center; prove one login and personal/business isolation across products. |
| K003 | Separate Personal and Business contexts; optional product use | Partial + branch | `app/account/page.tsx` | Reconcile Claude’s consent control center; prove one login and personal/business isolation across products. |
| K004 | Africa-focused affordability, mobile, low-bandwidth and local currencies/languages | Partial | `lib/locale.ts` | Measure low-data and offline flows and verify currency and language coverage per product. |
| K005 | Global core products versus Africans-only eligibility | Decision | `app/signup/page.tsx` | Resolve explicit African-only signup behavior versus global-core product policy before changing access. |
| K006 | One free site | Decision / mismatch | `lib/billing/plans.ts` | Code permits four free sites; recovered requirement says one. Confirm current plan before changing entitlements. |
| K007 | $2 per active paid site; five sites $10 | Partial / policy | `lib/billing/plans.ts` | Prove per-active-site charges, student eligibility, local prices, fees and branding entitlements against agreed catalog. |
| K008 | Student affordability around $1; verified access | Partial / policy | `lib/billing/plans.ts` | Prove per-active-site charges, student eligibility, local prices, fees and branding entitlements against agreed catalog. |
| K009 | Discounts/local pricing; transparent transaction fees | Partial / policy | `lib/billing/plans.ts` | Prove per-active-site charges, student eligibility, local prices, fees and branding entitlements against agreed catalog. |
| K010 | Free tasteful Kebu branding; paid removal; scale by capability/usage | Partial / policy | `lib/billing/plans.ts` | Prove per-active-site charges, student eligibility, local prices, fees and branding entitlements against agreed catalog. |
| K011 | Long scrollable canvas and page height control | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K012 | Footer at document end; smaller/lower/movable/resizable | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K013 | Editable/movable header, logo and favicon | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K014 | Remove forced bottom Add-section strip; contextual/panel insertion | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K015 | Anything draggable, including free-positioned overlapping elements | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K016 | Image resize, alignment, crop/fit, rotation and layering | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K017 | Add editable images and text as ordinary objects | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K018 | Pixel font sizes; family, weight, spacing, line-height and typography | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K019 | Only selected inspector accordion open; selected children only; less clutter | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K020 | Stable selection while editing; organized Pages/Layers/Assets panels | Implemented in part | `app/create/[id]/page.tsx` | Verify this specific editor control on legacy and native drafts, touch and desktop, with save/reopen and published parity. |
| K021 | Page drag ordering and drag-to-nest hierarchy | Implemented in part | `app/create/[id]/page.tsx` | Verify page hierarchy, menus, stacking and movable blocks individually; ensure they persist and render publicly. |
| K022 | Multiple navigation styles and nested dropdown menus | Implemented in part | `app/create/[id]/page.tsx` | Verify page hierarchy, menus, stacking and movable blocks individually; ensure they persist and render publicly. |
| K023 | Right-click/context front/back ordering and layers | Implemented in part | `app/create/[id]/page.tsx` | Verify page hierarchy, menus, stacking and movable blocks individually; ensure they persist and render publicly. |
| K024 | Movable/deletable social icons, widgets and app blocks | Implemented in part | `app/create/[id]/page.tsx` | Verify page hierarchy, menus, stacking and movable blocks individually; ensure they persist and render publicly. |
| K025 | Shop operational admin separate from Builder editor | Built; acceptance open | `app/shop` | Verify merchants can operate their own shop separately, and reject cross-shop access. |
| K026 | Desktop/Tablet/Phone independent compositions, order and visibility | Implemented in part | `lib/creative-core` | Prove each responsive, save, offline, conflict or undo behavior across devices and real user sessions. |
| K027 | Customize/Auto/Regenerate/Reset/Needs Review persists; no overwrite | Implemented in part | `lib/creative-core` | Prove each responsive, save, offline, conflict or undo behavior across devices and real user sessions. |
| K028 | No capability loss on mobile; all tools reachable at specified widths | Implemented in part | `lib/creative-core` | Prove each responsive, save, offline, conflict or undo behavior across devices and real user sessions. |
| K029 | Autosave, draft/publish separation, offline recovery, honest save errors | Implemented in part | `lib/creative-core` | Prove each responsive, save, offline, conflict or undo behavior across devices and real user sessions. |
| K030 | Undo/Redo and durable version/history recovery | Implemented in part | `lib/creative-core` | Prove each responsive, save, offline, conflict or undo behavior across devices and real user sessions. |
| K031 | Publish editable multipage sites, refresh/reload and own domain | Built; patch applied | `app/api/projects/[id]/publish/route.ts` | Claude’s legacy cache fix now passes regression; verify create→publish→update→rollback and real domain ownership in preview. |
| K032 | Fast loading; fix reorder/loading bugs; stable performance | Implemented in part | `app/create/[id]/page.tsx` | Check load/reorder performance and appearance controls on both editors and constrained mobile devices. |
| K033 | Automatic night mode plus manual switch | Implemented in part | `app/create/[id]/page.tsx` | Check load/reorder performance and appearance controls on both editors and constrained mobile devices. |
| K034 | Wix references improved into editable native sites, not copied HTML | Partial | `docs/audits/KEBU_MAY_BEHANCE_MOTION_2026-11-05.md` | Verify original editable outputs against each named project; test actual saved May pages and approved media, not a fixture. |
| K035 | May Lècor, K-Direction, DKLNS, Ndaoan House, Ouest quality/parity | Partial | `docs/audits/KEBU_MAY_BEHANCE_MOTION_2026-11-05.md` | Verify original editable outputs against each named project; test actual saved May pages and approved media, not a fixture. |
| K036 | Reusable native declarative animation; reduced-motion support | Partial | `lib/creative-core` | Verify native motion authoring, published parity, all scroll/media controls and reduced motion. |
| K037 | Scroll effects, parallax/pinning/scrubbing and scrolling video | Partial | `lib/creative-core` | Verify native motion authoring, published parity, all scroll/media controls and reduced motion. |
| K038 | 3D/Three.js experiences and original animated design | Not established as full feature | `lib/creative-core` | Inventory existing 3D hooks; build an editable, safe runtime and verify performance on real devices. |
| K039 | Yande AI and Yande Code named integrated intelligence | Partial | `lib/generation` | Verify provider-backed editable generation, DNA, approvals, bounded revision and preservation of user edits; define remaining Yande Code depth. |
| K040 | Brand intake and editable Brand/Creative/Taste/Motion DNA | Partial | `lib/generation` | Verify provider-backed editable generation, DNA, approvals, bounded revision and preservation of user edits; define remaining Yande Code depth. |
| K041 | Reference Intelligence/Site Director generates whole editable native sites | Partial | `lib/generation` | Verify provider-backed editable generation, DNA, approvals, bounded revision and preservation of user edits; define remaining Yande Code depth. |
| K042 | Plain-English revisions, review/accept changes and preserve manual edits | Partial | `lib/generation` | Verify provider-backed editable generation, DNA, approvals, bounded revision and preservation of user edits; define remaining Yande Code depth. |
| K043 | Images/video generation routed into creation→business→publishing | Partial / gated | `lib/yande` | Verify approved media, rights/revocation, scoped model adapters, quota/recovery and safe native ingestion before expanding plugins. |
| K044 | Permissioned Hugging Face/models/plugins; no unrestricted DB/action access | Partial / gated | `lib/yande` | Verify approved media, rights/revocation, scoped model adapters, quota/recovery and safe native ingestion before expanding plugins. |
| K045 | Authorized brand assets, provenance/consent, reference versus training, revocation | Partial / gated | `lib/yande` | Verify approved media, rights/revocation, scoped model adapters, quota/recovery and safe native ingestion before expanding plugins. |
| K046 | Native responsive/motion foundation before v0 ingestion; no arbitrary JS | Partial / gated | `lib/yande` | Verify approved media, rights/revocation, scoped model adapters, quota/recovery and safe native ingestion before expanding plugins. |
| K047 | Studio separate from Builder; shared account/assets/Yande/business context | Implemented in part | `app/studio` | Close the applicable COS rows, including shared identity, editable export and decoded timeline output. |
| K048 | Canva-level design editing/templates/media/export/history | Implemented in part | `app/studio` | Close the applicable COS rows, including shared identity, editable export and decoded timeline output. |
| K049 | Multi-track audio/video, keyframes, transitions, beat markers | Implemented in part | `app/studio` | Close the applicable COS rows, including shared identity, editable export and decoded timeline output. |
| K050 | Cinema, persistent Worlds and African production intelligence | Not established as full product | `app/studio` | Specify and build persistent Worlds and Cinema workflows beyond current Studio and video editing. |
| K051 | Real send/receive interoperable with Gmail/Outlook/Yahoo | Built in part; provider open | `app/api/mail` | Prove provisioning, real external send/receive, DNS, attachments, abuse protection and reliable replies. |
| K052 | SMTP/MX, SPF/DKIM/DMARC, spam/security, attachments, folders/search/threading | Built in part; provider open | `app/api/mail` | Prove provisioning, real external send/receive, DNS, attachments, abuse protection and reliable replies. |
| K053 | Free personal address activation/choice; no phone/other email required | Built in part; provider open | `app/api/mail` | Prove provisioning, real external send/receive, DNS, attachments, abuse protection and reliable replies. |
| K054 | One Kebu login/password; separate business/custom-domain/shared mailboxes | Partial + branch | `app/api/mail/business/route.ts` | Reconcile Claude’s shared mailbox UI/API/RLS, then test independent members and external domain delivery. |
| K055 | Unique People/Needs You/Waiting/orders/files/tasks/decisions experience | Partial | `docs/product/KEBU-MAIL.md` | Verify each proposed People/Needs You/Waiting and work-context workflow, and recover any missing specifics. |
| K056 | Real Kebu Search crawl/index/rank and cited economic discovery | Partial | `lib/search` | Keep implemented index and modes; finish real source ingestion, rank/relevance, citations, refresh and scheduler checks. |
| K057 | Installable/default-capable Chrome-like Kebu Browser | Partial; full product unbuilt | `app/browser/page.tsx` | Web reader and tab state exist; build and certify installable/default-browser runtime and isolation. |
| K058 | Drive-like Library/Spaces storage and sharing | Implemented in part | `app/api/library/shares/route.ts` | Verify storage access, sharing/revocation, cross-user denial, versions, restore and large uploads. |
| K059 | Docs/Word document creation and collaborative editing | Partial; editor unbuilt | `app/docs/page.tsx` | Docs redirects to Library. Build rich collaborative authoring, durable document model and export. |
| K060 | Sheets/Excel real spreadsheet types/formulas/editing | Full product not found | `app/studio` | Build dedicated Sheets formula grid and Slides collaboration/presentation flows; Studio output alone does not certify either. |
| K061 | Slides/presentations creation and collaborative editing | Full product not found | `app/studio` | Build dedicated Sheets formula grid and Slides collaboration/presentation flows; Studio output alone does not certify either. |
| K062 | Calendar, booking links, tasks and connected work | Partial | `app/calendar/page.tsx` | Finish bookable availability and confirm calendar/task permissions, notifications and connected workflows. |
| K063 | Rooms independent chat/calls/files/docs/social spaces | Partial | `app/api/rooms` | Prove persistent chat, file privacy, member lifecycle and collaborative work; link meetings when available. |
| K064 | Zoom-like meetings, voice/video and Jokko Mbolo call integration | Not established / contract | `app/rooms` | Implement actual voice/video meeting sessions and approved Jokko Mbolo integration. |
| K065 | Team workspaces with project chat/work/editing | Partial | `app/api/rooms` | Prove persistent chat, file privacy, member lifecycle and collaborative work; link meetings when available. |
| K066 | Jobs/Careers: internships, apprenticeships, freelance, remote, research — **named Kebu Liguey** (named Oct 16, 2026; cross-references K004, K065, K067, K068; see `docs/KEBU-COMPLETION-QUEUE.md`'s "Kebu Liguey" addendum); SAFA recruitment/applications | Built in part; integration open | `app/liguey` | Verify job posting, applicant/employer views, real role isolation and multilingual flows; obtain SAFA contract. |
| K067 | LinkedIn-different network; life experience, Campus/Rooms, cross-campus work | Built in part | `app/network` | Verify real profile visibility, Campus/Rooms, moderation, consent and cross-campus workflows. |
| K068 | Find people/teams to execute projects; different Fiverr-like model | Not established as full journey | `app/network` | Build verified matching, work agreement, delivery and payment journeys for people and teams. |
| K069 | Asset marketplace; rights-cleared data contributors paid | Partial | `app/market` | Verify creator publishing, private purchases, licenses and payouts; build approved contributor compensation and remaining Exchange categories. |
| K070 | Kebu Cloud hosts user apps/software, APIs, databases and automations | Full Kebu product not found | `docs/IMPLEMENTATION_STATUS.md` | Build approved software/API/database/automation runtime separately from site hosting; define TAKK interface rather than count TAKK as Kebu. |
| K071 | Maps navigation/streets/distances plus farms/resources/opportunity layers | Partial surface; navigation unbuilt | `app/map/page.tsx` | Route redirects to Country Explorer. Build practical navigation, then verified map data layers. |
| K072 | African-owned datasets/infrastructure; regional CDN over time | Sequenced future | `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md` | Plan regional data ownership, performance, infrastructure and CDN milestones with partners. |
| K073 | Permanent business Kebu ID, portfolio, linked sites and activity proof | Partial + branch | `lib/kebu-id` | Reconcile company claims and AfriID/Kebu ID verification branches; prove document access, review, portfolio and appeals. |
| K074 | Free account-linked AfriID and controlled verified eligibility | Partial + branch | `lib/kebu-id` | Reconcile company claims and AfriID/Kebu ID verification branches; prove document access, review, portfolio and appeals. |
| K075 | Business registration documents/progress and real approval/tax/certificate | Partial; partner blocked | `lib/kebu-id/government/mock-connector.ts` | Tracker exists; implement real approved registration, tax and certificate connector. |
| K076 | Thimble registration and trademark integration | Not established / contract | `docs/IMPLEMENTATION_STATUS.md` | Confirm approved Thimble contract and implement registration/trademark handoff. |
| K077 | Full Kebu/KA business score from verified transactions/activity | Full product not found | `lib/ka-score.ts` | Separate current readiness from verified business scoring; build approved activity inputs, audit and correction workflow. |
| K078 | Co-founders/team roles/invites; business operations/events/invoices/contracts | Partial + branch | `lib/business/team-invites.ts` | Reproduce and reconcile concurrent invite acceptance; verify role matrix and operations across two real sessions. |
| K079 | Stores products/inventory/orders/customer accounts/wishlist/messages/discounts | Database QA passed in part | `docs/audits/KEBU_QA_COMMERCE_VERIFICATION.md` | Verify full store journeys in preview; reconcile Claude cancellation/replay/autopay findings before sandbox provider testing. |
| K080 | Jokko native payments and local mobile-money/currency coverage | Database QA passed in part | `docs/audits/KEBU_QA_COMMERCE_VERIFICATION.md` | Verify full store journeys in preview; reconcile Claude cancellation/replay/autopay findings before sandbox provider testing. |
| K081 | PayPal/Paystack/Wave callbacks, refunds/replay protection and stock integrity | Database QA passed in part | `docs/audits/KEBU_QA_COMMERCE_VERIFICATION.md` | Verify full store journeys in preview; reconcile Claude cancellation/replay/autopay findings before sandbox provider testing. |
| K082 | Private paid digital-file delivery and redemption | Built in part | `lib/shop` | Verify actual paid entitlement, private file delivery, cross-buyer denial, expiry and refund/revocation. |
| K083 | Jokko logistics across Africa; self/partner/Kebu fulfillment | Database QA passed in part | `app/admin/fulfillment/page.tsx` | Verify customer/admin browser journey and real dispatch, delivery, exceptions and return operations separately. |
| K084 | Real site/sales analytics and actionable insights | Partial | `lib/shop/commerce-insights.ts` | Cross-check events and sales against known transactions; finish unified analytics, attribution and actionable views. |
| K085 | Separate standalone Opportunity OS from Kebu personalized opportunity product | Partial + branch | `app/opportunity` | Reconcile Claude explore and trust-label branches; preserve standalone/personalized distinction; prove real source and eligibility/handoff flows. |
| K086 | Discover Africa-wide grants/jobs/training/tenders/trade/unknown opportunities | Partial + branch | `app/opportunity` | Reconcile Claude explore and trust-label branches; preserve standalone/personalized distinction; prove real source and eligibility/handoff flows. |
| K087 | Browse Jobs/Opportunity before AfriID; gate privileged personalization | Partial + branch | `app/opportunity` | Reconcile Claude explore and trust-label branches; preserve standalone/personalized distinction; prove real source and eligibility/handoff flows. |
| K088 | Build This→Builder/Business handoff; future capital/loans | Partial + branch | `app/opportunity` | Reconcile Claude explore and trust-label branches; preserve standalone/personalized distinction; prove real source and eligibility/handoff flows. |
| K089 | Bright overall; black structure, orange creation/red movement; own distinctive logos | Implemented in part | `app/globals.css` | Audit mobile/tablet/desktop against approved visual direction and unique product marks. |
| K090 | No fake functionality, honest loading/errors/permissions; real end-to-end | Partial / acceptance open | `docs/SECURITY.md` | For this requirement, trace UI→API→DB auth/consent/failure; verify appropriate security settings, isolation, monitoring and recovery in QA. |
| K091 | MFA/step-up, leaked-password protection, named admins, WAF/rate limits | Partial / acceptance open | `docs/SECURITY.md` | For this requirement, trace UI→API→DB auth/consent/failure; verify appropriate security settings, isolation, monitoring and recovery in QA. |
| K092 | SSRF repair, malware scanning, cross-tenant/RLS tests, security CI | Partial / acceptance open | `docs/SECURITY.md` | For this requirement, trace UI→API→DB auth/consent/failure; verify appropriate security settings, isolation, monitoring and recovery in QA. |
| K093 | Monitoring, incident response, recovery drills; measurable PCI/SOC evidence | Partial / acceptance open | `docs/SECURITY.md` | For this requirement, trace UI→API→DB auth/consent/failure; verify appropriate security settings, isolation, monitoring and recovery in QA. |
| K094 | Privacy/no personal-data sales, scoped AI/actions, explicit consent and audit | Partial / acceptance open | `docs/SECURITY.md` | For this requirement, trace UI→API→DB auth/consent/failure; verify appropriate security settings, isolation, monitoring and recovery in QA. |
| K095 | Real browser tests/persistence/published behavior; no tests-as-proof of release | Release gate open | `docs/KEBU_CLOSEOUT_REGISTER.md` | Verify exact deployed build through real authenticated browser journeys; retain all named gates and no-production-write boundaries. |
| K096 | Builder→native 3C–3J→Studio→integration; finish original products before plugins | Release gate open | `docs/KEBU_CLOSEOUT_REGISTER.md` | Verify exact deployed build through real authenticated browser journeys; retain all named gates and no-production-write boundaries. |
| K097 | Respect local/read-only/release boundaries and later exact QA authorization | Release gate open | `docs/KEBU_CLOSEOUT_REGISTER.md` | Verify exact deployed build through real authenticated browser journeys; retain all named gates and no-production-write boundaries. |
| K098 | Actually working live signup and login | Release gate open | `docs/KEBU_CLOSEOUT_REGISTER.md` | Verify exact deployed build through real authenticated browser journeys; retain all named gates and no-production-write boundaries. |
| K099 | Fix current live glitches; finish all functionality | Release gate open | `docs/KEBU_CLOSEOUT_REGISTER.md` | Verify exact deployed build through real authenticated browser journeys; retain all named gates and no-production-write boundaries. |

## Studio acceptance (25 groups)

Scope: [Creative OS acceptance](../product/KEBU-STUDIO-CREATIVE-OS-ACCEPTANCE.md). Each row is open for full acceptance. Source and local browser evidence exist for several subcases; none is promoted to complete from test counts.

| ID | Acceptance contract | Remaining proof |
|---|---|---|
| COS01 | Universal transforms: every supported text/image/video/icon/shape/frame uses X/Y, actual W/H, scale, rotation, opacity, stacking, lock/hide, duplicate/delete, grouping, alignment and animation. Verify equivalent mutations through inspector, handles and keyboard, plus save/reload/export. | Prove every object and transform in the complete inspector/handle/keyboard matrix. |
| COS02 | Replace template-specific behavior incrementally with general objects. Reproduce May's layers/effects through normal tools; preserve old templates and authored edits. No private-only renderer counts as ordinary-user proof. | Rebuild the remaining May effects as ordinary objects; preserve existing saved designs. |
| COS03 | Real image frames: frame bounds are selection, resize, hit-test, crop and export bounds. Source media outside a crop must not leave a giant invisible interactive box. Non-destructive source preservation and editable background removal required. | Verify crop/frame hit testing, source preservation and editable background removal. |
| COS04 | Resize: all four corners and four sides; independent W/H; Shift ratio; Alt/Option center; exact px fields; snapping; transformed/grouped objects; phone/touch alternatives. | Prove each side/corner, modifier, exact field and touch variant. |
| COS05 | Direct text: double-click and type on canvas; selection/caret survive updates; rich inline styling; font/px/weight/color/spacing; cancel/commit/undo; keyboard and IME; save/reload/export parity. | Prove rich inline editing, IME/caret, undo and decoded export parity. |
| COS06 | Smart guides for canvas/object edges and centers; horizontal/vertical distribution, equal spacing, center-on-page, configurable snapping. Verify transformed objects and multiple selection. | Verify guides, distribution and snapping under group transforms and touch. |
| COS07 | Shift and marquee multi-select; Group/Ungroup; nested layers; group transforms; ordered hierarchy; exact bidirectional selection; rename/lock/hide/duplicate/delete; accessible reorder. | Prove nested multi-select, hierarchy, reorder, all mutations and undo. |
| COS08 | Real animation preview and presets; Enter/Scroll/Hover/Click/Loop triggers, duration, delay, easing and per-object parameters. Timeline animations for video. Reduced motion and exported behavior must be deliberate. | Complete and verify trigger/preview/export/reduced-motion matrix. |
| COS09 | Video timeline: trim/split, multiple tracks, drag/reorder, transitions, text, audio, volume/fades, captions, beat markers, snapping, zoom, scrubber. Verify playback and decoded output; no inert buttons. | Prove full multi-track editing and decoded media; reconcile track/keyframe work without overwrites. |
| COS10 | Audio: upload/library, trim/loop/volume/fade, detach from video, beat analysis, waveform, soundtrack across scenes. Verify saved source and audible exported samples, plus missing-media errors. | Verify audible export, detach, fades, beat/waveform and missing-media errors. |
| COS11 | Pages/scenes: add/duplicate/reorder/rename, video duration and transitions, copy styles, apply background, delete/restore. Verify undo, save/reopen and output order. | Verify complete page/scene lifecycle, ordering, duration and export. |
| COS12 | Searchable Elements: shapes, lines/arrows, frames, tables/charts, social icons, symbols/stickers, African patterns/assets, decorative type, UI/device mockups. Inserted results are ordinary editable objects. | Verify editable insertion for every required searchable category. |
| COS13 | Reusable assets: folders, tags, favorites, recent/uploaded/generated, brand-owned/team-shared. Search, upload retries, ownership, reuse and sharing isolation must work. | Verify reuse, retries, folders/tags and shared/private asset isolation. |
| COS14 | Brand DNA actions: apply typography/colors, replace logo and restyle selected design. Real edits, preview/undo, owner/team permissions, save/reopen; not merely a display of brand tokens. | Verify selection restyle, undo, owner/team permission and reopen. |
| COS15 | AI creates structured editable text/image/shape layers. Real provider failure is visible. Never save a generated JPEG as an editable design substitute. Verify subsequent editing and exports. | Verify actual provider output as editable layers, failure and export. |
| COS16 | Offline: create/edit/reopen drafts, queued uploads/changes, reconnection and conflicts, user isolation and storage failures. Never claim Saved when data is only unsynced or storage failed. | Verify real offline queue, reconnect conflict, storage failure and isolation. |
| COS17 | Autosave: Saving → Saved only after a valid receipt; optimistic local persistence, serialization, retries, conflict recovery and visible errors. Slow/failed requests cannot overwrite newer edits. Loading/publishing cannot reseed owner content. | Verify valid receipts, serialization and slow/error/restore states in real sessions. |
| COS18 | Undo/redo covers text/transforms/groups/crop/animation/add/delete/reorder/pages/styles. One gesture is one undo step; transient pointer frames are not individual history entries. | Exercise every operation as one undo/redo step per gesture. |
| COS19 | Versions: named and automatic immutable snapshots, compare and restore. Save current edits before capture; a delayed restore cannot erase newer edits; permission/version conflicts remain visible. | Verify named/automatic versions, compare, restore and concurrent edits. |
| COS20 | Object/point anchored comments and live cursors/selections. Collaboration cannot overwrite concurrent edits or leak private content. Test two real sessions, permissions and recovery. | Prove anchors, live cursors and concurrent changes across two actual sessions. |
| COS21 | Keyboard/tab order, shortcuts, labels, focus, keyboard movement/zoom, reduced motion and contrast. Test desktop/tablet/phone, touch and assistive-technology semantics. | Verify keyboard, labels, focus, contrast and touch across devices. |
| COS22 | Performance: targeted updates during manipulation, heavy tools lazy loaded, long asset/layer lists virtualized, thumbnail caching and appropriate workers. Record large-document interaction measurements and device limits. | Measure large designs, worker usage and constrained-device interaction. |
| COS23 | Export: PNG/JPEG/WebP/PDF/GIF/video as supported, transparent background, quality/resolution, durable job progress/failure/retry/history. Verify actual decoded files, media/fonts/effects and permission boundaries. Unsupported formats must be honest, not fake success. | Decode all supported exports and verify permission, progress, retry and history. |
| COS24 | Templates use the same editable document model with protected/default metadata. Author, validate, publish, purchase/use and edit through Aesthetics/Assets marketplaces; retain provenance and licensing. | Verify same-model author/publish/purchase/edit with license and provenance. |
| COS25 | Ordinary-user certification: create a post; insert media/text; font/resize/rotate/group/animate; add audio; undo; close/reopen; duplicate page; resize format; export; repeat on tablet/phone. Repair each broken interaction before declaring the group complete. | Run the complete ordinary-user flow on desktop, tablet and phone in hosted QA. |

## Git branch inventory (95 remote heads)

57 tips are ancestors of baseline and 38 are not. This is ancestry evidence; selected branch content comparisons are above. Older tips may be obsolete or have equivalent patches in the baseline.

| Branch | Exact tip | Ancestry | Tip subject |
|---|---|---|---|
| `origin/accounts-permissions-audit` | `db1aa20d116a7746d77378f5ccb0b248d5cedda7` | Not ancestor | fix(business): close team-invite-accept double-write race, verify permission boundaries |
| `origin/audit-2026-11-04` | `f510ff13e7bddc059fb4a3f0346328807acfd141` | Ancestor | Add evidence-based completion register for the consolidated checkpoint |
| `origin/audit-base` | `fbed3cf01e1570dc7d37c0aa840515004d7af8af` | Not ancestor | fix(test): point builder-rpc-anon-grants.db.test.ts at migrations_archive/legacy for 004_create_projects.sql |
| `origin/chatgpt/kebu-product-worlds-rebuild` | `bb260a0e88fda8efa09e236534353ec7649094ff` | Ancestor | feat(studio+builder): functional elements + charts/stickers/illustrations |
| `origin/claude/alkebulan-files-migration-aty6p0` | `75c0343a51f3c809ae91b5c669a384bec3eb712e` | Not ancestor | Phase 3B: responsive visibility, device composition, motion contract |
| `origin/codex/builder-access-query-errors` | `58a1b7011ff6c1d9da1abb388a1e5de1f6814c30` | Not ancestor | test(builder): cover project access query errors |
| `origin/codex/cowork-recovery` | `c5ddfec55ef14b5a6bb7b20d46e0b2bab17f5c35` | Ancestor | fix(builder): surface project access query failures |
| `origin/consolidation-2026-11-04` | `0a41a3ae91d9e15427f81c1b4acb751d0652784a` | Ancestor | Add the full chained customer-journey test Codex point 5 asked for |
| `origin/feature-account-control-center` | `8985d8acc5b8bf8598beffd3144155691eda7257` | Not ancestor | feat(account): build the account control center / privacy permissions |
| `origin/feature-account-security-dashboard-v2` | `0f079065724e75e1365aee91f1a7364bde35342f` | Ancestor | Close two real CSRF gaps on account-identity mutations; add real security-signal logging + admin security dashboard + daily security-check cron |
| `origin/feature-afriid-depth` | `7911852eecf4b605c55c9a40760637e55989cdea` | Not ancestor | Build AfriID profile depth + Kebu ID commerce fields + verification levels |
| `origin/feature-builder-studio-verification` | `b721d387d87682962d378f2cea948740b59f4604` | Not ancestor | Fix: legacy publish never busted the live site's ISR cache |
| `origin/feature-claim-company` | `2681a82391963454cb8818580cf3b1613ac4ad24` | Not ancestor | feat(kebu-id): claim-existing-company, with proof |
| `origin/feature-dns-management-fixed` | `5dd02fa1655b92730ee4bb32869f0fa5b8c32119` | Not ancestor | feat(domains): cross-site domain management view |
| `origin/feature-help-requests-failure-feed` | `a634dc28a316e0a67f5607519096aae3b04407cb` | Ancestor | Kebu Record: account context on help requests, real reply + email, unified "needs attention" feed |
| `origin/feature-joko-fulfillment` | `42a1ddd857231f36ae453febc56f9c6e00d22ed9` | Ancestor | Add Joko Fulfillment admin ops queue and seller opt-in UI |
| `origin/feature-maylecor-complete-site` | `3db108a8b6b966206553d43b07eb7612c35cd935` | Ancestor | test(create): dev-only May Lècor fixture route + live SiteRenderer regression spec |
| `origin/feature-maylecor-final-verification` | `6cf07c45fd94970d19a7fb47fae40e4dde900860` | Ancestor | Fix duplicate product photo on the Shop page |
| `origin/feature-maylecor-real-video-content` | `9e16484d1175b01bed100153240a222c54ee6bb9` | Ancestor | feat(maylecor): wire May's real "Yaw Laa Taan" video and press photos |
| `origin/feature-mays-world-fan-community` | `4283f9739f8ed1f5d3f800459fc82128e72db8e5` | Ancestor | Build general fan/member community board; wire into May's World as Fan Community |
| `origin/feature-opportunity-os-explore` | `7a541325f9bd789f44e29a0311be089cf2f2e3b8` | Not ancestor | feat(opportunity): Discovery, Import-replacement, Trade engines + one more card |
| `origin/feature-opportunity-unverified-examples` | `02e6ac6565ec242f1c28eed2d6bab515f27750c1` | Not ancestor | feat(opportunity): wire unverified-example trade-intelligence content |
| `origin/feature-resolve-dormant-code-nov3` | `7ff77c8f7b19c95da2b455e714606f608ca9d71b` | Ancestor | Give responsive-qa.ts's DOM validators a real caller: live Playwright QA |
| `origin/feature-shared-mailboxes` | `c3a5819da32152eb485c1fe5acfb2007bfa71eae` | Not ancestor | feat(mail): build shared mailboxes end-to-end (Kebu Mail M5) |
| `origin/feature-shop-checkout-security` | `1cfdfb475ccb9f93fd09eaf59f99ff768f57485d` | Ancestor | Add adversarial tests: payment replay, amount-tamper, payout races, RLS |
| `origin/feature-shop-journey-qa` | `d45e7baff767fc6c1c6611eaec61b52c676292ea` | Not ancestor | fix(shop): include real cart items/prices in abandoned-cart recovery |
| `origin/feature-shop-marketplace-verification` | `ca11bf765fcc08ee37f6813f064e53c47e772c88` | Ancestor | Prove customer-account RLS behaviorally; add real FAQ/policy page seeds for Shop themes |
| `origin/feature-shop-shipping-checkout` | `88d69d26ae8dac2a232df6c9525a5dba9fbaecab` | Ancestor | UI: real shipping-option picker at checkout, real manager in Shop admin |
| `origin/feature-studio-captions` | `45015d6433d45592a3fdfbc05f9fe0668820d39f` | Not ancestor | test(studio): add real functional tests for auto-captions pipeline |
| `origin/feature-studio-live-cursors` | `43401dd36085086f1140570a54c4927f677a7c28` | Not ancestor | fix(studio): gate live-cursor broadcasting on real collaborator presence |
| `origin/feature-studio-multitrack-keyframes` | `64b7c453c63ec7472f1b24b4ad45b2d0a9468158` | Not ancestor | feat(studio): add/remove composition tracks; test the zero-coverage keyframe engine |
| `origin/feature-unmount-components` | `4ec426d0e3ceafa5368b90c6c4ae7187104400b7` | Not ancestor | feat: wire up real unmounted components; fix confirmed live renderer gaps |
| `origin/fix-chromium-investigation-2026-11-05` | `c1fef2844235f838fff0f1f1bbd560521ba24c5b` | Ancestor | Investigate @sparticuz/chromium gap: resolve the real blocker, run the previously-never-executed browser.local.test.ts for real |
| `origin/fix-daily-sweep-2026-11-04` | `2eefe10228e3b0e2e022a8a1982e1752d4e693d8` | Ancestor | Fix migration-timestamp collision from yesterday's branch merge |
| `origin/fix-discovery-findings-3-4-5` | `c712a81de383feb86a7fa46cd73a8cc969b87e55` | Not ancestor | fix(docs): clarify WEALTH_PATHS was never actually duplicated |
| `origin/fix-marketplace-split-85-15` | `051fd0fe0e0f856689a22719ea7d644e33399901` | Ancestor | Change marketplace revenue split from 80/20 to 85/15 per owner-first decision |
| `origin/kebu-search-build-oct23` | `8dfc5fdeb808533a20ffa0ace86e1275079986b7` | Not ancestor | Add Opportunities/People/Research/Trade/Africa/Culture to Kebu Search |
| `origin/mail-audit` | `1f677e7145cdc117c3a87e34ffd11c7f81b774ab` | Ancestor | docs: update migration completion and remaining hosted acceptance gates |
| `origin/main` | `71815f99c50022482e545e22e1f6e040ee1cafe4` | Ancestor | Merge Builder access repair and Opportunity disclaimer recovery |
| `origin/operations-integrations-audit` | `eab766e9644a309778bc7d3373ebd12af486e598` | Not ancestor | fix(ops): schedule 4 orphaned cron routes; close autopay double-charge race |
| `origin/other-products-liguey-audit` | `73de6f109e7712fe441e15e844ac2d29194b74c0` | Not ancestor | fix(reach): close concurrent board-click CPC race in wallet/campaign spend |
| `origin/qa/kebu-ready-oct10` | `6267a80d6cd3ed4d253adc95a1b0fe2458d52462` | Not ancestor | Record Builder save recovery verification and fresh account gates |
| `origin/register-tightening-2026-11-05` | `1f8a69b99333e3ff1d4e0c2c7c72e91f81f75d81` | Ancestor | Tighten completion register per Codex's 5-point rigor review; document lib/adapter as unintegrated |
| `origin/search-discovery-journey-verify` | `96a847ed71b274c2301725eea3b475a7f050f89c` | Not ancestor | Verify Kebu Search discovery journey end-to-end in a real browser |
| `origin/stores-payments-audit` | `7be9cdbbba836ba06b4fedead608cbaaf393ccc3` | Not ancestor | fix(shop): close duplicate-webhook ledger race and cancel-replay stock bug |
| `origin/studio-audit-non-generation` | `1f677e7145cdc117c3a87e34ffd11c7f81b774ab` | Ancestor | docs: update migration completion and remaining hosted acceptance gates |
| `origin/work/builder-generation-pipeline-oct25` | `0d258af121eff845437d4a086821a5bb55434e6d` | Ancestor | Specify provider-independent Builder generation and bounded quality repair |
| `origin/work/builder-p0-stabilization` | `09f08b7540ae53413cad75051267c44d3e193702` | Not ancestor | shop: dedupe terminal payment ledger events |
| `origin/work/claude-sync-oct20` | `68b62904f3ef20e759c5d36d5d045bbc133e6434` | Ancestor | docs: record Kebu Display font-generation infrastructure slice |
| `origin/work/codex-builder-frame-verified-oct21` | `6e1989d4afbd7bd4153985b546b8e14dbd59710a` | Ancestor | Add measured collage image frames, independent edge resizing and fit |
| `origin/work/codex-builder-frames-oct20-recovery` | `ee9852431d3cfadcc178b2cbd81644ede7c4fbe0` | Ancestor | Preserve the newer Studio marketplace terms display during Builder integration |
| `origin/work/codex-builder-pipeline-runtime-oct25` | `6d2d8a3421c7c5e1ffc8cdd39b4349e57cfc8df6` | Ancestor | Fence background job finalization before durable Builder generation |
| `origin/work/codex-frame-geometry-oct21` | `c7a0e38617973ed019d30262d34f818a3ab8f88c` | Ancestor | Reconcile verified Builder frames with Claude creative-asset checkout security work |
| `origin/work/codex-generation-readiness-oct26` | `22039999debd5bb5421e7d026b42959f3dbae8b0` | Not ancestor | Record full local CI results for browser readiness |
| `origin/work/codex-hosted-auth-gate-oct21` | `e3eae02f43c62c034992c36bc24cde81f7533a80` | Ancestor | Drain native test connections before normal database teardown |
| `origin/work/codex-hosted-release-oct21` | `901e02abf5022b0d142666425ac7837e0b4448b3` | Ancestor | Record verified native races and actual hosted release blockers |
| `origin/work/codex-inspector-resume-oct24` | `615b681e39c0e50e0696ee907358f979047c9ea4` | Not ancestor | Recover Kebu session and verify scrolling Inspector controls |
| `origin/work/codex-liguey-retry-oct20` | `aef20756b6c75d01d34c6cd4f38f7233716d2f55` | Ancestor | fix: retain Liguey listing drafts after failed creation |
| `origin/work/codex-marketplace-boundary-oct21` | `465a9b56a07049fe30a7146814620cbabc4846c5` | Ancestor | docs: retain adversarial paid ownership verification and release blockers |
| `origin/work/codex-may-behance-motion-nov05` | `147d9c70ef561f29446440d59e626ff5c76a1909` | Ancestor | Use the collage owner frame for resize observation [skip vercel] |
| `origin/work/codex-may-contact-oct20` | `6bdfcb72d7b695b30f100154cedce85354ca11c5` | Ancestor | fix: keep May artist contact separate from foundation navigation |
| `origin/work/codex-migration-resume-oct24` | `8854ded89345a21d9b6e7fd1b73945a665d7aa5b` | Not ancestor | Reconcile migration rollout checkpoint with Inspector verification |
| `origin/work/codex-object-reset-oct21` | `0910bdac0554aadf635d809fa2f14b916394e259` | Ancestor | Reconcile verified responsive reset with Claude multi-provider checkout |
| `origin/work/codex-payment-adapters-oct21` | `45b27a24f3b2e356cbb7aab37b95666783fb2a6e` | Ancestor | fix: honor selected checkout rail and payment currency units |
| `origin/work/codex-paypal-amount-oct21` | `348e80ddef1f71c9655a81ecd07710d28ef6d675` | Ancestor | Reject invented PayPal FX and preserve declared currency minor units |
| `origin/work/codex-platform-verification-oct20` | `36052276b56f8fcbbef1a1a9f0dcaa7adfcd1222` | Ancestor | Reconcile Claude Studio fonts and payout work with verified Liguey retry recovery |
| `origin/work/codex-resume-oct23` | `9face5be5dc95495a5ea28f99ae37da734eae76e` | Ancestor | Reconcile session handoff history and record verified Studio copy checkpoint |
| `origin/work/codex-shared-generation-repair-oct26` | `ff33e9bf6f81a83b8dd614ac28b477b821460c51` | Not ancestor | Fix 5 review findings: media allowlist bypass, RPC direction validation, payload caps, text-clipping false positive, redundant validation |
| `origin/work/codex-social-rail-oct21` | `bd82bf3e0d7af4d9c6536351442997e68da37079` | Ancestor | Reconcile verified Builder social rails and marketplace ownership authorization |
| `origin/work/codex-studio-arrange-oct23` | `3e5062a660bd607d4ff56e89074d34629bd56827` | Ancestor | Record verified Studio arrangement and renewed QA plan blocker |
| `origin/work/codex-studio-group-rotation-oct23` | `4db1c5537cd609eedc57afa3b512d8c57b42bd6e` | Ancestor | Record verified shared rotation and concrete hosted QA capacity blockers |
| `origin/work/codex-studio-marquee-oct22` | `49c139b2d9dedfb974e4ed907403a716c0b656b0` | Ancestor | Record exact Studio selection browser, CI and preview evidence |
| `origin/work/codex-studio-pages-oct23` | `da4e80c830d697c802f09b643b245553619c91b9` | Ancestor | Record verified Studio page workflow and independent Claude Search review |
| `origin/work/codex-studio-snap-controls-oct24` | `1ef6c9285141ee7f90e30d97527aec3434292a66` | Ancestor | Record verified snapping, native input recovery and exact-source release evidence |
| `origin/work/codex-studio-snapping-oct23` | `05b66d917b747b117cb2554095cbb3ac9d6cd3d0` | Ancestor | Record verified Studio snapping, fresh hosted blockers and independent Claude Search follow-up |
| `origin/work/codex-studio-styles-oct24` | `cfd255280ff20371ce7081f5a20c914d4236c30a` | Ancestor | Record verified Studio style transfer, live schema inventory and concurrent Claude review |
| `origin/work/codex-template-source-oct21` | `5be2e0379be5bf8dc9101055038a54f6abf54d06` | Ancestor | Keep anonymous template metadata independent of developer-profile privileges |
| `origin/work/codex-wave-verification-oct21` | `45f29df913022b067bd12ca43f2c57bc09b56276` | Ancestor | Bind returned Wave session quotes and round decimal FX exactly |
| `origin/work/codex-yande-experience-oct22` | `4d2d96d42ab92a47386c2c6b2e8aba168c956cec` | Ancestor | Record verified Yande proposal checkpoint and production portfolio editing hazard |
| `origin/work/codex-yande-reconcile-oct22` | `eb1785edffaf65c1e14ea273be2b7195f2b2ad99` | Ancestor | Record generation authority evidence, Studio acceptance register and hosted blockers |
| `origin/work/kebu-builder-core-rebuild` | `f6674a095a5744fb1e8c085d32399487e8f5670d` | Ancestor | polish(builder): unify final canvas and typography styling |
| `origin/work/kebu-builder-ux-reference-pass` | `c018d627b421e27712cc416b8b705dcd4a404581` | Not ancestor | feat(builder): align shell with Kebu Galaxy references |
| `origin/work/kebu-closeout-nov05` | `9d168e4a1cc39e88bdc3edd143d8e4f86867f7ec` | Ancestor | Restore checkout reservation schema and record hosted QA verification [skip vercel] |
| `origin/work/kebu-completion-audit-oct13` | `9d168e4a1cc39e88bdc3edd143d8e4f86867f7ec` | Ancestor | Restore checkout reservation schema and record hosted QA verification [skip vercel] |
| `origin/work/kebu-ecosystem-ux` | `f4ef717f3978e1d4f778a779eba9a642341d9ce4` | Not ancestor | feat(commerce): harden transaction infrastructure to mature-platform standard |
| `origin/work/kebu-foundation-scale` | `f71cf068289ac599e75e650814844758210d138d` | Ancestor | feat: wire Builder version history recovery UI |
| `origin/work/kebu-liguey-k066-oct20` | `1011570576ce4daa2cdf6530557e224b3861221b` | Not ancestor | Kebu Liguey (K066) case 8: real-browser verification, 2 bugs + 1 RLS gap + 1 product gap fixed |
| `origin/work/kebu-liguey-yande-oct20` | `13f0cec73e407ae69be4b234ebda51e618f3c617` | Not ancestor | Liguey: surface the company's real website link on the public listing |
| `origin/work/kebu-mail-k0xx-oct20` | `250d7217c624b8486751f72e2591abd61e38db3e` | Not ancestor | Kebu Mail: rename the product from "EVA" to "K Mail", explicit instruction |
| `origin/work/kebu-security-remediation` | `0d534a8a7bbd60799c38b751e5fc38f1c5e6cefd` | Not ancestor | test: cover Afrique ID RLS policies |
| `origin/work/kebu-session-handoff-oct23` | `5ce8923923008d716b2c37dd79c6db860f91cd0a` | Ancestor | Integrate verified Studio style transfer and shared page backgrounds |
| `origin/work/kebu-studio-oct20` | `2048d120cac0a3d86f1bd2020867a200070f9d2b` | Not ancestor | Studio: add marquee/rubber-band select, a real gap found during the Studio audit |
| `origin/work/kebu-track-b-platform` | `fb21a19ddb65eb79d671cd8757237f1693e5433f` | Ancestor | fix(platform): harden durable worker recovery |
| `origin/work/kebu-type-foundry-design-oct20` | `8ed2a2f9a1da40bcfdb7d777ce122a86b037ef07` | Not ancestor | docs: define original Kebu Type Foundry and font QA gates |
| `origin/work/kebu-yande-gateway-oct20` | `a6a03382d83b1381c00e1938d7ebd6cf78c3eefb` | Not ancestor | Yande: migrate Builder (Create) and Studio's AI call sites onto the shared gateway |
