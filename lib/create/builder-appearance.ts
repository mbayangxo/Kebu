/** Device-local editor chrome preference; it never changes a site's theme. */
export type BuilderAppearancePreference = "auto" | "light" | "dark";
export type BuilderAppearance = "light" | "dark";
export const BUILDER_APPEARANCE_KEY = "kebu.builder.appearance.v1";

export function appearancePreference(value: unknown): BuilderAppearancePreference {
  return value === "light" || value === "dark" ? value : "auto";
}

/** Auto is dark from 20:00 through 06:59 in the device's local time. */
export function resolveBuilderAppearance(preference: BuilderAppearancePreference, now: Date): BuilderAppearance {
  if (preference !== "auto") return preference;
  const hour = now.getHours();
  return hour >= 20 || hour < 7 ? "dark" : "light";
}

export const BUILDER_APPEARANCE_PALETTES = {
  light: { surface: "#FFFFFF", surfaceMuted: "#F6F6F7", ink: "#0A0A0A", muted: "#616161", faint: "#707070", border: "#E3E3E3", action: "#0A0A0A", onAction: "#FFFFFF", liveSurface: "#ECFDF3", liveInk: "#166534", liveBorder: "#BBF7D0", saved: "#166534", pending: "#92400E", error: "#B91C1C" },
  dark: { surface: "#1C1E22", surfaceMuted: "#272A30", ink: "#F5F5F7", muted: "#BEC2CB", faint: "#A7ACB7", border: "#454A55", action: "#F5F5F7", onAction: "#17191D", liveSurface: "#163625", liveInk: "#A4E6BC", liveBorder: "#34654A", saved: "#74D99F", pending: "#F5BC60", error: "#FF9B9B" },
} as const;

type AppearanceSnapshot = { preference: BuilderAppearancePreference; appearance: BuilderAppearance; persistenceUnavailable: boolean };
type Environment = {
  now: () => Date;
  read: () => string | null;
  write: (value: string) => void;
  schedule: (callback: () => void, delay: number) => () => void;
  listen: (onStorage: (value: string | null) => void, onForeground: () => void) => () => void;
};

export const INITIAL_BUILDER_APPEARANCE: AppearanceSnapshot = { preference: "auto", appearance: "light", persistenceUnavailable: false };

/** One timer/listener pair per mounted editor, with a stable SSR snapshot. */
export function createBuilderAppearanceStore(environment: Environment) {
  let snapshot = INITIAL_BUILDER_APPEARANCE;
  const listeners = new Set<() => void>();
  let stopTimer: (() => void) | undefined;
  let stopListening: (() => void) | undefined;
  function emit(preference: BuilderAppearancePreference, persistenceUnavailable = snapshot.persistenceUnavailable) {
    const appearance = resolveBuilderAppearance(preference, environment.now());
    if (preference === snapshot.preference && appearance === snapshot.appearance && persistenceUnavailable === snapshot.persistenceUnavailable) return;
    snapshot = { preference, appearance, persistenceUnavailable };
    listeners.forEach(listener => listener());
  }
  function refresh() {
    emit(snapshot.preference);
    stopTimer?.();
    // A bounded clock recheck also handles timezone/clock changes and sleeping tabs.
    stopTimer = environment.schedule(refresh, 60_000);
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => INITIAL_BUILDER_APPEARANCE,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        try { emit(appearancePreference(environment.read()), false); }
        catch { emit("auto", true); }
        stopListening = environment.listen(value => emit(appearancePreference(value), false), refresh);
        refresh();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { stopTimer?.(); stopListening?.(); stopTimer = undefined; stopListening = undefined; }
      };
    },
    setPreference(value: unknown) {
      const preference = appearancePreference(value);
      let persistenceUnavailable = false;
      try { environment.write(preference); } catch { persistenceUnavailable = true; }
      emit(preference, persistenceUnavailable);
    },
  };
}
