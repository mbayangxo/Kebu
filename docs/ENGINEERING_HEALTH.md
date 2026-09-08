# Kebu — Engineering Health & Bug Sentinel

**Status:** **NOT STARTED** — architecture and product law only until assigned as a vertical slice.

**Purpose:** Nightly (and continuous) detection of production/regression issues → internal **Engineering Health** dashboard → controlled fix pipeline — **not** silent auto-patches at 3 AM.

**Related:** `docs/product/BUG_PROTOCOL.md` · `docs/CI_PIPELINE.md`

---

## Bug Sentinel (scheduled checks)

Run on a schedule (e.g. nightly + continuous for critical signals):

| Signal | Example |
|--------|---------|
| Failed jobs | Cron billing, webhooks, email |
| API error rates | 5xx spike on `/api/*` |
| Failed payments | JOKO / PayPal / Paystack / Wave |
| Broken links | Published sites, public IDs |
| DB constraint errors | Unique violations, FK failures |
| Auth failures | Spike in 401/403, brute patterns |
| Slow queries | p95 above threshold |
| Background jobs | Stuck queues, dead letter |
| Frontend exceptions | Client error reporting |
| Abnormal traffic | DDoS, scrape abuse |
| Storage failures | Upload/download errors |
| Stale listings | Property/shop data freshness (when live) |
| Failed notifications | Email/SMS/push |

---

## Engineering Health dashboard (internal)

Example summary:

```
🔴 3 critical
🟠 7 warnings
🟢 98.7% healthy
```

### Incident record

Each incident:

| Field | Description |
|-------|-------------|
| **ID** | e.g. `INC-2026-0142` |
| **Severity** | critical · warning · info |
| **Service** | builder · shop · auth · payments · … |
| **First detected** | timestamp |
| **Last detected** | timestamp |
| **Frequency** | count / window |
| **Stack trace** | sanitized |
| **Affected users** | count or segment (privacy-safe) |
| **Status** | open · investigating · mitigated · resolved |
| **Owner** | engineer / on-call |
| **Resolution** | root cause + fix link |

Link to **`BUG-NNNN`** tickets when triaged.

---

## AI-assisted fix pipeline (controlled)

**Forbidden:** cron or agent **merges to production** without human review.

**Allowed workflow:**

```
1. Sentinel detects anomaly OR CI fails OR user reports
2. System creates BUG-1842 (ticket)
3. AI analyzes: logs · tests · stack · affected files
4. AI outputs:
   - Root cause hypothesis
   - Affected files
   - Proposed fix (diff)
   - Tests to add
   - Risk assessment
5. Human developer reviews
6. Fix branch → PR → CI (full gate chain)
7. Review → merge → staging → E2E → production
```

Cursor/AI is powerful **inside the branch + CI loop** — not as unsupervised production editor.

Full protocol: `docs/product/BUG_PROTOCOL.md` § AI-assisted triage.

---

## Data sources (when built)

- Application logs (structured)  
- Supabase metrics / slow query log  
- Webhook failure tables  
- Sentry or equivalent (frontend exceptions)  
- CI history  
- Uptime checks on critical routes  
- Payment provider dashboards (adapter reconciliation)  

---

## Slice order (when assigned)

1. Structured logging + error taxonomy  
2. CI failure → ticket stub  
3. Nightly health job (read-only checks)  
4. Internal `/engineering/health` dashboard (admin RBAC)  
5. AI triage assistant (proposal only, no auto-merge)  

Do not build empty dashboard shell without real signal ingestion.
