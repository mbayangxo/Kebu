"use client";

import { useId, useLayoutEffect, useState } from "react";
import { LocaleProvider, useLocale } from "@/app/components/locale-context";

function DraftProbe() {
  const instance = useId();
  const { lang, setLang } = useLocale();
  const [draft, setDraft] = useState("");
  useLayoutEffect(() => {
    document.documentElement.dataset.firstLocaleInstance ??= instance;
  }, [instance]);
  return <main data-testid="locale-state" data-instance={instance}>
    <label>Listing draft<input value={draft} onChange={event => setDraft(event.target.value)} /></label>
    <output aria-label="Current language">{lang}</output>
    <button onClick={() => setLang("wo")}>Use Wolof</button>
    <button onClick={() => setLang("en")}>Use English</button>
  </main>;
}

/** Only installed in the disposable native-browser source sandbox. */
export default function LocaleStateProbe() {
  return <LocaleProvider><DraftProbe /></LocaleProvider>;
}
