import React from 'react';
import { useT } from '@/i18n';
import { publicHomeUrl } from '@/core/env';
import { BrandLogo, Icon } from '../icons';
import {
  PUBLIC_AUDIENCE_NAV,
  PUBLIC_CATEGORIES,
  PUBLIC_CATEGORY_MORE,
  PUBLIC_NAV,
  PUBLIC_ROUTES,
  type PublicAudienceId,
  type PublicLink,
  type PublicNavId,
} from './publicSiteNav';
import './public-site.css';

/** "Student Kare", with "Kare" in the serif italic (DESIGN.md §3, Type). */
export function PublicWordmark(): React.ReactElement {
  const t = useT();
  return (
    <span className="sk-psite-wordmark" aria-hidden="true">
      {t('landing.site.wordmark.student')}
      <em>&nbsp;{t('landing.site.wordmark.kare')}</em>
    </span>
  );
}

export interface PublicSiteHeaderProps {
  /** The nav item for the page being shown; null on a public page outside the nav. */
  current: PublicNavId | null;
  /**
   * `full` (the default) is the Discover board's header: utility bar, nav,
   * shop search, prescription strip and categories. `compact` is the bar the
   * other student pages use: brand, nav and sign-in only.
   */
  variant?: 'full' | 'compact';
}

function BrandLink({ size }: { size: number }): React.ReactElement {
  const t = useT();
  return (
    <a className="sk-psite-brand" href={publicHomeUrl()} aria-label={t('landing.site.home')}>
      <BrandLogo size={size} label="" />
      <PublicWordmark />
    </a>
  );
}

function NavLinks({ items, current, label }: { items: ReadonlyArray<PublicLink & { id: string }>; current: string | null; label: string }): React.ReactElement {
  const t = useT();
  return (
    <nav className="sk-psite-nav" aria-label={label}>
      {items.map((item) => (
        <a key={item.id} className="sk-psite-nav__link" href={item.href} aria-current={item.id === current ? 'page' : undefined}>
          {t(item.label)}
        </a>
      ))}
    </nav>
  );
}

/**
 * The public site's top: the utility bar, the brand and seven-item nav with
 * sign-in and cart, the shop search and prescription strip, and the category
 * row (design board Landing). Every link is a registered route.
 */
export function PublicSiteHeader({ current, variant = 'full' }: PublicSiteHeaderProps): React.ReactElement {
  const t = useT();
  if (variant === 'compact') {
    return (
      <div className="sk-psite">
        <header className="sk-psite-header sk-psite-header--compact">
          <div className="sk-psite-header__top">
            <BrandLink size={30} />
            <NavLinks items={PUBLIC_NAV} current={current} label={t('landing.home.navAria')} />
            <span className="sk-psite-spacer" />
            <a className="sk-psite-textlink" href={PUBLIC_ROUTES.signIn}>
              {t('landing.home.signIn')}
            </a>
          </div>
        </header>
      </div>
    );
  }
  return (
    <div className="sk-psite">
      <div className="sk-psite-utility">
        <Icon name="map-pin" size={14} className="sk-psite-utility__mark" />
        <span className="sk-psite-utility__text">
          {t('landing.home.tagline')} {t('landing.home.ageGate')}
        </span>
        <span className="sk-psite-spacer" />
        <a className="sk-psite-utility__link" href={PUBLIC_ROUTES.plans}>
          {t('landing.site.utilityPlans')}
          <Icon name="arrow-right" size={14} />
        </a>
      </div>

      <header className="sk-psite-header">
        <div className="sk-psite-header__top">
          <BrandLink size={32} />
          <NavLinks items={PUBLIC_NAV} current={current} label={t('landing.home.navAria')} />

          <span className="sk-psite-spacer" />

          <a className="sk-psite-btn" href={PUBLIC_ROUTES.signIn}>
            <Icon name="user-6" size={16} />
            <span className="sk-psite-btn__label">{t('landing.home.signIn')}</span>
          </a>
          <a className="sk-psite-iconbtn" href={PUBLIC_ROUTES.cart} aria-label={t('landing.home.cart')}>
            <Icon name="shopping-bag" size={17} />
          </a>
        </div>

        {/* The shop takes no search query yet, so this opens the shop rather
            than offering a box that silently does nothing. */}
        <div className="sk-psite-header__search">
          <a className="sk-psite-search" href={PUBLIC_ROUTES.shop}>
            <Icon name="search-2" size={18} />
            <span>{t('landing.site.search')}</span>
          </a>
          <a className="sk-psite-rx" href={PUBLIC_ROUTES.prescriptions}>
            <Icon name="cloud-upload" size={22} strokeWidth={1.8} />
            <span className="sk-psite-rx__text">
              <span className="sk-psite-rx__eyebrow">{t('landing.home.rxEyebrow')}</span>
              <span className="sk-psite-rx__cta">
                {t('landing.home.rxCta')}
                <Icon name="arrow-right" size={14} />
              </span>
            </span>
          </a>
        </div>

        <nav className="sk-psite-cats" aria-label={t('landing.site.catAria')}>
          {PUBLIC_CATEGORIES.map((c) => (
            <a key={c.label} className="sk-psite-cats__link" href={c.href}>
              {t(c.label)}
            </a>
          ))}
          <a className="sk-psite-cats__link" href={PUBLIC_CATEGORY_MORE.href}>
            {t(PUBLIC_CATEGORY_MORE.label)}
            <Icon name="arrow-right" size={14} />
          </a>
        </nav>
      </header>
    </div>
  );
}

export interface PublicAudienceHeaderProps {
  /** The audience page being shown. */
  current: PublicAudienceId;
  /** The page's one call to action, drawn as the filled button on the right. */
  cta: PublicLink;
}

/**
 * The header of the partner-facing pages (design boards LandingCampus,
 * LandingClinician, WebPartnerships): brand, the four audience links and one
 * call to action.
 */
export function PublicAudienceHeader({ current, cta }: PublicAudienceHeaderProps): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-psite">
      <header className="sk-psite-header sk-psite-header--compact">
        <div className="sk-psite-header__top">
          <BrandLink size={30} />
          <NavLinks items={PUBLIC_AUDIENCE_NAV} current={current} label={t('landing.site.audienceAria')} />
          <span className="sk-psite-spacer" />
          <a className="sk-psite-cta" href={cta.href}>
            {t(cta.label)}
          </a>
        </div>
      </header>
    </div>
  );
}
