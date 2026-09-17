# Kebu Builder — Product Quality & UX Standard

We are building Kebu Builder as a professional production-grade website builder.

The goal is NOT simply to make the requested features function.

The goal is to create an interface that feels intentional, calm, polished, predictable, responsive, and easy to use.

Use Shopify as a reference for interaction quality and usability, but do not copy Shopify's branding or design. Kebu must have its own visual identity.

## Core Principle

The user should never have to fight the interface.

Every interaction must have an intentional state, predictable behavior, and an obvious way to recover.

Do not wait for the user/developer to identify obvious usability problems. Proactively identify them.

---

## 1. Think Like a First-Time User

Before implementing or modifying a feature, mentally walk through the complete experience as someone who has never used Kebu Builder.

Ask:

- What do I expect to happen?
- What actually happens?
- Is the result obvious?
- Can I undo it?
- Can I close what I opened?
- Can I get back to where I was?
- Can anything block something important?
- Does anything unexpectedly move?
- Is anything unnecessarily large?
- Does anything feel visually crowded?
- Does anything look unfinished?
- What happens if I make a mistake?
- What happens if the network is slow?
- What happens if saving fails?
- What happens if I refresh?
- What happens if I navigate away?
- What happens on mobile?

If an interaction would feel confusing, annoying, or broken to a normal user, treat it as a bug even if the code technically works.

---

## 2. Never Create "Technically Working" UX

A feature is NOT complete merely because:

- the button works
- the database updates
- the component renders
- the API returns successfully

A feature is complete only when the entire user experience works coherently.

Every interactive feature needs:

- default state
- hover state where appropriate
- active state
- selected state where appropriate
- loading state
- success state
- error state
- empty state where applicable
- disabled state where applicable
- recovery behavior
- keyboard behavior where applicable
- mobile behavior

---

## 3. Panels, Drawers, Modals and Menus

Every panel must have an explicit state model.

At minimum:

```
CLOSED
OPENING
OPEN
CLOSING
```

Define exactly what causes each transition.

A panel must never become effectively impossible to close.

Unless there is a deliberate product reason otherwise, support appropriate dismissal mechanisms such as:

- close button
- outside click
- Escape key
- selecting another mutually exclusive panel

Do not allow clicks intended for the canvas or another control to accidentally reopen a panel.

Do not allow invisible overlays to intercept clicks.

Do not allow one interaction to trigger unrelated UI.

---

## 4. Layering

Never solve UI layering problems by arbitrarily increasing z-index values.

Establish a deliberate layering hierarchy.

Document which UI elements are allowed to appear above:

- canvas
- editor controls
- navigation
- dropdowns
- drawers
- modals
- system notifications

Nothing should obscure a primary navigation or essential control unless intentionally designed.

---

## 5. Visual Density

Kebu Builder should feel professional and compact.

Do not make every control large simply because large controls are easy to implement.

Avoid:

- excessive padding
- oversized buttons
- oversized sidebars
- unnecessary borders
- excessive empty space
- giant headings inside utility panels
- repetitive cards
- excessive rounded containers
- visually competing controls

The canvas and user's website should remain the visual focus.

Utility UI should support the work rather than dominate it.

---

## 6. Templates

A website template is not merely a collection of empty rectangles.

Every template should communicate what the finished website can look like.

Templates should contain appropriate realistic visual content, including images/assets where appropriate.

For example:

**Restaurant:**

- food imagery
- hero imagery
- menu imagery
- location
- hours
- calls to action

**Fashion:**

- editorial imagery
- products
- collections
- campaign sections

**Portfolio:**

- actual representative imagery
- gallery layouts
- project presentation

Do not create visually empty templates unless the absence of content is intentional.

Use appropriate image placeholders/assets when licensed or locally available. Do not fabricate copyrighted assets.

---

## 7. Save and Persistence

A website builder must have a clear persistence model.

Users must always understand whether their changes are:

- saved
- saving
- unsaved
- failed to save

Never silently lose user work.

Implement appropriate save/autosave behavior and recovery.

If the user attempts to leave with unsaved changes, handle that intentionally.

Saving must be connected to the actual Supabase persistence layer.

Do not use fake local state as a substitute for persistence.

---

## 8. Separation of Concerns

Do not build the application as giant components.

Separate:

- presentation
- UI state
- business logic
- data access
- database operations
- reusable components

Do not duplicate logic that already exists.

Before creating a new component, hook, utility, service, or database function, inspect the existing codebase and reuse existing systems where appropriate.

Do not create abstractions solely to make the code appear sophisticated.

---

## 9. Performance

Do not load the entire Builder unnecessarily.

Use appropriate:

- route-level code splitting
- lazy loading
- image optimization
- caching
- selective data fetching
- memoization only where useful
- efficient Supabase queries

Do not fetch data the current screen does not need.

Do not render large portions of the Builder when they are not visible or required.

---

## 10. Supabase

All production data must have a clear persistence model.

Review:

- schema
- relationships
- indexes
- Row Level Security
- ownership
- authorization
- query efficiency

Never assume that hiding something in the frontend provides security.

A user must never be able to access or modify another user's resources merely by manipulating client-side requests.

---

## 11. Before Declaring a Feature Complete

Perform these reviews:

**Product review** — Would a normal person understand this?

**UX review** — Can the user complete the task without friction?

**Visual review** — Does it feel polished and coherent?

**QA review** — How can this break?

**Security review** — Can a malicious user abuse it?

**Performance review** — Are we loading/rendering/fetching things unnecessarily?

**Architecture review** — Will this code remain maintainable as Kebu grows?

Only after all reviews pass should the feature be considered complete.

---

## Most Important Rule

Do not wait for the founder to discover obvious problems.

The founder is the product founder, not the person responsible for manually discovering every basic interaction failure.

The responsibility is to proactively identify problems that a competent product engineer, designer, and QA engineer would reasonably catch.

If something technically works but would feel confusing, clunky, obstructive, unfinished, or unprofessional to a real user, identify it and fix the underlying problem.

Build Kebu as a product people can trust, not merely as a collection of functioning components.
