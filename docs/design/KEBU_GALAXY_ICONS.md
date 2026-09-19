# Kebu Galaxy — icon system

Kebu uses one canonical icon family. This is the implementation contract; the Galaxy Constitution defines the product architecture.

## Canonical registry

| Key | Meaning | Family |
| --- | --- | --- |
| home | Home | global |
| search | Search | global |
| universe | Universe | global |
| spaces | Spaces | global |
| library | Library | global |
| create | Create | action |
| yande | Yande | intelligence |
| notification | Notifications | system |
| more | More | system |
| builder | Builder | capability |
| studio | Studio | capability |
| commerce | Commerce | capability |
| opportunity | Opportunity OS | capability |
| eva | EVA | capability |
| work | Work | capability |
| calendar | Calendar | capability |
| people | People | capability |
| message | Messages | object/system |
| task | Task | object/system |
| file | File | object |
| link | Link | object |
| decision | Decision | object |

## Geometry

Canonical artboard is 24×24. Maintain optical centering. Family signatures can include four-point star apertures, diagonal K-like cuts, opposing concave/convex curves, split circular geometry and interlocking modular blocks. Do not turn every icon into the K logo.

## States

Default is black/near-black on the light canvas. Hover uses a subtle Sand surface. Active uses orange or orange-to-red plus a non-color cue. Disabled uses Stone. Red is reserved for destructive/urgent semantics. Immersive dark editor modes invert structural monochrome while preserving semantic accents.

## Engineering

Expose canonical icons from one registry, e.g. KebuIcon name=spaces size=20. Product code must not paste ad-hoc SVGs for canonical concepts. Icons inherit currentColor unless they are approved multicolor capability marks, accept size/className, are aria-hidden beside visible labels, and receive accessible labels when used alone as controls. No network assets.

## Migration

Replace existing emoji and inconsistent navigation glyphs as each Galaxy surface is rebuilt. Do not rewrite unrelated stable surfaces solely to change an icon.
