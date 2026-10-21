import React from 'react';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { WebCareView } from './WebCareView';

/**
 * /care for a visitor (and for a signed-in account that is not a student), at
 * any width: Mobile 2.0 Doctor consults inside the public site's header and
 * footer (canvas page 3a), as #196 did for the shop. The student gets the same
 * page inside the student web shell, and M2Consults at phone width. Signed
 * out, no slot is read and booking or checking out asks to sign in first.
 */
export function PublicCarePage({ signedIn }: { signedIn: boolean }): React.ReactElement {
  return (
    <PublicSitePage header={<PublicSiteHeader current="findDoctor" variant="compact" />}>
      <div className="sk-m2w-public">
        <WebCareView signedIn={signedIn} plus="pricing" />
      </div>
    </PublicSitePage>
  );
}
