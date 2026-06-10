"use client";

import * as React from "react";
import en from "./en.json";
import ru from "./ru.json";

export type Locale = "en" | "ru";

const translations: Record<Locale, typeof en> = { en, ru };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: typeof en;
}

const I18nContext = React.createContext<I18nContextValue>({
  locale: "ru",
  setLocale: () => {},
  t: ru,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("nextx-locale") as Locale) || "ru";
    }
    return "ru";
  });

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("nextx-locale", l);
  }, []);

  const value = React.useMemo(
    () => ({ locale, setLocale, t: translations[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return React.useContext(I18nContext);
}
