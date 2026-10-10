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
  }, []);

  function setLang(lang: string) {
    setLangState(lang);
    localStorage.setItem("alkebulan_lang", lang);
  }

  function setCurrency(currency: string) {
    setCurrencyState(currency);
    localStorage.setItem("alkebulan_currency", currency);
  }

  function setCountry(country: string) {
    setCountryState(country);
    localStorage.setItem("alkebulan_country", country);
    // Auto-set language and currency based on country
    const defaults = COUNTRY_LOCALE[country];
    if (defaults) {
      if (!localStorage.getItem("alkebulan_lang_manual")) {
        setLang(defaults.lang);
      }
      if (!localStorage.getItem("alkebulan_currency_manual")) {
        setCurrency(defaults.currency);
      }
    }
  }

  function t(key: TranslationKey) {
    return translate(lang, key);
  }

  // Always render the Provider. Its value before the effect above equals the context default
  // ("en" / "USD" / no country); switching from a Fragment to the Provider after mount changed the
  // element type and made React rebuild the entire app tree once after hydration.
  return (
    <LocaleContext.Provider value={{ lang, currency, country, setLang, setCurrency, setCountry, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
