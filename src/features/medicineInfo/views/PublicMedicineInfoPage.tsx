import React from 'react';
import { useT } from '@/i18n';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { M2MedicineInfoView } from './M2MedicineInfoView';
import { useMedicineInfo } from './MedicineInfoRoute';

/**
 * /medicine-info for a visitor and for a signed-in account that is not a student:
 * the same screen inside the public site's header and footer. Nothing about the
 * visitor is read or kept; sending a prescription asks them to sign in first.
 */
export function PublicMedicineInfoPage(): React.ReactElement {
  const t = useT();
  const phone = usePhoneFrame();
  const { vm, links } = useMedicineInfo(false);
  return (
    <PublicSitePage header={<PublicSiteHeader current={null} variant="compact" />} footerNote={t('mi.footerNote')}>
      <M2MedicineInfoView vm={vm} wide={!phone} links={links} />
    </PublicSitePage>
  );
}
