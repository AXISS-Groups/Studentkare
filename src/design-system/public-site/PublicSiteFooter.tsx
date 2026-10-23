import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { getSetting, loadPublicConfig } from '@/data/services/config';
import { EMERGENCY_NUMBER, TELE_MANAS_PRIMARY } from '@/ai/core/crisisGate';
import { BrandLogo, Icon } from '../icons';
import { PublicWordmark } from './PublicSiteHeader';
import { ART_CREDIT, FOOTER_COLUMNS, FOOTER_SOCIAL, FOOTER_STORES, PUBLIC_ROUTES, publishedUrl } from './publicSiteNav';
import './public-site.css';

export interface PublicSiteFooterProps {
  /** Drawn above the columns, joined to the footer (the canvas puts the newsletter band here). */
  band?: React.ReactNode;
  /** A short honest note under the tagline (e.g. that the product is still being built). */
  note?: string;
}

/** Re-render once the public settings arrive, so configured links appear. */
export function usePublicSettingsLoaded(): void {
  const [, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    void loadPublicConfig().then(() => {
      if (live) setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);
}

/**
 * The public site's footer (design board Landing): brand column, four link
 * columns, the app column and the bottom bar with the crisis line.
 *
 * Store badges and social icons appear only for listings the settings
 * registry publishes (`public_site.*`); none is published today, so none is
 * shown. The canvas's "ABDM · ABHA-linked" and "NMC-verified doctors · NABL
 * labs" chips are not drawn: nothing computes either state (AGENTS.md
 * guardrail 6).
 */
/** The store listings the settings registry publishes (none today). */
export function publishedStores(): Array<(typeof FOOTER_STORES)[number] & { href: string }> {
  return FOOTER_STORES.flatMap((s) => {
    const href = publishedUrl(getSetting(s.setting));
    return href ? [{ ...s, href }] : [];
  });
}

export function PublicSiteFooter({ band, note }: PublicSiteFooterProps): React.ReactElement {
  const t = useT();
  usePublicSettingsLoaded();

  const social = FOOTER_SOCIAL.flatMap((s) => {
    const href = publishedUrl(getSetting(s.setting));
    return href ? [{ ...s, href }] : [];
  });
  const stores = publishedStores();

  return (
    <footer className="sk-psite sk-psite-footer">
      {band}
      <div className="sk-psite-footer__grid">
        <div className="sk-psite-footer__brandcol">
          <a className="sk-psite-brand" href={PUBLIC_ROUTES.home} aria-label={t('landing.site.home')}>
            <BrandLogo size={35} label="" />
            <PublicWordmark />
          </a>
          <p className="sk-psite-footer__tagline">{t('landing.home.footerTagline')}</p>
          {note ? <p className="sk-psite-footer__note">{note}</p> : null}
          <span className="sk-psite-footer__place">
            <Icon name="pin" size={16} strokeWidth={1.8} className="sk-psite-footer__place-icon" />
            {t('landing.site.footer.location')}
          </span>
          {social.length > 0 ? (
            <ul className="sk-psite-footer__social" aria-label={t('landing.site.footer.socialAria')}>
              {social.map((s) => (
                <li key={s.setting}>
                  <a className="sk-psite-footer__social-link" href={s.href} target="_blank" rel="noopener noreferrer" aria-label={t(s.label)}>
                    <Icon name={s.icon} size={18} strokeWidth={1.8} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.heading} className="sk-psite-footer__col" aria-label={t(col.aria)}>
            <span className="sk-psite-footer__heading" aria-hidden="true">{t(col.heading)}</span>
            {col.links.map((link) => (
              <a key={link.label} className="sk-psite-footer__link" href={link.href}>
                {t(link.label)}
              </a>
            ))}
          </nav>
        ))}

        {stores.length > 0 ? (
          <div className="sk-psite-footer__col">
            <span className="sk-psite-footer__heading">{t('landing.site.footer.col.app')}</span>
            {stores.map((s) => (
              <a key={s.setting} className="sk-psite-footer__store" href={s.href} target="_blank" rel="noopener noreferrer">
                <Icon name={s.icon} size={22} strokeWidth={1.6} />
                <span className="sk-psite-footer__store-text">
                  <span className="sk-psite-footer__store-top">{t(s.top)}</span>
                  <span className="sk-psite-footer__store-name">{t(s.name)}</span>
                </span>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sk-psite-footer__bottom">
        <span className="sk-psite-footer__copyright">
          {t('landing.site.footer.copyright', { year: String(new Date().getFullYear()) })}
        </span>
        <a className="sk-psite-footer__credit" href={ART_CREDIT.href} target="_blank" rel="noopener noreferrer">
          {t(ART_CREDIT.label)}
        </a>
        <span className="sk-psite-spacer" />
        <a className="sk-psite-footer__crisis" href={PUBLIC_ROUTES.crisis}>
          {t('landing.site.footer.crisisLead')} <strong>{EMERGENCY_NUMBER}</strong> · {t('landing.site.footer.teleManas')}{' '}
          <strong>{TELE_MANAS_PRIMARY}</strong>
        </a>
      </div>
    </footer>
  );
}
