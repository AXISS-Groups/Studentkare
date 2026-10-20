import React from 'react';
import { useT, type MessageKey } from '@/i18n';
import { Icon, Illustration, type SkIconName, type SkIllustrationName } from '../icons';
import { publishedStores, usePublicSettingsLoaded } from './PublicSiteFooter';
import { PUBLIC_ROUTES } from './publicSiteNav';
import type { PublicArtSet } from './PublicTrustBand';
import './public-site.css';

const FEATURES: ReadonlyArray<{ icon: SkIconName; label: MessageKey }> = [
  { icon: 'map-pin-2', label: 'landing.home.app.collection' },
  { icon: 'plus-square', label: 'landing.home.app.card' },
  { icon: 'flask', label: 'landing.home.app.review' },
];

const PHONES: Record<PublicArtSet, SkIllustrationName> = {
  primary: 'illustration-phones-dashboard',
  alternate: 'illustration-phones-consult',
};


export interface PublicAppBandProps {
  art: PublicArtSet;
  /**
   * The phones art shows a report labelled "Reviewed by a clinician". No
   * variant without that label exists, so a page where that reads as a claim
   * (lab tests) leaves the art out.
   */
  phones?: boolean;
}

/**
 * "Get the app" (design board Landing and every public page): three things
 * the account does, the way in, and the phones art.
 *
 * Store badges appear only for a listing the settings registry publishes
 * (`public_site.*_store_url`); none is published today, so the band says the
 * app is not in the stores and offers web sign-in. The canvas's scan code is
 * a sample picture that encodes no listing, so nothing is drawn in its place
 * until a store link exists (DESIGN.md §2, honest states).
 */
export function PublicAppBand({ art, phones = true }: PublicAppBandProps): React.ReactElement {
  const t = useT();
  usePublicSettingsLoaded();
  const stores = publishedStores();

  return (
    <section className="sk-psite sk-psite-app" aria-label={t('landing.site.app.aria')}>
      <div className="sk-psite-app__copy">
        <span className="sk-psite-app__eyebrow">{t('landing.site.app.eyebrow')}</span>
        <h2 className="sk-psite-app__title">{t('landing.site.app.title')}</h2>
        <ul className="sk-psite-app__features">
          {FEATURES.map((f) => (
            <li key={f.icon} className="sk-psite-app__feature">
              <span className="sk-psite-app__feature-icon">
                <Icon name={f.icon} size={17} strokeWidth={1.9} />
              </span>
              {t(f.label)}
            </li>
          ))}
        </ul>

        <div className="sk-psite-app__ways">
          {stores.length > 0 ? (
            stores.map((s) => (
              <a key={s.setting} className="sk-psite-app__store" href={s.href} target="_blank" rel="noopener noreferrer">
                <Icon name={s.icon} size={22} strokeWidth={1.6} />
                <span className="sk-psite-app__store-text">
                  <span className="sk-psite-app__store-top">{t(s.top)}</span>
                  <span className="sk-psite-app__store-name">{t(s.name)}</span>
                </span>
              </a>
            ))
          ) : (
            <>
              <p className="sk-psite-app__note">{t('landing.site.app.notListed')}</p>
              <a className="sk-psite-app__signin" href={PUBLIC_ROUTES.signIn}>
                {t('landing.site.app.signIn')}
                <Icon name="arrow-right" size={16} />
              </a>
            </>
          )}
        </div>
      </div>

      {phones ? (
        <div className="sk-psite-app__art">
          <Illustration name={PHONES[art]} width={300} height={273} />
        </div>
      ) : null}
    </section>
  );
}
