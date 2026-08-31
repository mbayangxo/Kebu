"use client";

import { useState } from "react";
import { useLocale } from "./locale-context";
import { LANGUAGES, CURRENCIES, COUNTRY_LOCALE, Language } from "@/lib/locale";
import { KEBU } from "@/lib/kebu-brand";

const AFRICAN_COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "Senegal", "South Africa", "Rwanda", "Morocco",
  "Côte d'Ivoire", "Ethiopia", "Tanzania", "Uganda", "Cameroon", "Mozambique",
  "Zambia", "Zimbabwe", "Tunisia", "Algeria", "Egypt", "Angola", "Burkina Faso",
  "Congo (DRC)", "Guinea", "Mali", "Sierra Leone", "Togo", "Benin",
  "UK diaspora", "France diaspora", "US diaspora", "Canada diaspora",
];

const HIGH_QUALITY_LANGS = new Set(["en", "fr", "ar", "pt", "sw"]);

/** Country + language + currency — bright, large, easy to tap. */
export function LanguageBar() {
  const { lang, currency, country, setLang, setCurrency, setCountry, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [showCorrectionTip, setShowCorrectionTip] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const countryInfo = country ? COUNTRY_LOCALE[country] : null;
  const currencyKeys = Object.keys(CURRENCIES);

  function handleLangChange(code: string) {
    setLang(code);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("alkebulan_lang_manual", "1");
    }
    setOpen(false);
  }

  function handleCurrencyChange(code: string) {
    setCurrency(code);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("alkebulan_currency_manual", "1");
    }
    setOpen(false);
  }

  function handleCountryChange(c: string) {
    setCountry(c);
    setOpen(false);
  }

  return (
    <div className="relative z-40" style={{ background: KEBU.black, color: KEBU.white }}>
      <div
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange}, ${KEBU.orangeLight})` }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p
          className="text-xs sm:text-sm font-semibold tracking-wide truncate"
          style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-fraunces)" }}
        >
          {t("tagline")}
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial rounded-full px-3.5 py-2.5 sm:py-2"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] whitespace-nowrap" style={{ color: KEBU.orange }}>
              {t("your_country")}
            </span>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              aria-label={t("select_country")}
              className="bg-transparent border-none outline-none cursor-pointer text-sm sm:text-base font-bold min-w-0 max-w-[55vw] sm:max-w-[180px]"
              style={{ color: KEBU.white }}
            >
              <option value="" className="bg-black text-white">
                {t("select_country")}
              </option>
              {AFRICAN_COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-black text-white">
                  {countryInfo && country === c ? `${countryInfo.flag} ${c}` : c}
                </option>
              ))}
            </select>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-base font-bold"
              style={{ background: KEBU.orange, color: KEBU.white }}
              aria-expanded={open}
              aria-haspopup="listbox"
            >
              <span className="text-lg leading-none">{currentLang.flag}</span>
              <span>{currentLang.native}</span>
              <span className="text-xs opacity-80">▾</span>
            </button>

            {open && (
              <div
                className="absolute right-0 top-full mt-2 rounded-2xl shadow-2xl z-50 min-w-[280px] sm:min-w-[320px] p-3"
                style={{ background: KEBU.black, border: `1px solid ${KEBU.border}` }}
                role="listbox"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] px-2 pb-2 mb-2" style={{ color: KEBU.orange, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {t("your_language")}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleLangChange(l.code)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm transition-colors"
                      style={{
                        background: lang === l.code ? "rgba(255,85,0,0.2)" : "transparent",
                        color: lang === l.code ? KEBU.orange : "rgba(255,255,255,0.85)",
                        fontWeight: lang === l.code ? 700 : 500,
                      }}
                    >
                      <span className="text-base">{l.flag}</span>
                      <div>
                        <p className="font-semibold leading-none">{l.native}</p>
                        {l.native !== l.name && (
                          <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {l.name}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-[11px] font-bold uppercase tracking-[0.16em] px-2 pb-2 mb-2 pt-2" style={{ color: KEBU.orange, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  {t("your_currency")}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {currencyKeys.map((code) => {
                    const c = CURRENCIES[code];
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleCurrencyChange(code)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm transition-colors"
                        style={{
                          background: currency === code ? "rgba(255,85,0,0.2)" : "transparent",
                          color: currency === code ? KEBU.orange : "rgba(255,255,255,0.85)",
                          fontWeight: currency === code ? 700 : 500,
                        }}
                      >
                        <span className="font-bold w-8 text-right flex-shrink-0">{c.symbol}</span>
                        <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />}

      {!HIGH_QUALITY_LANGS.has(lang) && (
        <div
          className="py-2.5 px-4 text-xs flex items-center justify-between gap-4 max-w-7xl mx-auto"
          style={{ background: "rgba(255,85,0,0.12)", color: KEBU.orange, borderTop: "1px solid rgba(255,85,0,0.2)" }}
        >
          <span>
            AI translations in {LANGUAGES.find((l: Language) => l.code === lang)?.native ?? lang} are approximate — African languages are complex and we&apos;re still learning.
            {lang === "wo" && " Native Wolof speakers: your corrections help Yande improve."}
          </span>
          <button
            type="button"
            onClick={() => setShowCorrectionTip(!showCorrectionTip)}
            className="font-bold whitespace-nowrap hover:underline flex-shrink-0"
          >
            Help improve →
          </button>
        </div>
      )}

      {showCorrectionTip && !HIGH_QUALITY_LANGS.has(lang) && (
        <div className="px-4 py-4 text-sm max-w-7xl mx-auto" style={{ background: KEBU.black, color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="font-semibold mb-1" style={{ color: KEBU.orange }}>
            How to help Yande learn {LANGUAGES.find((l: Language) => l.code === lang)?.native}
          </p>
          <p>
            When you see a translation that&apos;s wrong or unnatural, tap the AI response and use the &ldquo;Suggest correction&rdquo; button. Your correction gets saved and Yande uses it in future responses.
          </p>
          <button type="button" onClick={() => setShowCorrectionTip(false)} className="mt-2 font-semibold" style={{ color: KEBU.orange }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
