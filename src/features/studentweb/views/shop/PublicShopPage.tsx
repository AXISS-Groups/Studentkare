import React from 'react';
import { useT } from '@/i18n';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { WebShopView } from './WebShopView';
import { WebCheckoutView } from './WebCheckoutView';

/**
 * /shop for a visitor (and /shop, /checkout for a signed-in account that is
 * not a student) above and at phone width: the Mobile 2.0 web shop inside the
 * public site's header and footer (canvas page 3a). The student gets the same
 * shop inside the student web shell (WorkspaceScreen). Signed out, the cart
 * stays in this browser and checking out asks to sign in first.
 */
export function PublicShopPage({ route, signedIn }: { route: 'shop' | 'checkout'; signedIn: boolean }): React.ReactElement {
  const t = useT();
  return (
    <PublicSitePage header={<PublicSiteHeader current="wellness" variant="compact" />} footerNote={t('shopweb.footer.note')}>
      <div className="sk-m2w-public">
        {route === 'checkout' && signedIn ? <WebCheckoutView /> : <WebShopView signedIn={signedIn} />}
      </div>
    </PublicSitePage>
  );
}
