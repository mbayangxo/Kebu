# Kebu Galaxy — product UI constitution

Kebu Galaxy is the shared interaction and visual system for signed-in Kebu. It is not a collection of SaaS dashboards.

## Product law

**Kebu.com shows Kebu. Inside Kebu shows you.**

Signed-in surfaces prioritize the user's real worlds, work, people, opportunities, commerce, files and activity. Never use fabricated activity, random stock portraits, fake metrics or placeholder businesses to make an interface look full.

If another major SaaS company could plausibly have designed the interface unchanged, the design is not finished.

## Information architecture

Primary destinations:
1. Home — what is happening with me?
2. Search — what can I find?
3. Universe — the public Kebu-native network.
4. Spaces — where do I belong and work?
5. Library — what do I have?

Creation is an action, **+ Create**, not a destination. Yande is contextual intelligence and should appear where work happens rather than requiring a separate AI destination.

Capabilities such as Studio, Builder, Work, EVA, Commerce, Calendar, People and Opportunity OS may be launched or pinned, but should not turn the global navigation into a list of products.

## Visual system

- Structural surfaces: black and near-black.
- Primary creation energy: Kebu Orange #FF6A00.
- Movement/urgency: Kebu Red #FF1F1F.
- Light canvas: #FFFCF8.
- Supporting neutrals: Sand #EEE8E1 and Stone #A7A7A7.
- Display typography: Kebu Display / current Fraunces fallback until licensed brand font is available.
- UI typography: Satoshi / current sans fallback.
- Prefer asymmetry, crop, editorial scale, strong geometry, circular controls and restrained glow.
- Avoid generic pastel SaaS cards, excessive rounded boxes and decorative gradients with no hierarchy.
- Motion should usually resolve in 120–240ms and communicate state or spatial continuity.
- The Kebu star/glint is functional: intelligence, creation, important change or opportunity.

## Density and hierarchy

Use space efficiently. Kebu should feel spacious because hierarchy is clear, not because content is spread far apart. Important work gets the largest visual area; navigation becomes quieter as the user moves deeper into creation.

Desktop supports dense professional work. Mobile preserves the same information hierarchy instead of shrinking desktop panels.

## State requirements

Every production surface must design and implement loading, empty, error, offline/data-saver, success, permission and destructive states where applicable. Empty states explain the next useful action without pretending data exists.

## Build order

1. Galaxy tokens and shell
2. Home
3. Search
4. Spaces / Worlds model
5. Library
6. Create launcher
7. Builder
8. Studio
9. Rooms / Work
10. Opportunity OS
11. Contextual Yande
12. Remaining capability surfaces

All redesigns must preserve real Supabase data, authorization, offline/low-data behavior and accessibility.
