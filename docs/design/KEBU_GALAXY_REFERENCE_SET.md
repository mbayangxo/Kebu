# Kebu Galaxy — reference set

This document is the visual handoff contract for Kebu Galaxy. The approved reference boards are product evidence, not loose inspiration. When the image files are checked into this directory, implementations must use this index together with `KEBU_GALAXY_CONSTITUTION.md`.

## Locked product principle

**TheKebu.com shows Kebu. Inside Kebu shows you.**

The public site presents Kebu. Signed-in Kebu reflects the actual user: their work, objects, people, businesses, opportunities, activity and permissions. Never manufacture operational data to make a reference composition look full.

## Reference index

| ID | Reference | Governs |
| --- | --- | --- |
| G01 | Brand DNA | Kebu mark, black/orange/red/cream language, editorial typography, contemporary African image direction, graphic rhythm |
| G02 | Ecosystem / icon board | Capability identity, icon character, family resemblance and Kebu-native geometry |
| G03 | Galaxy Home | Home hierarchy, density, asymmetric composition, Needs You, Continue, active work and account-level information |
| G04 | Builder | Professional editor composition: tools/structure, live site canvas, contextual inspector, direct manipulation |
| G05 | Rooms / shared work | Project wall, tasks, conversation, people, decisions and collaborative spatial hierarchy |
| G06 | Early light application concepts | Light-surface behavior, information density and useful legacy patterns to preserve where stronger than later concepts |
| G07 | Mobile adaptations | Same product hierarchy on small screens without merely shrinking desktop panels |
| G08 | Kebu mark / sculptural logo | Brand geometry and dimensional character; not permission to place a logo motif on every control |

## Interpretation rules

1. Galaxy is **light-first**. Dark reference boards govern composition, hierarchy and immersive-work behavior; they do not make black the default application canvas.
2. Preserve the reference's design intent. Do not replace an approved composition with a familiar generic SaaS pattern merely because it is easier to implement.
3. Adapt a reference when real data, accessibility, responsiveness, permissions, offline behavior or technical correctness requires it. Material adaptations should be documented in the implementation report.
4. References never authorize fake content. A visually rich reference with sample tasks, people or metrics must become real data or a deliberate empty/loading/error state.
5. Do not reproduce stock/reference people inside a signed-in account. User imagery must come from the user's data or a legitimate product content source.
6. Avoid card soup: hierarchy, dividers, typography, cropping, lists, tables and spatial grouping should do more work than nested rounded rectangles.
7. Space efficiently. “Spacious” means clear hierarchy and breathing room, not large unused gaps.
8. Major capability environments may have distinct spatial behavior while remaining recognizably Kebu.
9. Desktop and mobile share the mental model, not necessarily the same panel arrangement.
10. A design is unfinished if another major SaaS product could adopt it unchanged without anyone noticing it was made for Kebu.

## Visual review protocol

For every reconstructed surface, compare implementation against the governing reference at desktop and mobile widths. Review information hierarchy, density, typography, alignment, negative space, iconography, interaction priority, state behavior and responsive transformation. Visual fidelity is not only pixel similarity: the product must preserve the reference's hierarchy while working with real user data.

A surface does not pass visual review if it is technically functional but visibly falls back to generic dashboard patterns, inconsistent iconography, oversized empty cards, arbitrary gradients, fake content or cramped mobile panels.

## Repository assets

Approved board image files should live beside this document under:

`docs/design/references/galaxy/`

Recommended filenames:

- `G01-brand-dna.png`
- `G02-ecosystem-icons.png`
- `G03-galaxy-home.png`
- `G04-builder.png`
- `G05-rooms-work.png`
- `G06-light-concepts.png`
- `G07-mobile.png`
- `G08-kebu-mark.png`

Do not invent replacement images when an approved reference is missing. Mark the asset as unavailable and use the written constitution until the actual approved board is supplied.
