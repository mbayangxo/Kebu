# Screen specification template

Copy this file to `docs/screens/[feature]-[screen-name].md` before implementing a major surface.

**Rule:** Implement **exactly** per this spec. Do not simplify the interaction model without explicit approval.

---

## Meta

| Field | Value |
|-------|-------|
| **Screen name** | |
| **Route / entry** | |
| **Product area** | Builder · Shop · Business · Account · … |
| **Slice** | e.g. Slice 1 of Studio editor |
| **Status** | Draft · Approved · Implemented |
| **Reference images** | `docs/reference/...` (roles assigned) |

---

## Purpose

One paragraph: what job this screen performs for the user.

---

## Primary regions

Numbered layout regions (desktop). Example:

1. Top navigation  
2. Left rail  
3. Main canvas / content  
4. Contextual panel  
5. Footer / status  

Include **mobile composition** differences — not shrink-only.

---

## Data dependencies

| Entity | Source | Auth |
|--------|--------|------|
| | Supabase table / API | owner / team / public |

---

## Actions inventory

| Action | Trigger | Result | Persists? |
|--------|---------|--------|-----------|
| | button / shortcut / drag | | yes/no |

---

## Interaction detail

Enumerate non-obvious interactions:

- Selection model  
- Drag / drop  
- Keyboard shortcuts  
- Undo / redo (if applicable)  
- Confirmations (destructive / money)  
- Multi-select  

---

## States

### Loading

What shows while data fetches?

### Empty

Copy + primary CTA when no data.

### Error

Message + retry / support path.

### Success

Confirmation + next action.

### Permission denied

What unauthenticated or unauthorized users see.

---

## Responsive

| Breakpoint | Behavior |
|------------|----------|
| Mobile | |
| Tablet | |
| Desktop | |

---

## Persistence

What survives refresh? What is optimistic vs server-confirmed?

---

## Backend

| Operation | API / action | Migration | RLS |
|-----------|--------------|-----------|-----|
| | | | |

---

## Acceptance criteria

- [ ] …  
- [ ] All DoD items applicable: `docs/product/DEFINITION_OF_DONE.md`

---

## Out of scope (this slice)

Explicitly list what **NOT** to build yet — prevents scope creep.
