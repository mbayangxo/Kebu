# Kebu Galaxy — product UI constitution

Kebu Galaxy is the shared interaction and visual system for signed-in Kebu. It is not a collection of SaaS dashboards.

## Product law

**TheKebu.com shows Kebu. Inside Kebu shows you.**

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

## Default appearance: LIGHT

Kebu is not a dark product. The default signed-in experience uses Kebu White (#FFFCF8) and white as the canvas, black for structure and primary type, Sand (#EEE8E1) for warm secondary surfaces, and Stone (#A7A7A7) for support. Black is selective: typography, dividers, media/editor chrome, focused work modes, and high-contrast moments. Dark workspaces are reserved for tasks that benefit from immersion or a user-selected dark appearance.

## Visual system

- Structural color: black, used selectively rather than as the page canvas.
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

## Architecture layers

Global: Home, Search, Universe, Spaces, Library. + Create is a universal action; Ask Yande is contextual intelligence.

Space: a Personal, business, artist, school, campaign, client, or organization context may expose only the capabilities it actually uses (Overview, Projects, Rooms, People, Sites, Commerce, Analytics, Calendar, Settings). Do not show empty product categories just because Kebu supports them.

Capability: Builder, Studio, Work, Commerce, EVA, Calendar, People, Opportunity OS, messaging and developer tools open from context, Create, Search, Library, or a Space; they are not all permanent global-sidebar destinations.

Object: Space, Project, Room, Site, Store, Product, Design, Video, Document, Sheet, Presentation, Form, Event, Opportunity, Person, Business, Message, Task, File, Link, Decision. Objects can appear across capabilities without duplication.

## Icon architecture

Kebu uses one coherent custom icon language; emoji are not production navigation icons. Global icons are simple outline symbols: Home (portal/house), Search (lens), Universe (orbit/globe), Spaces (spatial cluster), Library (archive/container). System actions include Create (plus/Kebu creation shape), Yande (four-point star/glint), notifications, account, more and arrows. Capability marks for Builder, Studio, Commerce, Opportunity OS, EVA and Work may be more distinctive.

Icons are designed on a 24x24 grid and support 16/20/24/32px. Use roughly 1.75–2px optical stroke at 24px. Prefer crisp Kebu cuts, opposing curves, star apertures and geometric negative space. Navigation is primarily monochrome; orange/red signals active, creation, urgency or intelligence. Every icon must be accessible. Never mix emoji, random icon libraries and custom marks in one navigation family. Canonical icons live in one registry/component.

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
