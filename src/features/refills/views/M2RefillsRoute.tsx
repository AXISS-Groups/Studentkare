import React, { useEffect, useState } from 'react';
import { useSearchParams } from '@/core/navigation';
import { useOnline } from '@/design-system';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { navigate } from '@/lib/utils/workflowRouting';
import { useScrollTopOn } from '@/features/phoneKit/useScrollTopOn';
import type { Refill } from '../data/refillsApi';
import { RefillsViewModel } from '../viewmodel/RefillsViewModel';
import { ReorderViewModel } from '../viewmodel/ReorderViewModel';
import { M2RefillsView } from './M2RefillsView';
import { M2ReorderView } from './M2ReorderView';

/**
 * Refills on the web: /health/refills for a signed-in student (phone frame and
 * desktop column). `?id=<refill>` (a refill reminder in the inbox) puts that
 * medicine first; `?order=<order>&item=<item>` (Orders' "Remind me to refill")
 * opens Track a refill on that line. Only opaque ids travel in the URL, never a
 * medicine (Rule L). Reorder is the next board on the same route.
 */
export function M2RefillsRoute(): React.ReactElement {
  const [params] = useSearchParams();
  const online = useOnline();
  const slot = usePhoneHeaderSlot();
  const [vm] = useState(() => new RefillsViewModel());
  const [reorder, setReorder] = useState<ReorderViewModel | null>(null);
  const focus = params.get('id');
  const fromOrder = params.get('order');
  const fromItem = params.get('item');
  useScrollTopOn(reorder ? 'reorder' : 'list');

  useEffect(() => { vm.setOnline(online); reorder?.setOnline(online); }, [vm, reorder, online]);
  useEffect(() => {
    vm.setFocus(focus);
    vm.load();
    if (fromOrder && fromItem) vm.openSetup({ orderId: fromOrder, itemId: fromItem });
    return () => vm.dispose();
  }, [vm, focus, fromOrder, fromItem]);
  useEffect(() => {
    if (!reorder) return undefined;
    void reorder.load();
    return () => reorder.dispose();
  }, [reorder]);

  const sos = () => (slot?.openSos ? slot.openSos() : navigate('sos'));
  const open = (refill: Refill) => {
    if (refill.orderId && refill.itemId) setReorder(new ReorderViewModel(refill.orderId, [refill.itemId]));
  };

  if (reorder) {
    return (
      <M2ReorderView vm={reorder} links={{
        back: () => { setReorder(null); vm.load(); },
        sos,
        sendPrescription: () => navigate('prescriptions'),
        uploadPrescription: () => navigate('prescriptions'),
        consult: () => navigate('care'),
        pharmacist: () => navigate('find-care'),
        track: () => navigate('orders'),
        orders: () => navigate('orders'),
      }} />
    );
  }
  return (
    <M2RefillsView vm={vm} links={{
      back: () => navigate('health/medicines'),
      sos,
      reorder: open,
      requestRefill: () => navigate('refill-request'),
    }} />
  );
}
