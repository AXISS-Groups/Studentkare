import React, { useEffect, useState } from 'react';
import { useNavigate } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { Sheet } from '@/design-system';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { useT } from '@/i18n';
import { IdentityVerifyViewModel } from '../viewmodel/IdentityVerifyViewModel';
import { IdentityVerifyPanel } from './IdentityVerifyPanel';
import { CampusVerifyView } from './CampusVerifyView';

/**
 * /verify on the web (canvas VerifyIdentity at phone width, WebVerify inside the
 * student web shell; Tier 1, approved 2026-10-21). The workspace draws the frame.
 *
 * The College ID row opens the real campus verification (CampusVerify: roll
 * number to the campus, GET/POST /campus/verification) in a sheet; closing it
 * reloads GET /identity, so the row only changes when the server says so.
 */
export function IdentityVerifyView({ wide }: { wide?: boolean } = {}): React.ReactElement {
  const t = useT();
  const go = useNavigate();
  const phone = usePhoneFrame();
  const [vm] = useState(() => new IdentityVerifyViewModel());
  const [campusOpen, setCampusOpen] = useState(false);
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <>
      <IdentityVerifyPanel
        viewModel={vm}
        wide={wide ?? !phone}
        links={{
          openCampusVerification: () => setCampusOpen(true),
          openCrisis: () => go('/crisis'),
          back: () => navigate('health'),
        }}
      />
      <Sheet
        visible={campusOpen}
        title={t('ident.check.campus')}
        onClose={() => { setCampusOpen(false); void vm.load(); }}
      >
        <CampusVerifyView onLeaving={() => navigate('leave-campus')} />
      </Sheet>
    </>
  );
}
