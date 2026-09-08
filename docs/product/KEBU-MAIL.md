# Kebu Mail — real email, not a fake inbox

**Status:** **NOT STARTED** — product law and architecture only until explicitly assigned as a vertical slice.

**Agent rule:** `.cursor/rules/kebu-mail.mdc`  
**Account model:** `docs/product/KEBU-UNIFIED-ACCOUNT.md` · `docs/product/KEBU-ACCOUNT-MODEL.md`

---

## Framing (mandatory)

**Wrong:** “Build Kebu Gmail” — a UI that *looks* like email with fake send/receive.

**Right:** **Kebu Identity + Mail** — real interoperability with the internet mail system, beautiful Kebu UX on top, **one Kebu Account** connects Search · Mail · Studio · Builder · Cloud · Business · Jobs · Shop.

> A Kebu user creates `maya@kebu.africa`, sends to Gmail, and **receives replies normally** — both directions.

---

## How real email works

```
                         KEBU MAIL
                              │
              ┌───────────────┴───────────────┐
              │                               │
         SEND MAIL                      RECEIVE MAIL
              │                               │
           SMTP                          MX / DNS
              │                               │
              └───────────────┬───────────────┘
                              ↓
                    KEBU MAIL PLATFORM
                    (provider adapter v1)
                              ↓
                       Kebu mailbox UX
```

### Maya → Gmail

```
Maya (maya@kebu.africa)
    ↓ Kebu SMTP (via provider)
    ↓ Internet mail system
    ↓ Gmail recipient
```

### Gmail → Maya (reply)

```
Gmail sender
    ↓ Internet mail system
    ↓ Kebu MX (kebu.africa or verified domain)
    ↓ Inbound processing
    ↓ maya@kebu.africa
    ↓ Maya's Kebu inbox
```

**Replies work both ways.** Same for Outlook, Yahoo, and **another Kebu user**.

---

## Do not build a mail server from scratch (v1)

Writing your own SMTP/MX stack day one creates **deliverability, spam, security, and abuse** risk.

**v1 strategy:**

1. Build **Kebu Mail application + identity layer** end-to-end (real send/receive in UX).  
2. Use **proven mail infrastructure** underneath via **provider abstraction**.  
3. Architecture **replaceable** — Kebu can progressively operate more of its own mail infrastructure later (African internet sovereignty path).

**Forbidden:** fake send · fake inbox · “email sent!” without provider/API confirmation · mock threads.

---

## Provider abstraction (required architecture)

```
lib/mail/
  adapters/
    provider-interface.ts    # send, inbound webhook, domain verify
    resend/                  # or initial provider
    ses/                     # future
    kebu-native/             # future — same interface
  mailbox/
  threading/
  attachments/
  domains/
```

Adapter must support (via provider or Kebu-native later):

| Capability | Notes |
|------------|--------|
| **SMTP / send API** | Outbound to internet |
| **Inbound** | MX or provider inbound webhook → Kebu message store |
| **IMAP or equivalent** | Optional v1 if web-only; architecture should allow |
| **MX records** | Receiving for `@kebu.africa` + verified custom domains |
| **SPF** | Publish + verify |
| **DKIM** | Sign outbound |
| **DMARC** | Policy + alignment |
| **Spam / malware** | Provider or Kebu layer — never skip |
| **Storage** | Messages + attachments (Supabase + object storage) |
| **Rate limits + abuse** | Per mailbox, per domain, per IP/API key |
| **Encryption in transit** | TLS everywhere |
| **Backups** | Message durability |

Swap provider **without** rewriting mailbox UX or identity model.

---

## Personal Kebu Mail — **FREE**

Target first-run:

> **Create your free Kebu email**  
> `yourname@kebu.africa`

**Mailbox UI (v1 target):**

```
Inbox | Sent | Drafts | Archive | Spam | Trash
                    [ Compose ]
```

Personal mail lives under **Personal Kebu** — not mixed with business mail without explicit switch.

---

## Business Kebu Mail

Business connects **verified domain** from Builder/domains slice:

```
hello@mayabeauty.com
orders@mayabeauty.com
support@mayabeauty.com
marketing@mayabeauty.com
maya@mayabeauty.com
```

**One person, multiple addresses** — same Kebu Account, business workspace context:

```
Maya's Kebu Account
│
├── Personal
│   └── maya@kebu.africa
│
└── Maya Beauty (Kebu ID)
    ├── hello@mayabeauty.com
    ├── orders@mayabeauty.com
    ├── support@mayabeauty.com
    └── maya@mayabeauty.com
```

### Shared mailboxes

`support@company.com` — **multiple employees**, RBAC, **no shared password**.

Requires: business role checks · audit · send-as permissions · server-side authz.

---

## Kebu Identity + Mail (not “Kebu Gmail”)

Mail is the **communication layer** on the **same identity graph** as everything else:

```
One Kebu Account sign-in
    → Search · Mail · Studio · Builder · Cloud · Business · Jobs · Shop
```

Switch **context** (personal vs business mailbox) — **not** a new login.

Aligns with: `docs/product/KEBU-UNIFIED-ACCOUNT.md`

---

## Data model (sketch — implement in slice)

Normalized tables (names illustrative):

- `mailboxes` — address, owner (user or business), type personal|business|shared  
- `mail_domains` — domain, verification status, DNS records (SPF/DKIM/DMARC/MX)  
- `mail_messages` — headers, body, direction, provider ids  
- `mail_threads` — conversation grouping  
- `mail_attachments` — storage refs  
- `mail_aliases` · `mail_forwarding_rules`  
- `mail_shared_access` — user ↔ shared mailbox + role  
- `mail_audit_events` — send-as, admin actions  

**RLS:** personal mail private to user; business mail scoped to Kebu ID roles; shared mailbox via membership table.

---

## DNS & domain verification slice

Prerequisite path already started in Builder **custom domains** — Mail extends:

1. Verify domain ownership (same or stricter than site DNS)  
2. Provision MX (or provider inbound)  
3. Publish SPF, DKIM, DMARC  
4. Health check before `hello@` goes live  

---

## UX principles

- Mobile-first · low-bandwidth-friendly (text-first loading, lazy attachments)  
- Threading · search · contacts (phased)  
- Plain language — not enterprise Exchange jargon for youth users  
- **Real states:** sending · sent · failed · bounce · spam — honest errors  
- No fake unread counts  

Design system: `docs/product/DESIGN_SYSTEM.md` — professional density, not landing-page inbox.

---

## Security & compliance

- Send-as authorization server-side only  
- Attachment scanning (provider or Kebu)  
- Phishing/abuse reporting  
- Account recovery tied to Kebu Auth  
- Cross-mailbox isolation (RLS + tests)  
- Audit log for business sends  

See: `docs/security/README.md`

---

## Recommended vertical slices (when assigned)

**Do not build all at once.**

| Slice | Outcome |
|-------|---------|
| **M1** | Personal `@kebu.africa` — real send + receive via provider · inbox UI · persist · refresh |
| **M2** | Compose · attachments · threading basics · failed/bounce states |
| **M3** | Business domain verify + one address (`hello@`) · RBAC send-as |
| **M4** | Multiple addresses + aliases + forwarding |
| **M5** | Shared mailbox + team access |
| **M6** | Search · contacts · labels/folders depth |
| **M7** | Deliverability dashboard (SPF/DKIM/DMARC health) for merchants |

Each slice: `docs/product/DEFINITION_OF_DONE.md` + `npm run ci` + RLS tests.

---

## Cursor instruction (when slice assigned)

```
Build Kebu Mail end-to-end as a production-ready email application, with a
provider abstraction for SMTP/inbound mail infrastructure.

Do NOT fake sending or receiving.

Implement the complete mailbox, message, threading, attachment, contact,
folder, authentication, DNS/domain-verification, and provider integration
architecture.

Start with a reliable mail infrastructure provider; make the architecture
replaceable so Kebu can eventually operate more of its own mail infrastructure.

Read docs/product/KEBU-MAIL.md and docs/product/PRODUCT_RULES.md first.
One vertical slice only. Product Architect blueprint before code if new surface.
```

---

## Dependencies (before Mail slice 1)

| Dependency | Status |
|------------|--------|
| Kebu Account (one auth user) | Partial |
| Personal vs business workspace | Partial |
| `@kebu.africa` DNS control (MX) | Ops — not app-only |
| Custom domain verification (Builder) | IN PROGRESS |
| Provider account + webhook secrets | Ops |

---

## Progressive infrastructure sovereignty

1. **v1:** Kebu app + identity + provider adapter (fast, reliable deliverability)  
2. **v2:** Own MX for `@kebu.africa` + provider for custom domains  
3. **v3:** More Kebu-operated inbound/outbound with same adapter interface  

Product UX and identity model stay stable; **infrastructure swaps under the hood**.

---

## Forbidden

- Fake inbox / simulated send  
- Separate Mail signup from Kebu Account  
- Business mail without domain verification  
- Shared password for team inbox  
- Building raw SMTP server in slice 1  
- “Kebu Gmail” positioning — it’s **Identity + Mail**

---

## Related

- Unified account: `docs/product/KEBU-UNIFIED-ACCOUNT.md`  
- Account model: `docs/product/KEBU-ACCOUNT-MODEL.md`  
- Domains (Builder): custom domain slice in `docs/IMPLEMENTATION_STATUS.md`  
- Global access: personal mail free; product globally usable — `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`  
- Status: `docs/IMPLEMENTATION_STATUS.md`
