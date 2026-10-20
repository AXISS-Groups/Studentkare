import React from 'react';
import { NewsletterBand } from './NewsletterBand';
import { PublicAppBand } from './PublicAppBand';
import { PublicSiteFooter } from './PublicSiteFooter';
import { PublicTrustBand, type PublicArtSet } from './PublicTrustBand';
import './public-site.css';

export interface PublicSitePageProps {
  /** `<PublicSiteHeader …/>` or `<PublicAudienceHeader …/>`. */
  header: React.ReactNode;
  children: React.ReactNode;
  /**
   * Draws the four trust pillars and the app band above the footer, in the
   * board's art set. Leave out on a page whose own content stands there.
   */
  art?: PublicArtSet;
  /** False leaves the phones art out of the app band (see PublicAppBand). */
  appPhones?: boolean;
  /** A short honest note under the footer tagline. */
  footerNote?: string;
}

/**
 * Every public page's frame (canvas page 3a): the header, the page, the trust
 * pillars and app band, then the footer with the Kare Letter band. No service
 * receives newsletter sign-ups yet, so the band says so and collects nothing.
 */
export function PublicSitePage({ header, children, art, appPhones = true, footerNote }: PublicSitePageProps): React.ReactElement {
  return (
    <div className="sk-psite-page">
      {header}
      <main className={`sk-psite-page__main${art ? '' : ' sk-psite-page__main--bare'}`}>
        {children}
        {art ? (
          <div className="sk-psite-page__closing">
            <PublicTrustBand art={art} />
            <PublicAppBand art={art} phones={appPhones} />
          </div>
        ) : null}
      </main>
      <PublicSiteFooter band={<NewsletterBand />} note={footerNote} />
    </div>
  );
}
