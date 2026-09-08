# Kebu — UX Specification

**Stage A output** — complete UX architecture **before implementation code**.

**Process:** `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md` · **Per-screen:** `docs/screens/SCREEN_SPEC_TEMPLATE.md`

---

## Five spec layers (summary)

| Layer | Question |
|-------|----------|
| **Product** | What does the application do? |
| **Visual** | How does it look? (`DESIGN_SYSTEM.md`) |
| **Interaction** | How does it respond? (this doc + screen specs) |
| **Engineering** | How does data/code work? (`KEBU-MASTER-ENGINEERING-INSTRUCTION.md`) |
| **Completion** | What is finished? (`DEFINITION_OF_DONE.md`) |

---

## Stage A deliverables (no code)

### 1. Information architecture

Domains, entities, and how users mental-model the product.

### 2. Navigation architecture

Primary · secondary · contextual · mobile vs desktop · deep links · breadcrumbs where needed.

### 3. Screen inventory

Every major surface listed — no orphan routes.

### 4. User journeys

End-to-end paths with entry, steps, success, failure, exit.

### 5. Component inventory

Shared primitives + domain components — map to design system.

### 6. Interaction model

Global patterns: selection, drag, undo/redo, keyboard shortcuts, multi-select, confirmations.

### 7. Responsive behavior

**Different composition** on mobile where needed — not only scaled desktop.

### 8. State model

Loading · empty · error · success · offline · permission-denied · per surface.

---

## Per-surface UX questions

For **each major surface**:

| Question | Document in screen spec |
|----------|-------------------------|
| What does the user see? | Layout regions |
| What can they do? | Actions inventory |
| Click / tap behavior? | Interaction table |
| No data? | Empty state copy + CTA |
| Error? | Message + recovery |
| Loading? | Skeleton / progress |
| After success? | Confirmation + next step |
| Mobile? | Layout notes |
| Keyboard? | Shortcut table |
| After refresh? | Persistence notes |

---

## Stage B — Screen specification

One file per major screen in `docs/screens/` using `SCREEN_SPEC_TEMPLATE.md`.

Implementation instruction:

> Implement this screen **exactly according to this specification**. Do not simplify the interaction model.

---

## Separate design from implementation

**Forbidden in one pass:**

```
invent product + UX + visual + architecture + DB + code simultaneously
```

**Required order:**

```
Stage A: UX architecture (this doc)
Stage B: Screen specs
Stage C: One vertical slice implementation
Stage D: Quality gate + inspect loop
```

---

## Example: canvas editor regions (reference pattern)

For a future Studio/editor slice — spec **regions** before code:

1. Top navigation  
2. Left tool rail  
3. Contextual properties panel  
4. Canvas  
5. Page navigator  
6. Collaboration / status area  

Interactions to enumerate: select · drag · resize · undo · redo · zoom · pan · keyboard shortcuts · layer order · text edit · asset replace · save persistence.

Kebu Studio law: `docs/product/KEBU-STUDIO.md` — **NOT STARTED** until assigned.

---

## User flows folder

Journey diagrams and narratives: `docs/user-flows/README.md`
