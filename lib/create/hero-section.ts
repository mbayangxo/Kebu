/**
 * Standard Hero section (`hero`) — shared rules for the schema, Builder and renderer.
 *
 * Height (`props.minHeight`):
 *
 * - "auto": the Hero is as tall as its content. Default for Hero sections added in the Builder.
 * - "50vh" … "100vh": an explicit share of the viewport; "100vh" is the full-screen option.
 * - absent: a Hero saved before the height setting was stored. It keeps the 80vh it has always
 *   rendered at, so existing sites and template instances do not change.
 */

export const HERO_HEIGHTS = ["auto", "50vh", "70vh", "80vh", "100vh"] as const;
export type HeroHeight = (typeof HERO_HEIGHTS)[number];

/** Height of a Hero with no stored minHeight (legacy sections and templates). */
export const LEGACY_HERO_HEIGHT: HeroHeight = "80vh";

/** Height given to a newly added Hero: fits its content; tall and full-screen are opt-in. */
export const NEW_HERO_HEIGHT: HeroHeight = "auto";

export const HERO_HEIGHT_OPTIONS: ReadonlyArray<{ value: HeroHeight; label: string }> = [
  { value: "auto", label: "Fit content" },
  { value: "50vh", label: "Half screen" },
  { value: "70vh", label: "Tall" },
  { value: "80vh", label: "Hero (80vh)" },
  { value: "100vh", label: "Full screen" },
];

export function isHeroHeight(value: unknown): value is HeroHeight {
  return typeof value === "string" && (HERO_HEIGHTS as readonly string[]).includes(value);
}

/** The height a Hero renders at: its stored choice, or the legacy height when none is stored. */
export function resolveHeroHeight(value: unknown): HeroHeight {
  return isHeroHeight(value) ? value : LEGACY_HERO_HEIGHT;
}

/** CSS min-height for a resolved height; undefined lets the Hero size to its content. */
export function heroMinHeightCss(height: HeroHeight): string | undefined {
  return height === "auto" ? undefined : height;
}

/**
 * Vertical padding of the Hero's content block.
 * - Explicit heights (and legacy Heroes): content anchored to the bottom of a tall block — a large
 *   top offset and a smaller bottom margin (unchanged behavior).
 * - Auto: a content-sized band with balanced padding, stepped by device (Kebu breakpoints:
 *   Phone < 640px ≤ Tablet < 1024px ≤ Desktop): 64px / 80px / 96px above and below.
 */
export function heroContentPaddingClass(height: HeroHeight): string {
  return height === "auto" ? "py-16 sm:py-20 lg:py-24" : "pb-16 pt-32";
}

/**
 * Props for a copy of an existing Hero. A legacy Hero (no stored height) is copied with its
 * rendered height written explicitly, so the copy is not given the new-Hero default.
 */
export function heroPropsForCopy(props: Record<string, unknown>): Record<string, unknown> {
  return { ...props, minHeight: resolveHeroHeight(props.minHeight) };
}

/** Color-picker value for a Hero: its own background, else the theme primary it renders with. */
export function heroBackgroundSwatch(background: unknown, themePrimary: string | undefined): string {
  const toHex6 = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
    const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(v);
    return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
  };
  return toHex6(background) ?? toHex6(themePrimary) ?? "#0A0A0A";
}

/**
 * Aesthetic Editor "Hero background photo" → standard Hero props.
 * The Hero renders a photo from `image` and a color from `background`.
 */
export function heroBackgroundPatch(value: string): Record<string, unknown> {
  return value.startsWith("#") ? { background: value } : { image: value };
}

/**
 * A template's `{ label, href }` call-to-action → canonical label/href keys. A canonical value
 * already on `out` always wins; `out` is a copy the caller owns.
 */
export function applyLegacyCta(out: Record<string, unknown>, cta: unknown, labelKey: string, hrefKey: string): void {
  if (!cta || typeof cta !== "object" || Array.isArray(cta)) return;
  const { label, href } = cta as { label?: unknown; href?: unknown };
  if (out[labelKey] === undefined && typeof label === "string") out[labelKey] = label;
  if (out[hrefKey] === undefined && typeof href === "string") out[hrefKey] = href;
}

/**
 * Legacy Hero field names used by 39 design-world templates (lib/create/design-worlds), mapped
 * onto the canonical model at the schema boundary and in the renderer:
 *   backgroundImageUrl: string        → image
 *   overlay: number (0–0.75 in repo)  → overlayOpacity
 *   primaryCta: { label, href }       → buttonLabel / buttonHref
 *   secondaryCta: { label, href }     → secondaryButtonLabel / secondaryButtonHref
 * A canonical value always wins (a Builder edit is never overwritten by a template's legacy
 * value). The input is not mutated.
 */
export function normalizeLegacyHeroProps(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const props = input as Record<string, unknown>;
  const out: Record<string, unknown> = { ...props };
  if (out.image === undefined && typeof props.backgroundImageUrl === "string") out.image = props.backgroundImageUrl;
  if (out.overlayOpacity === undefined && typeof props.overlay === "number") out.overlayOpacity = props.overlay;
  applyLegacyCta(out, props.primaryCta, "buttonLabel", "buttonHref");
  applyLegacyCta(out, props.secondaryCta, "secondaryButtonLabel", "secondaryButtonHref");
  return out;
}
