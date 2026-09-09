# Architecture & product decisions (ADR-lite)

Record non-obvious decisions so Cursor does not silently reinvent them.

**When:** ambiguous requirements resolved · schema choice · nav IA change · breaking UX change.

**When NOT to code:** propose options first — `kebu-ambiguity.mdc`

---

## Template

```markdown
# ADR-NNN: Title

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Superseded

## Context

## Decision

## Consequences

## Alternatives considered
```

Name files: `NNN-short-title.md`

---

## Index

| ADR | Title |
|-----|-------|
| [2026-09-07-senegal-aesthetic-remake](./2026-09-07-senegal-aesthetic-remake.md) | Senegal aesthetics + sell-anywhere |
| [2026-09-07-alk-joko-commerce-rails](./2026-09-07-alk-joko-commerce-rails.md) | Native AfriID/Joko/ALK rails (not bolted-on PSPs) |
| [2026-09-08-joko-partner-api-align](./2026-09-08-joko-partner-api-align.md) | Shop pay → Joko Partner `amount_xof` + phone + HMAC |
| [2026-09-07-kebu-afriid-registration-forms](./2026-09-07-kebu-afriid-registration-forms.md) | Kebu business form vs AfriID person form |
| [2026-09-07-reach-s10b-placement-network](./2026-09-07-reach-s10b-placement-network.md) | Reach Board CPC · no invented impressions |
| [2026-09-07-studio-teach-me-pipeline](./2026-09-07-studio-teach-me-pipeline.md) | Create for me / Teach me · Studio→Builder→Shop pipeline |
| [2026-09-07-studio-full-creative-architecture](./2026-09-07-studio-full-creative-architecture.md) | Full Studio · Quick/Full Timeline · not Canva+CapCut |
| [2026-09-08-create-builder-my-sites-aesthetics](./2026-09-08-create-builder-my-sites-aesthetics.md) | Create = Builder; My Sites ≠ Aesthetics gallery |
| [2026-09-08-yande-is-the-website-designer](./2026-09-08-yande-is-the-website-designer.md) | Describe → AI designs → instruct → redesign |
| [2026-09-08-studio-visual-music-intelligence-not-daw](./2026-09-08-studio-visual-music-intelligence-not-daw.md) | Studio = visual + music intelligence · not DAW · V1→V3 |
| [2026-09-08-studio-create-north-star](./2026-09-08-studio-create-north-star.md) | AI Creative Director · one project → everything · CREATE umbrella |
| [2026-09-08-owner-portfolio-draft-auto-sync](./2026-09-08-owner-portfolio-draft-auto-sync.md) | Owner May drafts sync seed on open; publish only for live |
| [2026-09-08-studio-fonts-brand-posters](./2026-09-08-studio-fonts-brand-posters.md) | Fonts catalog · brand/aesthetic apply · posters/banners/cards |
| [2026-09-08-studio-music-timeline-v1-v3](./2026-09-08-studio-music-timeline-v1-v3.md) | Music-aware V1 · keyframes V2 · AI music edit V3 |
| [2026-09-08-brand-dna-creative-director](./2026-09-08-brand-dna-creative-director.md) | Brand DNA foundation · Creative Director campaigns |
| [2026-09-08-studio-folders-s17](./2026-09-08-studio-folders-s17.md) | Studio folders · design library collections |
| [2026-09-08-studio-s17-s20-cursors-storyboard](./2026-09-08-studio-s17-s20-cursors-storyboard.md) | Folders · versions · elements · comments · live cursors · storyboard |
| [2026-09-08-studio-capcut-nle-slices](./2026-09-08-studio-capcut-nle-slices.md) | Quick Edit · speed · captions · color · chroma · nested |
| [2026-09-08-billing-ai-analytics-depth](./2026-09-08-billing-ai-analytics-depth.md) | Plan limits · AI metering · analytics depth |
| [2026-09-08-billing-cron-checkout-otp-ai-sections](./2026-09-08-billing-cron-checkout-otp-ai-sections.md) | Hosting cron · checkout email OTP · AI section checkboxes |
| [2026-09-08-phone-first-sms-fulfill](./2026-09-08-phone-first-sms-fulfill.md) | Phone-first checkout · SMS on deliver · site caps |
| [2026-09-08-kebu-record-ops-help-cron](./2026-09-08-kebu-record-ops-help-cron.md) | Admin Record: accounts · help desk · cron health |
