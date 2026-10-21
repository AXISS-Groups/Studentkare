import React from 'react';
import { BrandLogo, Icon } from '@/design-system/icons';
import { CrisisLinks } from '@/design-system';
import { LANGUAGE_NAMES, useLanguage, useT } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import './sign-in-frame.css';

/** The board's short labels (EN · తె · हि); the full name is the accessible label. Never translated. */
const LANGS: readonly { code: Lang; short: string }[] = [
  { code: 'en', short: 'EN' },
  { code: 'te', short: 'తె' },
  { code: 'hi', short: 'हि' },
];

/**
 * EN / తె / हि (canvas SignIn, WebSignIn): switches the whole app's language
 * through the i18n provider. Each button says its language in that language.
 */
export function LanguageSwitch(): React.ReactElement {
  const t = useT();
  const { lang, setLang } = useLanguage();
  return (
    <div className="sk-signin__langs" role="group" aria-label={t('ident.lang.group')}>
      {LANGS.map(({ code, short }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={LANGUAGE_NAMES[code]}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

/** "Student Kare" with "Kare" in Georgia italic (DESIGN.md §3), beside the shield. */
export function Wordmark({ onNavy = false }: { onNavy?: boolean }): React.ReactElement {
  const t = useT();
  return (
    <span className={`sk-signin__brand${onNavy ? ' sk-signin__brand--navy' : ''}`}>
      <BrandLogo size={30} label="" />
      <span className="sk-signin__wordmark">
        {t('launch.brand.student')}
        <em>{t('launch.brand.kare')}</em>
      </span>
    </span>
  );
}

const BENEFITS: readonly MessageKey[] = ['ident.brand.b1', 'ident.brand.b2', 'ident.brand.b3'];

export interface SignInFrameProps {
  /** Phone board (≤ 430 px and the Expo look) or the web board's two panels. */
  web: boolean;
  /** The phone header's back button (arrow-left). Omitted where there is nowhere to go back to. */
  onBack?: () => void;
  children: React.ReactNode;
  /** Links under the form (create account, lost phone, staff, terms). */
  footer?: React.ReactNode;
}

/**
 * The sign-in frame (Tier 1, approved 2026-10-21; plan tier1-canvas-wp03).
 * Phone: back, the brand mark and the language switch on one row, then the
 * form. Web: the navy brand panel on the left, the form on the right.
 * Crisis help sits under the form on both, signed in or not (DESIGN.md §2.4).
 */
export function SignInFrame({ web, onBack, children, footer }: SignInFrameProps): React.ReactElement {
  const t = useT();
  if (web) {
    return (
      <main className="sk-signin sk-signin--web">
        <aside className="sk-signin__panel">
          <Wordmark onNavy />
          <div className="sk-signin__pitch">
            <h2 className="sk-signin__pitch-title">
              {t('ident.brand.title1')}
              <br />
              {t('ident.brand.title2')}
            </h2>
            <p className="sk-signin__pitch-body">{t('ident.brand.body')}</p>
            <ul className="sk-signin__benefits">
              {BENEFITS.map((key) => (
                <li key={key}>
                  <span className="sk-signin__tick"><Icon name="check" size={16} strokeWidth={2.6} /></span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section className="sk-signin__main" aria-label={t('auth.signin.title')}>
          <div className="sk-signin__top"><LanguageSwitch /></div>
          <div className="sk-signin__column">
            {children}
            {footer}
            <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
          </div>
        </section>
      </main>
    );
  }
  return (
    <main className="sk-signin sk-signin--phone">
      <div className="sk-signin__bar">
        {onBack ? (
          <button type="button" className="sk-signin__back" aria-label={t('ident.signin.back')} onClick={onBack}>
            <Icon name="arrow-left" size={20} />
          </button>
        ) : null}
        <Wordmark />
        <span className="sk-signin__spacer" />
        <LanguageSwitch />
      </div>
      <div className="sk-signin__column">
        {children}
        {footer}
        <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
      </div>
    </main>
  );
}

/**
 * "By continuing you agree to the Student Kare {terms} and {privacy}." with
 * both words as links to the legal pages; the sentence stays one message.
 */
export function TermsLine({ className }: { className?: string }): React.ReactElement {
  const t = useT();
  const parts = t('ident.signin.terms').split(/(\{terms\}|\{privacy\})/);
  return (
    <p className={className ?? 'sk-signin__terms'}>
      {parts.map((part, index) => {
        if (part === '{terms}') return <a key={index} href="/terms">{t('ident.signin.termsLink')}</a>;
        if (part === '{privacy}') return <a key={index} href="/privacy">{t('ident.signin.privacyLink')}</a>;
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
}
