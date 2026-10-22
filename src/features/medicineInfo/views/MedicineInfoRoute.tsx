import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { MedicineInfoViewModel } from '../viewmodel/MedicineInfoViewModel';
import { M2MedicineInfoView } from './M2MedicineInfoView';
import type { MedicineInfoLinks } from './M2MedicineInfoView';
import { pickMedicinePhoto } from './pickMedicinePhoto.web';

/** `?medicine=` opens one medicine (from the shop); `?q=` runs a search (from Home search). Nothing else is read. */
export function useMedicineInfo(signedIn: boolean): { vm: MedicineInfoViewModel; links: MedicineInfoLinks } {
  const [params] = useSearchParams();
  const routerNavigate = useNavigate();
  const [vm] = useState(() => new MedicineInfoViewModel());
  useEffect(() => {
    vm.start({ medicineId: params.get('medicine'), query: params.get('q') });
    return () => vm.dispose();
    // Arrival only: later changes come from the screen itself.
  }, [vm]);
  const read = (camera: boolean) => () => {
    void pickMedicinePhoto(camera).then((photo) => { if (photo) void vm.readPhoto(photo); });
  };
  const links: MedicineInfoLinks = {
    consult: () => navigate('care'),
    pharmacy: () => navigate('find-care'),
    sendRx: () => (signedIn ? navigate('prescriptions') : navigate('login', 'prescriptions')),
    product: (itemId) => routerNavigate(`/shop?product=${encodeURIComponent(itemId)}`),
    crisis: () => navigate('crisis'),
    takePhoto: read(true),
    uploadPhoto: read(false),
  };
  return { vm, links };
}

/**
 * Medicine information for a signed-in student on the web: /medicine-info in the
 * phone frame (M2MedicineInfo) or, above phone width, in the student web shell.
 */
export function MedicineInfoRoute({ wide = false }: { wide?: boolean }): React.ReactElement {
  const { vm, links } = useMedicineInfo(true);
  return <M2MedicineInfoView vm={vm} wide={wide} links={{ ...links, back: () => (window.history.length > 1 ? window.history.back() : navigate(wide ? 'home' : 'health')) }} />;
}
