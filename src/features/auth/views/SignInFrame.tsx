import React from 'react';
import { BrandLogo, Icon } from '@/design-system/icons';
import { CrisisLinks } from '@/design-system';
import { useAmbientMotion } from '@/design-system/m2';
import { LANGUAGE_NAMES, useLanguage, useT } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import { publicHomeUrl } from '@/core/env';
import { AuthHeroSlides, AuthSlideStrip } from './AuthHeroSlides';
import './sign-in-frame.css';
import '@/design-system/design-system.css';

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
export function LanguageSwitch({ onNavy = false }: { onNavy?: boolean }): React.ReactElement {
  const t = useT();
  const { lang, setLang } = useLanguage();
  return (
    <div className={`sk-signin__langs${onNavy ? ' sk-signin__langs--navy' : ''}`} role="group" aria-label={t('ident.lang.group')}>
      {LANGS.map(({ code, short }) => (
        <button
          key={code}
          type="button"
          lang={code}
          // Starts with what it shows ("EN English"), so voice control can say it (live-run audit #10).
          aria-label={`${short} ${LANGUAGE_NAMES[code]}`}
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

/** The logo goes to the public home page (founder, 2026-10-22): the site root, from config. */
export function BrandHomeLink({ onNavy = false }: { onNavy?: boolean }): React.ReactElement {
  const t = useT();
  return (
    <a className="sk-signin__home" href={publicHomeUrl()} data-testid="auth-logo-home">
      <Wordmark onNavy={onNavy} />
      {/* Named by the wordmark it shows (label-in-name), then where it goes. */}
      <span className="sk-visually-hidden">{t('landing.site.home')}</span>
    </a>
  );
}

/** The soft orbs behind the hero. Decoration only: drift stops under reduced motion and when the page is hidden. */
function HeroOrbs(): React.ReactElement {
  return (
    <span className="sk-auth-hero__orbs" aria-hidden="true">
      <span className="sk-auth-hero__orb sk-auth-hero__orb--violet" />
      <span className="sk-auth-hero__orb sk-auth-hero__orb--sky" />
      <span className="sk-auth-hero__orb sk-auth-hero__orb--teal" />
    </span>
  );
}

export type AuthTab = 'signIn' | 'create';

/**
 * "Sign in" / "Create account": the two pages share this frame, and the one in
 * view is the highlighted pill (aria-current). They are links to the two pages.
 */
export function AuthTabs({ current, onPick }: { current: AuthTab; onPick: (tab: AuthTab) => void }): React.ReactElement {
  const t = useT();
  const tabs: readonly { id: AuthTab; href: string; label: MessageKey }[] = [
    { id: 'signIn', href: '/login', label: 'authpc.tabs.signIn' },
    { id: 'create', href: '/signup', label: 'authpc.tabs.create' },
  ];
  return (
    <nav className="sk-auth-tabs" aria-label={t('authpc.tabs.label')}>
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          className="sk-auth-tabs__tab"
          aria-current={tab.id === current ? 'page' : undefined}
          onClick={(event) => {
            event.preventDefault();
            if (tab.id !== current) onPick(tab.id);
          }}
        >
          {t(tab.label)}
        </a>
      ))}
    </nav>
  );
}

export interface SignInFrameProps {
  /** Phone board (≤ 430 px and the Expo look) or the web board's two columns. */
  web: boolean;
  /** The phone header's back button (arrow-left). Omitted where there is nowhere to go back to. */
  onBack?: () => void;
  /** Names the form region for screen readers (sign in or create account). */
  regionLabel?: MessageKey;
  /** The Sign in / Create account tabs above the form; omitted on pages that are neither. */
  tabs?: { current: AuthTab; onPick: (tab: AuthTab) => void };
  children: React.ReactNode;
  /** Links under the form (create account, lost phone, staff, terms). */
  footer?: React.ReactNode;
}

/**
 * The sign-in and create-account frame (Tier 1, approved 2026-10-21; plan
 * tier1-canvas-wp03, amendment 2026-10-22 b), in the Mobile 2.0 visual
 * language. Web: the navy hero on the left with the auto-advancing slides
 * (AuthHeroSlides), the form card on the right. Phone (and narrow web): a
 * compact header with back, the logo, the language switch and the slides as a
 * small swipeable strip; the form rises in on a sheet over it. The emergency
 * strip (112, Tele-MANAS) stays in view at the bottom on every width, signed in
 * or not (DESIGN.md §2.4). The logo links to the public home page.
 */
export function SignInFrame({ web, onBack, regionLabel = 'auth.signin.title', tabs, children, footer }: SignInFrameProps): React.ReactElement {
  const t = useT();
  const ambient = useAmbientMotion();
  const crisis = (
    <div className="sk-auth__crisis">
      <CrisisLinks titleKey="crisis.noAccount" testID="crisis-links" />
    </div>
  );
  const tabRow = tabs ? <AuthTabs current={tabs.current} onPick={tabs.onPick} /> : null;

  if (web) {
    return (
      <main className="sk-signin sk-signin--web" data-ambient={ambient ? 'on' : 'off'}>
        <aside className="sk-auth-hero">
          <HeroOrbs />
          <span className="sk-auth-hero__grid" aria-hidden="true" />
          <div className="sk-auth-hero__bar">
            <BrandHomeLink onNavy />
          </div>
          <div className="sk-auth-hero__pitch">
            <span className="sk-auth-hero__eyebrow">{t('authch.hero.eyebrow')}</span>
            <AuthHeroSlides />
          </div>
          {/* Always in view, whichever slide is showing: help never needs an account. */}
          <p className="sk-auth-hero__promise">
            <span className="sk-auth-hero__promise-tick"><Icon name="check" size={16} strokeWidth={2.6} /></span>
            {t('ident.brand.b3')}
          </p>
        </aside>
        <section className="sk-signin__main" aria-label={t(regionLabel)}>
          <div className="sk-signin__top"><LanguageSwitch /></div>
          <div className="sk-signin__card sk-rise">
            {tabRow}
            <div className="sk-signin__column">
              {children}
              {footer}
            </div>
          </div>
          {crisis}
        </section>
      </main>
    );
  }
  return (
    <main className="sk-signin sk-signin--phone" data-ambient={ambient ? 'on' : 'off'}>
      <header className="sk-auth-hero sk-auth-hero--compact">
        <HeroOrbs />
        <div className="sk-auth-hero__bar">
          {onBack ? (
            <button type="button" className="sk-signin__back" aria-label={t('ident.signin.back')} onClick={onBack}>
              <Icon name="arrow-left" size={20} />
            </button>
          ) : null}
          <BrandHomeLink onNavy />
          <span className="sk-signin__spacer" />
          <LanguageSwitch onNavy />
        </div>
        <AuthSlideStrip />
      </header>
      <section className="sk-signin__sheet sk-rise" aria-label={t(regionLabel)}>
        {tabRow}
        <div className="sk-signin__column">
          {children}
          {footer}
        </div>
      </section>
      {crisis}
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
