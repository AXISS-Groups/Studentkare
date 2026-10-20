import React from 'react';
import { useT } from '@/i18n';
import { BrandLogo, Icon } from '../icons';
import { PUBLIC_CATEGORIES, PUBLIC_CATEGORY_MORE, PUBLIC_NAV, PUBLIC_ROUTES, type PublicNavId } from './publicSiteNav';
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
}

/**
 * The public site's top: the utility bar, the brand and seven-item nav with
 * sign-in and cart, the shop search and prescription strip, and the category
 * row (design board Landing). Every link is a registered route.
 */
export function PublicSiteHeader({ current }: PublicSiteHeaderProps): React.ReactElement {
  const t = useT();
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
          <a className="sk-psite-brand" href={PUBLIC_ROUTES.home} aria-label={t('landing.site.home')}>
            <BrandLogo size={32} label="" />
            <PublicWordmark />
          </a>

          <nav className="sk-psite-nav" aria-label={t('landing.home.navAria')}>
            {PUBLIC_NAV.map((item) => (
              <a
                key={item.id}
                className="sk-psite-nav__link"
                href={item.href}
                aria-current={item.id === current ? 'page' : undefined}
              >
                {t(item.label)}
              </a>
            ))}
          </nav>

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
