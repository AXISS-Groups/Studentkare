import React, { useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { BookAppointmentDialog } from '@/screens/workspace/AppointmentsPanel';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { browserLocate } from '../model/location';
import { CareDirectoryViewModel } from '../viewmodel/CareDirectoryViewModel';
import { FindCare } from './CareDirectoryView';

/**
 * Find care for a signed-in student on the web: /find-care in the phone frame
 * (M2FindCare) or, above phone width, in the student web shell (`wide`). "Book"
 * opens the existing booking dialog with the consultation picked; SOS opens the
 * frame's helplines (or the SOS page where there is no frame).
 */
export function CareDirectoryRoute({ wide = false }: { wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new CareDirectoryViewModel({ locate: browserLocate, signedIn: true }));
  const slot = usePhoneHeaderSlot();
  const [booking, setBooking] = useState<string | null>(null);
  useEffect(() => {
    vm.start();
    return () => vm.dispose();
  }, [vm]);
  return (
    <>
      <FindCare vm={vm} wide={wide} links={{
        back: () => navigate(wide ? 'home' : 'health'),
        sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
        book: (service) => setBooking(service.id),
      }} />
      {booking ? (
        <BookAppointmentDialog initialItemId={booking} onClose={() => setBooking(null)} onDone={() => { setBooking(null); navigate('appointments'); }} />
      ) : null}
    </>
  );
}
