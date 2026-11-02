import React, { useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { BookAppointmentDialog } from '@/screens/workspace/AppointmentsPanel';
import { ConsultsViewModel } from '../viewmodel/ConsultsViewModel';
import { M2ConsultsView } from './M2ConsultsView';

/**
 * Mobile 2.0 Doctor consults on the web: /care for a signed-in student at
 * phone width. "Book" opens the existing booking dialog with the
 * consultation already picked.
 */
export function M2ConsultsRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const [vm] = useState(() => new ConsultsViewModel());
  const [booking, setBooking] = useState<string | null>(null);
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <>
      <M2ConsultsView wide={wide} vm={vm} links={{ back: () => navigate('health'), book: (service) => setBooking(service.id), plus: () => navigate('billing') }} />
      {booking ? (
        <BookAppointmentDialog initialItemId={booking} onClose={() => setBooking(null)} onDone={() => { setBooking(null); navigate('appointments'); }} />
      ) : null}
    </>
  );
}
