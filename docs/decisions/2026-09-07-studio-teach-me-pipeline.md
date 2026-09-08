# ADR: Studio Create-for-me / Teach-me + creation pipeline

**Date:** 2026-09-07  
**Status:** Accepted  
**Related:** `KEBU-STUDIO-MASTER-SPEC.md` · `KEBU-NO-WATCHING.md`

## Context

A 19-year-old should not only get “an African Canva.” They should either get work done fast **or** learn design by making — inside the same tool. That is Kebu’s **learn by building** principle (not lecture LMS).

Kebu’s moat vs a standalone design app is the **continuous ecosystem**:

```
Studio → Builder → Shop → Mail → Cloud
```

(Reach sits on attention; Mail/Cloud when those products are live.)

## Decision

1. **Creation intent toggle** on AI create (and later templates):
   - **Do it for me** (`create_for_me`) — Kebu builds editable designs; minimal coaching chrome.
   - **Teach me** (`teach_me`) — same editable output **plus** persisted design lessons explaining *why* (layout, color, type, brand, marketing). Lessons are part of the canvas document so they survive refresh.
2. Teaching is **guidance on the work**, not a video course. Aligns with No watching.
3. Surface an honest **pipeline strip** on Studio home/create: Studio → Builder → Shop → Reach (Mail/Cloud labeled when not live).
4. Do **not** fake deep tutoring or claim Mail/Cloud send until those slices exist.

## Consequences

- First slice: toggle on `/studio/new` AI tab → generate API → `canvas.coach` → editor Teach panel.
- Later: conversational “why did you…” mutations, blank/template teach paths, Builder sync of brand lessons.
