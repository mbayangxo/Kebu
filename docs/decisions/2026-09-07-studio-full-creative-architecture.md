# ADR: Full creative Studio — not Canva+CapCut frankenstein

**Date:** 2026-09-07  
**Status:** Accepted  
**Spec:** [`KEBU-STUDIO-VIDEO-ARCHITECTURE.md`](../product/KEBU-STUDIO-VIDEO-ARCHITECTURE.md)

## Context

Kebu must not ship a poster tool with bolted-on “random CapCut features,” nor assume African users only need simple software. Need the same professional **ceiling** with a dramatically easier **entry**.

## Decision

1. **One Studio** with areas: Design · Image · Video · Audio · AI · Brand · Publish.  
2. **One composition engine** (`lib/studio/composition.ts`) for Quick Edit · Smart Edit · Full Timeline.  
3. **Storyboard → Timeline → Export** as the beginner video path.  
4. **Music intelligence** (BPM · beats · later sections) is a first-class creator feature — especially for African music workflows — not a gimmick.  
5. Essential CapCut-class features are a **roadmap**, not a fake checklist UI. Professional NLE features are **later**, but schema must not block them.  
6. Ecosystem stays continuous: Studio → Builder → Shop → Reach → Mail → Cloud.

## Consequences

- Implement video as vertical slices against composition schema.  
- Do not claim CapCut/Premiere parity until TESTED.  
- Graphics editing slices may continue when assigned without waiting for Full Timeline.
