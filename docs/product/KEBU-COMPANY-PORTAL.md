# Kebu Company Portal

Requirement recorded November 15; expanded November 16, 2026.

**User direction:** Companies should use Kebu to find and hire people, onboard them, and keep track of projects and companies. Build on the existing Business Kebu portal and first-party products. Source implementation and local database acceptance are recorded in the November 16 audit. Hosted and browser acceptance remain open; this is not a production completion claim.

## Product outcome

A founder or authorized manager can run a company from one business workspace: find people, review applications, arrange interviews, record a hiring decision, invite the person with appropriate permissions, complete onboarding, assign work, collaborate, and see actual progress. A person managing several companies can switch between them and view an explicitly authorized portfolio summary. Each company retains its own identity, team, data and permissions. Separate ecosystem companies must not be silently combined.

One Kebu login, multiple business workspaces; no second identity system. Hiring is available from the business portal through Liguey. Work, Rooms/Calls, Docs/Sheets/Slides, Mail, Library, Builder/Shop and approved optional marketplace apps remain their existing products, with company context carried across links and APIs.

## Source inventory

Inspected base: `f6a0713ef54e9af2cde14ab2d9ad163b4fcf14b3`.

| Capability | Evidence in source | Boundary / improvement |
| --- | --- | --- |
| Company dashboard | `app/business/[id]/page.tsx`: Today, Projects, People, Operations, Analytics | Existing Projects lists website projects. General operational projects need their own model and views. Some People metrics use `owners.length`; distinguish ownership from active team membership. |
| Multiple businesses | `app/api/businesses/route.ts`: lists active business memberships | A list of accessible businesses is not a group-company hierarchy, ownership registry or consolidated operating dashboard. |
| Team invitations and roles | `lib/business/team-invites.ts`, `lib/business/team-roles.ts`, business team API/panel | Preserve existing invitation repairs. Atomic revoke/expiry/acceptance protection and capability-level permission acceptance remain open. Role names alone do not prove enforcement. |
| Recruitment | `app/business/[id]/liguey/page.tsx`, employer listings/application APIs | Listings and applicant review exist in source. Application decision PATCH updates status; it does not create employment, team access or onboarding. |
| Work items | `lib/work/items.ts`, `app/api/work/items/route.ts` | Tasks/events/docs include business scope and private/team visibility. This does not establish project milestones, assignees, dependencies or onboarding workflows. |
| Company operations | Business document, invoice, contract, event and campaign APIs/panels | Reuse selectively. Verify each full user journey; existence of a contract record is not proof of electronic signature or legal compliance. |
| Collaboration and files | Existing Rooms/Calls, Library and document products; November 12 audit | Local evidence exists for bounded flows. Managed hosted permissions, media and provider acceptance remain pending. |

This is a source inventory, not a fresh runtime or hosted audit. No new application code, database migration, deployment or provider action is included in this planning checkpoint.

## Proposed portal navigation

- **Overview:** company switcher, my next actions, overdue work, hiring and onboarding blockers, upcoming meetings and approvals. Every number links to its actual records; never fabricate progress.
- **People:** Team and Hiring, with separate onboarding records. Public candidate profiles remain distinct from private applicant/employee records. Contractors and project guests have scoped access and visible end dates.
- **Projects:** operational projects with purpose, accountable lead, team, milestones, tasks, due dates and links to documents/rooms. Websites and shops remain clearly labeled assets/projects rather than standing in for all company work.
- **Files and knowledge:** company-scoped documents, policies, handover materials and relevant Library assets, with existing version/conflict protections.
- **Operations:** existing invoices, contracts, events, commerce and other enabled company tools.
- **Settings:** company identity, membership, permissions, installed apps, integrations, export and audit history.

A group/portfolio overview sits above individual company workspaces. A person can also have access to unrelated companies without claiming those companies share ownership. Group membership never grants subsidiary access automatically. Start with business switching; implement group relationships only with explicit authorized setup.

Preserve the current cream/orange/ink aesthetic, legible typography, mobile tap targets, keyboard access, loading/empty/error states and plain English. Extend French/Wolof through the existing localization approach; untranslated new screens remain an explicit gap. Keep nonessential modules optional and preserve affordability without inventing a new pricing plan.

## First complete workflow

1. Authorized hiring manager publishes a real Liguey job; applicant submits and receives an accurate status.
2. Manager reviews and records a decision. An accepted application is not automatically a signed offer, an employment relationship or account access.
3. Manager explicitly starts onboarding and chooses the existing account/invited email, work role, reporting manager, start date and access scope. The candidate separately accepts the invitation. Job title and access role are different fields.
4. Kebu creates an onboarding checklist from a chosen company template: required documents, policy acknowledgments, introduction, first assignment and follow-up. Each step has an owner, due date, actual state and visible failure/retry behavior. Collect only necessary private information.
5. The new member sees their own checklist, assigned project, permitted files and room. The manager sees completion/blockers and the first completed assignment.
6. Offboarding revokes company and project access, private Realtime subscriptions, app grants and outstanding invites; preserves authorized company records and the person's independent personal Kebu account.

Permission foundation comes first: repair invitation revocation/acceptance races and prove server-side capability enforcement before adding automated access handoffs. Use transactional, idempotent state transitions; retries must not create duplicate memberships, checklists, tasks or notifications. Notifications have delivery/retry state; in-app creation is not proof an email arrived.

## Data and access design to specify before implementation

Reuse existing users, businesses, business memberships, job listings/applications, work items, rooms, files and notifications. Do not duplicate them in a parallel company system.

Proposed additions, subject to schema review: operational projects and project membership, milestones/task assignment references, onboarding templates/runs/steps, and optional company-group relationships. Do not confuse operational projects with the Builder's existing `projects` table; choose explicit names after reviewing its references.

For each addition define company ownership, uniqueness/idempotency, pagination, audit events, lifecycle transitions, retention/export and role capabilities. Verify company membership plus resource scope on every read/write/export/search/realtime path. Changing a business ID in a request cannot move data across tenants. Company and group summaries aggregate only authorized records and show when their data was refreshed.

Applicant notes, private HR documents, pay information and manager reviews need narrower access than general team docs. A company must not gain a person's personal files/mail or other company data. Enforce app installation permissions and revocation through the existing marketplace consent model; an installed app does not inherit all company access.

Yande can draft job descriptions, summarize explicitly supplied application evidence, and propose project/checklist tasks for review. Human managers make hiring and access decisions. Do not use Kebu Score, ethnicity, ancestry, health or inferred sensitive attributes to score applicants or auto-reject them. No unreviewed AI grants, dismissals or candidate ranking.

## Build order and acceptance

| Order | Deliverable | Required evidence |
| --- | --- | --- |
| 1 — Improve foundations and portal connections | Fix invitation race; correct ownership/team counts; carry selected business through Hiring, Work, Rooms and files; make links and permission errors usable | Existing records remain intact; employee/manager/guest/wrong-company permission cases pass; counts match actual authorized memberships; no new placeholder panels. |
| 2 — Connect hiring to onboarding and a first project | One complete workflow above, including explicit invitation acceptance, checklist, project assignment, collaboration and offboarding | Two-user UI → API → SQL persistence and reload, double-click/retry idempotency, concurrent revoke/accept denial, expired invite, interrupted connection, wrong-company access and role-change tests. Run browser and hosted QA separately and label evidence accurately. |
| 3 — Add portfolio visibility and reusable workflows | Authorized summaries across selected companies, project/onboarding templates, action-based reporting and approved app integrations | Company A cannot discover B; group viewers see only explicitly allowed summaries; totals reconcile; switching company never carries stale private data into another workspace. |

Pilot proposal (not results): three small companies, two new team members each. Target at least five of six invitees completing onboarding and finding their first assignment without staff assistance, no duplicate records under retries, and zero unauthorized access in the negative-case suite. If users still need manual copying between Hiring, Team and Projects, or access removal fails, this workflow is not accepted. Pilot thresholds are hypotheses, not evidence of demand or security certification.

Defer payroll/tax engines, automatic legal hiring decisions, a complete ERP, untrusted app execution and elaborate company consolidation until the first-party workflow is dependable. These are separate implementation scopes, not necessary additions to every dashboard.

## Follow-through

Track this requirement within ACC01 (identity/roles), WRK01 (Liguey/Work/Rooms), BIZ01 (company operations) and DEV01 (optional app ecosystem) of `docs/KEBU_CLOSEOUT_REGISTER.md`. Preserve all previous accepted scope and the November 14 repairs. Vercel remains deferred until reset; do not introduce a paid upgrade, new hosting or hosted schema write to prepare this workflow.


## November 16 accepted expansion and source candidate

Kebu Business is the company operating workspace. Liguey is a separate optional Kebu marketplace app added to the existing account, without another signup. Removing it stops new recruitment/interview acceptance; company membership and existing employment records are not deleted. Keep RECT and other ecosystem companies separate.

The source candidate connects reviewed employer listings, private applicant review, consent-based online/office interviews, explicit accepted team invitations, onboarding lessons and graded questions, operational projects/tasks, feedback, company Rooms, shared Docs and links to existing Sheets/Slides. Attached resources retain their original ACLs: attachment is not automatic permission. Workers can read their shifts, company benefits, private HR requests, pay-method preference and employer-entered pay records. This does not execute payroll, capture bank credentials, calculate tax or provide a full benefits administrator. Portfolio reports aggregate only the signed-in person's active memberships, not presumed company-group ownership.

Employer registration submissions require a country, registration authority/number, source link and recruiter identity. Only an actual operator review can approve publication. Office interviews require separately reviewed office details. Reviews expire, candidate reports remain private, and a report does not automatically establish guilt. This reduces exposure; it cannot guarantee physical safety or independently verify registries without staff/provider work. Mandatory legal incorporation is not assumed for every informal business: unreviewed businesses can draft and run internal work, but cannot publish recruiting listings under this candidate policy.

Name research saves a person's private shortlist and compares only active reviewed KEBU businesses in the selected country. Official WIPO/OAPI/ARIPO/national registry links support manual research. It does not check every African trademark, reserve a name, determine legal clearance or claim name availability. Do not scrape restricted registry services.

Rollout gates: company portal and Liguey have independent, explicit non-production QA flags restricted to the known QA origin/loopback. Hosted missing schema must be reconciled before either is enabled. The current state endpoints explicitly flag truncated lists at their 100-record boundary; pagination/export/retention and larger-enterprise acceptance remain follow-up work. No broad enterprise completion claim is permitted.
