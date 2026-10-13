import { BUILDER } from "./builder-ui";
import { BUILDER_APPEARANCE_PALETTES, type BuilderAppearance } from "./builder-appearance";

/** Opt-in editor panel tokens. Published-site/legacy tokens remain unchanged. */
export const BUILDER_PANEL = {
  ...BUILDER,
  surface: "var(--builder-panel-surface, #FFFFFF)",
  surfaceMuted: "var(--builder-panel-surface-muted, #F6F6F7)",
  ink: "var(--builder-panel-ink, #0A0A0A)",
  muted: "var(--builder-panel-muted, #616161)",
  faint: "var(--builder-panel-faint, #707070)",
  border: "var(--builder-panel-border, #E3E3E3)",
  action: "var(--builder-panel-action, #0A0A0A)",
  onAction: "var(--builder-panel-on-action, #FFFFFF)",
  colorScheme: "var(--builder-panel-color-scheme, light)",
} as const;

export function builderPanelVariables(appearance: BuilderAppearance) {
  const p = BUILDER_APPEARANCE_PALETTES[appearance];
  return {
    "--builder-panel-surface": p.surface,
    "--builder-panel-surface-muted": p.surfaceMuted,
    "--builder-panel-ink": p.ink,
    "--builder-panel-muted": p.muted,
    "--builder-panel-faint": p.faint,
    // Form-control boundaries remain visible against both panel surfaces.
    "--builder-panel-border": appearance === "dark" ? "#6F7786" : "#8A8A8A",
    "--builder-panel-action": p.action,
    "--builder-panel-on-action": p.onAction,
    "--builder-panel-color-scheme": appearance,
  };
}
