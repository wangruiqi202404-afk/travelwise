"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import zh from "../../locales/zh.json";
import en from "../../locales/en.json";

export type Language = "zh" | "en";
type TranslationValues = Record<string, string | number>;
type Translate = (key: string, values?: TranslationValues) => string;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
}

const dictionaries: Record<Language, Record<string, string>> = { zh, en };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = window.localStorage.getItem("tripwise-language");
      if (saved === "zh" || saved === "en") setLanguageState(saved);
    });
    return () => { active = false; };
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("tripwise-language", nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = dictionaries[language].app_title;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key, values = {}) => {
      const template = dictionaries[language][key] ?? dictionaries.zh[key] ?? key;
      return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => String(values[token] ?? `{{${token}}}`));
    },
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useI18n must be used within LanguageProvider");
  return context;
}
