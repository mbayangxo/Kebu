# Kebu ecosystem context — youth-focused product architecture

This document defines the long-term Kebu ecosystem so current engineering stays compatible with future products.

**It is not permission to build every product now.**

Current development must remain focused on **Kebu Phase One**.

Do not create unfinished pages, placeholder dashboards, empty navigation items, fake integrations, or partial backend systems for future products unless explicitly assigned in a later vertical slice.

Agent-enforced summary: `.cursor/rules/kebu-ecosystem.mdc`.

---

## African Builder Ecosystem — end-to-end infrastructure

Kebu is one connected **African Builder Ecosystem**. Three product pillars sit on shared core services. Everything flows through the same account, business identity, and permissions — not separate silos.

```
                           KEBU
              African Builder Ecosystem
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Kebu Builder      Kebu Opportunity     Kebu Cloud
        │                  OS                 │
        │                  │                  │
   Websites             Discover          Deploy apps
   Stores               Markets           Databases
   AI websites          Resources         APIs
   Templates            Trade             Storage
   Domains              Industries        Compute
   Analytics            Research          AI
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    Shared Kebu Core
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     Kebu ID           Kebu Score          Kebu Mail
        │                  │                  │
     Identity          Business           Business
                       credibility           email
```

### Product domains (logical separation, shared core)

| Product | Job | Phase One status |
|--------|-----|------------------|
| **Kebu Builder** | Turn an idea into website, store, brand, templates, AI edits | **Active** — `/create`, `/sites`, stores |
| **Kebu Opportunity OS** | Discover what to build — countries, industries, resources, trade, Build This Business | **Active slice-by-slice** — Country Explorer and related routes |
| **Kebu Domains** | Connect (later: buy) real domains; anchor identity and Mail | **Active slice** — custom domain connect; registrar links until Kebu sells |
| **Kebu Analytics** | Business and store intelligence, next actions | **Partial** — store/site analytics when assigned; no fake dashboards |
| **Kebu Cloud** | Run software you built — deploy, DB, APIs, compute (invisible to beginners) | **Future** — compatibility only; do not ship placeholders |
| **Shared Kebu Core** | Account, auth, RBAC, billing, notifications, AI routing, audit, design system | **Active** |
| **Kebu ID** | Permanent digital identity of the **business** | **Active** — draft business, roles, country modules |
| **Kebu Score (KA Score)** | Explainable business readiness tied to a Kebu ID | **After real ops data** — readiness UI exists |
| **Kebu Mail** | Business email on your domain | **Future** — after verified domains |

### How products connect (end-to-end)

1. **Opportunity OS → Builder** — “Build this opportunity” creates a business draft, Kebu ID path, and website/store project (never auto-publish).
2. **Builder → Core** — Every site/store project belongs to a user and optionally a Kebu ID; publish, domains, and billing go through server auth + DB.
3. **Builder → ID** — Registration prep, team roles, and business profile feed the same Kebu ID record.
4. **Builder + commerce → Score** — Orders, publish state, fulfillment, and records become score inputs (never browser-set numbers).
5. **Builder domains → Mail (future)** — Verified custom domains (`www.mybrand.com`) are the anchor for business email when Kebu Mail ships.
6. **Cloud (future)** — Same account and Kebu ID; deploy apps that can link to Builder sites, stores, and Opportunity data via APIs.

**Engineering rule:** Shared core is real infrastructure (auth, ID, billing, RBAC). Product pillars stay separate domains — no single mega-table or fake “coming soon” nav for Cloud or Mail.

### Why products stay separate (do not merge Cloud into Opportunity OS)

They are **fundamentally different jobs**. Connected in the user journey — not in one UI or one backend monolith.

| Product | Core question |
|--------|----------------|
| **Kebu Opportunity OS** | What can I build? Where is the opportunity? What resources exist? Who can I work with? How do I start this business? |
| **Kebu Builder** | How do I turn my idea into a website, store, and brand? |
| **Kebu Cloud** | How do I run the software I’ve built? (Infrastructure — mostly invisible to beginners.) |

Opportunity OS is intelligence and discovery. Builder is creation and launch. Cloud is runtime infrastructure. **Do not collapse these into one “giant app screen.”**

The user should feel one **coherent ecosystem**, not a Swiss Army knife with seventy buttons.

### Named products (one platform, many products — not many startups)

Think of Kebu as **the platform**, with separate products:

- **Kebu Builder** — websites, stores, templates, AI sites (apps later)
- **Kebu Opportunity** — African opportunities, resources, markets, trade, business intelligence
- **Kebu Cloud** — infrastructure for developers and scaling businesses
- **Kebu Mail** — business communication on your domain
- **Kebu Domains** — digital identity and domain connection (Phase One: connect domains you own; later: sell domains)
- **Kebu Analytics** — business and store intelligence

Later (compatibility only until assigned): Kebu Docs, Drive, Studio, Learn, etc.

**Shared across products (Shared Kebu Core):** Kebu ID · billing · Kebu AI · Kebu Score · business profile · payment integrations · security · infrastructure abstractions.

### The magic is the connection (example journey)

A young person in Senegal searches Kebu Opportunity: *“I want to start a food-processing company. What opportunities are there?”*

1. **Discover** — Opportunity OS surfaces verified/ labeled intelligence (e.g. import gaps, resources, trade context).
2. **Build** — User clicks **Build with Kebu** → draft business + Kebu ID path + Builder project (site, catalog, store, branding — never auto-publish).
3. **Launch** — Publish site, connect domain, business email (Mail, when assigned); Cloud provides runtime underneath without exposing Kubernetes to a 19-year-old.
4. **Connect** — Kebu ID ties identity, analytics, payments, score inputs, and team permissions to one business.

That end-to-end path is the ecosystem — not “African Canva” or “African Shopify” alone.

### Kebu Cloud: invisible by default, powerful when needed

Normal users should **not** need to understand Kubernetes, Docker, PostgreSQL, Redis, containers, load balancers, VPCs, or CI/CD.

They say: **“Publish my app.”** Kebu Cloud handles infrastructure underneath.

Developers who want control get an **advanced Cloud dashboard** — same ecosystem, different depth:

| Level | Experience |
|-------|------------|
| **Beginner** | Build → Publish |
| **Creator** | Build → Customize → Publish |
| **Developer** | Repository → Services → Database → Deployments → Logs |
| **Professional team** | Organizations → Environments → Infrastructure → Observability → Security |

Phase One **website/store hosting** lives in Builder; full Kebu Cloud is a **future product** with abstractions prepared in core — not merged into Opportunity OS.

### The full journey (north star)

Kebu can eventually cover:

**Discover → Learn → Find opportunity → Build → Register → Get domain → Get email → Launch → Sell → Analyze → Scale → Deploy software → Raise capital**

That is infrastructure that takes an **African idea all the way to an operating business** — one connected ecosystem, separate products, shared core.

---

## 1. Kebu’s audience

Kebu is designed primarily for African youth.

Users may include college students, university graduates, young entrepreneurs, first-time founders, young developers, designers, freelancers, creators, informal and small-business owners, and young people who have ideas but little money, have never built a company or written code, or want to enter technology, manufacture/process products, or trade across Africa.

Do not design Kebu like traditional enterprise software.

Avoid experiences that assume the user already understands incorporation, business structures, hosting, domains, databases, APIs, analytics, cash flow, inventory, conversion rates, compliance, manufacturing, regional trade, or investment.

Kebu should explain these concepts in understandable language while still giving advanced users deeper controls.

---

## 2. Product personality

Kebu should feel: ambitious, youthful, intelligent, African, encouraging, energetic, creative, modern, practical, trustworthy, easy to understand, and serious enough for real businesses.

Kebu should not feel: childish, corporate and cold, like a government portal, like accounting software, like a generic Western SaaS dashboard, like a collection of AI chatboxes, like a school textbook, or like a social-media feed built for distraction.

The product should make users feel: **“I can actually build this.”**

---

## 3. Core product principle

Every major Kebu experience should help a user answer one or more of:

- What opportunity exists?
- What can I build?
- How do I build it?
- Who can help me build it?
- How do I launch it?
- How do I register it?
- How do I sell?
- How do I receive money?
- How do I understand my business?
- How do I grow?
- How do I trade with other African countries?
- How do I learn the skills I am missing?

Every screen should help the user understand their next action.

Do not create dashboards that merely display information without helping the user act.

---

## 4. Kebu Phase One — current product

Kebu Phase One is Africa’s AI Business Builder and Opportunity Operating System.

This is the only ecosystem product currently being fully implemented.

Its job is to help users:

1. Discover an opportunity.
2. Understand the opportunity.
3. Create a business.
4. Receive a Kebu ID.
5. Register or prepare to register the business.
6. Build a website or store.
7. Use AI to generate and improve the website.
8. Publish and host the website.
9. Sell products or services.
10. Connect supported payments, including K21 where available.
11. View strong business and store analytics.
12. Understand what to do next.
13. Improve the business over time.

Current Phase One systems include (when assigned as slices): Kebu AI, Opportunity OS, Build My Country, business creation, business-registration guidance, future government-registration integrations, Kebu ID, Kebu Score (KA Score), AI website generation, website templates, visual website editing, store creation, product management, orders, payments, hosting, domains, store analytics, business analytics, AI business guidance, and business news / opportunity reporting.

Do not expand Phase One into unrelated productivity or infrastructure systems unless explicitly assigned.

---

## 5. Kebu AI

Kebu AI is the intelligent assistant within Kebu.

It should help users understand opportunities, plan businesses, generate websites and stores, explain concepts, understand analytics, improve products, create roadmaps, research markets, understand imports/exports, learn through their own projects, identify missing steps, and find relevant people, services, and resources.

Kebu AI is not just a general chatbot.

It should be connected to the user’s Kebu businesses, projects, websites, stores, products, orders, analytics, opportunities, goals, saved research, and learning progress.

Kebu AI must respect permissions and business boundaries.

It must never access another user’s private business information.

---

## 6. Kebu Opportunity OS

Opportunity OS helps users discover what they can build.

It should include country and industry opportunities, import-substitution and export opportunities, intra-African trade, agricultural-processing and manufacturing opportunities, technology gaps, service-business opportunities, government programs, grants, incubators, public tenders where available, entrepreneur stories, company case studies, and resource/commodity value chains.

Every opportunity should distinguish: verified information, public-source data, estimates, AI-generated ideas, assumptions, and questions requiring validation.

Users should be able to click **Build This Opportunity**, which creates a connected business-building journey inside Kebu.

See `.cursor/rules/kebu-opportunity-os.mdc`.

---

## 7. Kebu business news

Kebu should eventually include a youth-oriented African business news and opportunity product.

Working names may include: Kebu Pulse, Kebu Today, Kebu Business, Kebu Opportunities, Kebu Brief.

Do not finalize the public name without a product decision.

Every story should answer: what happened, why it matters, which country/industry is affected, who could benefit, what risks exist, what opportunity might this create, what a young entrepreneur should research next, and whether the user can build something from this.

Articles must not merely summarize news. They should translate information into understandable economic and business implications.

Example structure: Headline → What happened → Why it matters → Who is affected → Opportunity to research → Risks and limitations → Build or save this idea.

Do not publish unsupported business claims. Do not build this product until assigned.

---

## 8. Kebu Score

**Kebu Score** (also called **KA Score** in earlier docs) is the business score connected to a Kebu ID.

It should help users understand business readiness, verification, operating health, reliability, record completeness, compliance readiness, customer activity, fulfillment, growth, trade readiness, and funding readiness.

It must be explainable. Do not show only a number.

Show what improved the score, what reduced it, missing data, recommended actions, confidence level, and score history.

Kebu Score must not be a popularity score, must not be purchasable, and must not initially be presented as an official regulated credit score.

See `.cursor/rules/kebu-ka-score.mdc`.

---

## 9. Future product: Kebu Cloud

Kebu Cloud is a future separate product. It is not the same as the website hosting included in Kebu Phase One.

Phase One hosting supports Kebu-created websites and stores.

Kebu Cloud will eventually support developers building and hosting broader applications (deploy, Git, pipelines, containers, serverless, databases, auth, storage, logs, monitoring, jobs, env vars, domains, SSL, backups, AI APIs, developer analytics).

Do not build Kebu Cloud during Phase One unless an explicitly assigned infrastructure abstraction is required.

Current code should avoid becoming permanently dependent on one cloud provider where a reasonable abstraction is possible.

---

## 9b. Future product: Kebu Mail

Kebu Mail is business email tied to a Kebu ID and verified domain from Kebu Builder (e.g. `hello@mybrand.com`, `orders@mybrand.com`).

It is not personal webmail. It should respect RBAC (who can send as the business), audit, and the same billing/core account as Builder.

Do not build Kebu Mail during Phase One unless explicitly assigned. Custom domain connection in Builder is the prerequisite path.

---

## 10. Future product: Kebu Studio

Kebu Studio is a future separate design product (logos, brand kits, posters, packaging, social graphics, short video, AI design, template marketplace).

Kebu Phase One may generate basic business branding and website assets. That does not mean Phase One should become a full Canva-style editor.

Do not build a free-form professional design canvas inside the current website builder unless explicitly assigned.

---

## 11. Future product: Kebu Learn

Kebu Learn is a future education product focused on learning through building (coding, AI, design, entrepreneurship, finance, marketing, manufacturing, agriculture, trade, product development, cloud, registration, analytics).

Learning should be project-based: real websites, stores, portfolios, plans, apps, product concepts, research reports, manufacturing plans.

Phase One may contain guidance and explanations. Do not build a full LMS unless explicitly assigned.

---

## 12. Future product: Kebu Docs

Kebu Docs is a future productivity suite (documents, spreadsheets, presentations, notes, forms, whiteboards, PDF tools, shared workspaces, collaboration, business templates).

Treat it as a separate focused product. Do not add document/spreadsheet/presentation editing to Phase One unless required for a specific business workflow.

Phase One may generate downloadable reports, plans, or documents without becoming a complete office suite.

---

## 13. Future product: Kebu Labs

Kebu Labs is a future research and action institution (industry/country opportunity research, import substitution, export, trade, manufacturing, agriculture, infrastructure, youth entrepreneurship, technology/policy, AI, economic strategy).

It should feed verified research into Opportunity OS. It is not merely a blog.

Do not build a full research-institution management system in Phase One. Build the data and sourcing architecture needed for Opportunity OS to accept reliable research later.

---

## 14. Future product: Kebu Ventures

Kebu Ventures is a future separate investment and startup-support organization (incubation, acceleration, angel/venture investing, grants, mentorship, demo days, introductions, government pilots, corporate partnerships, competitions).

It must remain legally and operationally separate from the ordinary Kebu software subscription business where required.

A strong Kebu Score may help businesses become discoverable for further review, but it must never guarantee investment.

Do not build investment approval or automatic funding into Phase One.

Phase One may support saving funding opportunities, applying to future programs, business-readiness tracking, and permissioned data rooms later.

---

## 15. Future talent and work network

Kebu may eventually help users find cofounders, developers, designers, marketers, accountants, legal professionals, researchers, engineers, manufacturing specialists, suppliers, hire service providers, offer services, and form project teams.

This should be a work network, not a popularity-based social network.

Optimize for teams formed, work completed, businesses launched, contracts delivered, knowledge shared, people hired, and projects completed.

Do not add a generic social feed in Phase One.

---

## 16. One ecosystem, separate products

The long-term structure should feel like one connected ecosystem.

Products may share: one Kebu account, user profile, business memberships, Kebu ID, permissions, billing, notifications, file references, AI provider infrastructure, design system, audit logging, and security standards.

Products should remain logically separated.

Do not create a single giant database table, service, dashboard, or navigation system containing every future capability.

Use clear domains and boundaries, for example: identity, business, opportunity, websites, commerce, analytics, registration, cloud, design, learning, productivity, research, investment, talent.

Avoid circular dependencies.

---

## 17. Youth-focused UX rules

Every major flow should: use clear language, explain unfamiliar terms, show progress, show what happens next, save automatically where appropriate, work well on mobile, avoid unnecessary forms, allow voice and AI-assisted input later, offer examples and templates, prevent users from feeling lost, celebrate meaningful progress without becoming childish, and make complex systems feel manageable.

Examples:

- Instead of “Provision production deployment environment” → “Publish your website”
- Instead of “Legal entity classification” → “What kind of business are you registering?” then offer a deeper explanation
- Instead of “Conversion rate decreased” → “Fewer visitors completed a purchase this week.” then explain the technical metric separately

---

## 18. Affordability rules

Kebu is designed for users who may not afford expensive software subscriptions.

Architecture should support free access, low-cost youth plans, student plans, pay-as-you-go credits, business plans, university/government/telecom/incubator sponsorship, usage limits, AI cost controls, regional payment methods, and K21 where available.

Do not assume every user has a credit card, stable monthly income, expensive devices, unlimited mobile data, reliable broadband, or advanced technical knowledge.

---

## 19. Mobile and connectivity

Kebu must be designed for mobile-first use, low-end devices, slower connections, intermittent internet, and limited data plans.

Use compressed assets, progressive loading, efficient API responses, autosave queues, retry behavior, local drafts where safe, clear offline states, and resumable uploads where practical.

Never falsely show that data is saved when it is only stored locally and has not reached the server.

---

## 20. Current engineering priority

The current engineering priority is Phase One.

Build in complete vertical slices.

Recommended Phase One order:

1. Repository audit
2. Authentication
3. Personal profile
4. Kebu ID
5. Business roles and permissions
6. Business dashboard
7. Business-registration preparation
8. Country registration modules
9. Registration progress tracking
10. Website templates
11. Create website from template
12. AI website generation
13. Visual website editor
14. Autosave and versions
15. Website publishing
16. Kebu subdomains
17. Custom domains
18. Store creation
19. Products and inventory
20. Cart
21. Checkout
22. Orders
23. K21 payment integration
24. Store analytics event collection
25. Store analytics dashboard
26. AI business intelligence
27. Kebu Score
28. Opportunity OS country explorer
29. Resource and import explorer
30. Opportunity AI
31. Build This Opportunity
32. Kebu business news

Do not build multiple major slices simultaneously.

---

## 21. Strict future-product rule

When implementing Phase One:

- Do not build Kebu Cloud, Studio, Docs, Learn, or Ventures merely because they appear in this document.
- Do not build incomplete placeholder routes for future products.
- Do not add buttons that lead nowhere.
- Do not create empty database tables without a current use.
- Do not add “Coming Soon” pages unless explicitly requested.
- Do not let future products distract from completing the assigned vertical slice.

Use this document only to preserve architectural compatibility and product clarity.

---

## 22. Definition of success

Kebu succeeds when a young African user can say:

“I found an opportunity.”  
“I understood it.”  
“I created my business.”  
“I registered it.”  
“I built my website.”  
“I launched my store.”  
“I received my first customer.”  
“I understood my analytics.”  
“I improved my business.”  
“I found people to build with.”  
“I learned skills through creating something real.”

Every engineering decision should move Kebu closer to that experience.
