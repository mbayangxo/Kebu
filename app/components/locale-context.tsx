"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { detectLanguageFromBrowser, COUNTRY_LOCALE, t as translate, TranslationKey } from "@/lib/locale";

interface LocaleState {
  lang: string;
  currency: string;
  country: string;
  setLang: (lang: string) => void;
  setCurrency: (currency: string) => void;
  setCountry: (country: string) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleState>({
  lang: "en",
  currency: "USD",
  country: "",
  setLang: () => {},
  setCurrency: () => {},
  setCountry: () => {},
  t: (key) => translate("en", key),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState("en");
  const [currency, setCurrencyState] = useState("USD");
  const [country, setCountryState] = useState("");

  useEffect(() => {
    // Reading localStorage can throw (private browsing, blocked storage) — never
    // let that take down the subtree below the provider.
    try {
      const savedLang = localStorage.getItem("alkebulan_lang");
      const savedCurrency = localStorage.getItem("alkebulan_currency");
      const savedCountry = localStorage.getItem("alkebulan_country");

      if (savedLang) {
        setLangState(savedLang);
      } else {
        const detected = detectLanguageFromBrowser();
        setLangState(detected);
      }
      if (savedCurrency) setCurrencyState(savedCurrency);
      if (savedCountry) setCountryState(savedCountry);
    } catch {
      // Storage blocked — keep the English/USD defaults already in state.
    }
  }, []);

  function setLang(lang: string) {
    setLangState(lang);
    try { localStorage.setItem("alkebulan_lang", lang); } catch { /* storage blocked — in-memory selection still applies this session */ }
  }

  function setCurrency(currency: string) {
    setCurrencyState(currency);
    try { localStorage.setItem("alkebulan_currency", currency); } catch { /* storage blocked */ }
  }

  function setCountry(country: string) {
    setCountryState(country);
    try { localStorage.setItem("alkebulan_country", country); } catch { /* storage blocked */ }
    // Auto-set language and currency based on country
    const defaults = COUNTRY_LOCALE[country];
    if (defaults) {
      let langIsManual = false;
      let currencyIsManual = false;
      try {
        langIsManual = Boolean(localStorage.getItem("alkebulan_lang_manual"));
        currencyIsManual = Boolean(localStorage.getItem("alkebulan_currency_manual"));
      } catch { /* storage blocked — treat as not manually overridden */ }
      if (!langIsManual) setLang(defaults.lang);
      if (!currencyIsManual) setCurrency(defaults.currency);
    }
  }

  function t(key: TranslationKey) {
    return translate(lang, key);
  }

  // Always render the same Provider element — never swap it for a Fragment
  // based on an async-ready flag, which would remount (and discard the state
  // of) everything below it the instant the stored preference loads.
  return (
    <LocaleContext.Provider value={{ lang, currency, country, setLang, setCurrency, setCountry, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
