# Kebu — Design Quality Standard

**Applies to:** Builder templates · design worlds · AI-generated sites · Studio (when assigned) · any customer-facing UI slice.

**Agent rule:** embedded in `kebu-builder-next-gen.mdc` · `kebu-design-quality.mdc`  
**Process:** `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md` (Design QA loop)

---

## No MVP-looking UI

Do **not** use MVP aesthetics unless the user explicitly requests an MVP.

Early slices must still use **final design language**: spacing system · typography · navigation · component architecture · interaction quality.

> **Implement fewer complete features rather than many superficial features.**

---

## Product density

Do **not** interpret simplicity as removing functionality.

Professional applications need appropriate **information density**, hierarchy, contextual controls, navigation depth, and interaction richness — not oversized cards, giant buttons, or landing-page whitespace because they are easy to implement.

---

## Master rule

> **If the result looks like an AI-generated approximation, it has failed quality review and must be redesigned.**

Never optimize for **surface resemblance** to a competitor.  
Never substitute a **simplified UI** for a **complete workflow**.  
Never generate **generic templates** to satisfy a **template count**.

Every design needs: **purpose · audience · hierarchy · interaction model · visual identity**.

---

## Template visual requirements

Templates must look **intentionally art-directed**, not procedurally generated.

**Do not use** (unless explicitly appropriate to the brand):

- Generic gradients · arbitrary blobs · excessive rounded cards  
- Stock SaaS layouts · random illustrations · excessive shadows  
- Oversized buttons · interchangeable section patterns  
- “Hero + three cards + button” with different hex codes  

Every template must have coherent:

- Visual concept · hierarchy · typography system · imagery strategy  
- Spacing system · merchandising strategy  

**Two templates in the same category** must differ in **composition and art direction** — not merely colors.

---

## Design review (mandatory before “complete”)

For every generated template / design world / AI site draft:

| # | Question |
|---|----------|
| 1 | What **business** is this for? |
| 2 | Who is the **customer**? |
| 3 | What is the **primary conversion**? |
| 4 | What should the customer notice **first**? |
| 5 | Does layout communicate **brand positioning**? |
| 6 | Does the template have a **distinct visual identity**? |
| 7 | Does **every section have a reason to exist**? |
| 8 | Is **hierarchy** strong? |
| 9 | Does it look **premium** at desktop **and** mobile? |
| 10 | Would a real business owner **proudly launch** this? |

**If any answer is no → redesign before complete.**

AI should run this critique **before** presenting to the user (when AI generation slice supports it). Humans run it on flagships and new design worlds.

---

## Visual references (required for high bar)

Don’t say only “make it luxury.” Provide **5–10 references** for:

- Photography level · typography · spacing · product presentation · editorial composition  

Store in `docs/reference/quality/` or `docs/reference/kebu/`.

Instruction to agent:

> Extract **design principles** from these references — **do not copy** them pixel-for-pixel.

---

## One template first

Create **ONE exceptional** template. Pass review. Extract principles. Then next **distinct** archetype.

**Forbidden:** 20 templates in one sprint.

---

## Related

- Template Intelligence: `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md`  
- Reference dossiers: `docs/reference/REFERENCE-DOSSIER-FORMAT.md`  
- Builder: `docs/product/KEBU-BUILDER-NEXT-GEN.md`
