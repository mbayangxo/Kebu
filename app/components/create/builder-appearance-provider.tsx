"use client";

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { BUILDER_APPEARANCE_KEY, BUILDER_APPEARANCE_PALETTES, createBuilderAppearanceStore, INITIAL_BUILDER_APPEARANCE } from "@/lib/create/builder-appearance";

type Store = ReturnType<typeof createBuilderAppearanceStore>;
const AppearanceContext = createContext<Store | null>(null);
const noopSubscribe = () => () => {};
const initialSnapshot = () => INITIAL_BUILDER_APPEARANCE;

export function BuilderAppearanceProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createBuilderAppearanceStore({
    now: () => new Date(),
    read: () => window.localStorage.getItem(BUILDER_APPEARANCE_KEY),
    write: value => window.localStorage.setItem(BUILDER_APPEARANCE_KEY, value),
    schedule: (callback, delay) => { const timer = window.setTimeout(callback, delay); return () => window.clearTimeout(timer); },
    listen: (onStorage, onForeground) => {
      const storage = (event: StorageEvent) => {
        if (event.storageArea === window.localStorage && (event.key === BUILDER_APPEARANCE_KEY || event.key === null)) onStorage(event.newValue);
      };
      const visibility = () => { if (document.visibilityState === "visible") onForeground(); };
      window.addEventListener("storage", storage);
      window.addEventListener("focus", onForeground);
      document.addEventListener("visibilitychange", visibility);
      return () => { window.removeEventListener("storage", storage); window.removeEventListener("focus", onForeground); document.removeEventListener("visibilitychange", visibility); };
    },
  }));
  return <AppearanceContext.Provider value={store}>{children}</AppearanceContext.Provider>;
}

export function useBuilderAppearance() {
  const store = useContext(AppearanceContext);
  const snapshot = useSyncExternalStore(store?.subscribe ?? noopSubscribe, store?.getSnapshot ?? initialSnapshot, store?.getServerSnapshot ?? initialSnapshot);
  return { ...snapshot, palette: BUILDER_APPEARANCE_PALETTES[snapshot.appearance], setPreference: store?.setPreference };
}
