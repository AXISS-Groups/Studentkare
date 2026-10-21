import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { navigate } from '@/lib/utils/workflowRouting';
import { browserLocate } from '../model/location';
import { CareDirectoryViewModel } from '../viewmodel/CareDirectoryViewModel';
import { FindCare } from './CareDirectoryView';
import './findCare.css';

/**
 * /find-care for a visitor (WebFindCare), and for a signed-in account that is
 * not a student: the directory inside the public site's header and footer.
 * Every-campus listings and partners only; doctors without slots ("Sign in to
 * book"); no campus SOS (it needs a student session; /sos still offers 112).
 * A visitor's location, if they share it, stays in the browser.
 */
export function PublicFindCarePage(): React.ReactElement {
  const t = useT();
  const phone = usePhoneFrame();
  const [vm] = useState(() => new CareDirectoryViewModel({ locate: browserLocate, signedIn: false }));
  useEffect(() => {
    vm.start();
    return () => vm.dispose();
  }, [vm]);
  return (
    <PublicSitePage header={<PublicSiteHeader current="findCare" variant="compact" />} footerNote={t('fc.footerNote')}>
      <div className="sk-fc-public">
        <FindCare vm={vm} wide={!phone} links={{ book: () => navigate('login', 'find-care') }} />
      </div>
    </PublicSitePage>
  );
}
