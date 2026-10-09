import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CrossPlatformStorage } from '@/core/storage/CrossPlatformStorage';
import { en } from './en';
import type { Catalog, MessageKey } from './en';
import { te } from './te';
import { hi } from './hi';

export type Lang = 'en' | 'te' | 'hi';
export type { MessageKey } from './en';

const CATALOGS: Record<Lang, Catalog> = { en, te, hi };

/** Each language's name in that language — never translated (DESIGN.md §3). */
export const LANGUAGE_NAMES: Record<Lang, string> = { en: 'English', te: 'తెలుగు', hi: 'हिंदी' };

/**
 * Translation status. Telugu and Hindi are a first draft: they need a native
 * speaker's review, and a clinician's for crisis, consent and clinical
 * wording, before release. Flip to 'reviewed' only with that sign-off.
 */
export const REVIEW_STATUS: Record<Lang, 'source' | 'unreviewed' | 'reviewed'> = { en: 'source', te: 'unreviewed', hi: 'unreviewed' };

const STORAGE_KEY = 'studentkare_language_v1';

export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const template = CATALOGS[lang][key] ?? en[key];
  return vars ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : template;
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => undefined,
  t: (key, vars) => translate('en', key, vars),
});

const isLang = (value: unknown): value is Lang => value === 'en' || value === 'te' || value === 'hi';

/** Language for web and native. The choice is a per-device convenience, not account data. */
export function LanguageProvider({ children, initial = 'en' }: { children: React.ReactNode; initial?: Lang }): React.ReactElement {
  const [lang, setLangState] = useState<Lang>(initial);

  useEffect(() => {
    let live = true;
    void CrossPlatformStorage.get<string>(STORAGE_KEY, '').then((saved) => { if (live && isLang(saved)) setLangState(saved); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    void CrossPlatformStorage.set(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** `t(key, vars)` in the current language. Outside a provider it is English. */
export function useT(): I18nContextValue['t'] {
  return useContext(I18nContext).t;
}

export function useLanguage(): Pick<I18nContextValue, 'lang' | 'setLang'> {
  const { lang, setLang } = useContext(I18nContext);
  return { lang, setLang };
}
