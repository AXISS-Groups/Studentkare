import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { copyText } from '@/data/services/clipboard';
import { PayStepView, type PayStepCopy } from '@/features/payments/views/PayStepView';
import { LabBookingViewModel } from '../viewmodel/LabBookingViewModel';
import { LabPackagesView } from './LabPackagesView';
import { ResultLabBookedView } from './ResultLabBookedView';

/** The Pay step speaks of a booking here, not an order. */
const LAB_PAY_COPY: PayStepCopy = {
  back: 'labbook.pay.back', orders: 'labbook.pay.bookings', unavailableBody: 'labbook.pay.unavailable',
  lateBody: 'labbook.pay.late', closedBody: 'labbook.pay.closed', reference: 'labbook.pay.reference',
};

export interface LabBookingLinks {
  /** Leave the flow (back to the shop). */
  onExit: () => void;
  /** "My reports" (the student's records). */
  onReports: () => void;
  /** The student's own lab tests, where a booking is tracked. */
  onViewBooking: () => void;
}

function saveCalendarFile(ics: string, filename: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

/** List and slot sheet, then Pay, then booked (canvas LabPackages, Payment, ResultLabBooked). */
export const LabBookingFlow = observer(function LabBookingFlow({ viewModel: vm, studentName, links }: {
  viewModel: LabBookingViewModel;
  studentName: string;
  links: LabBookingLinks;
}) {
  if (vm.step === 'pay' && vm.payment) {
    return <PayStepView viewModel={vm.payment} onBack={vm.backToSlot} onTrack={links.onViewBooking}
      onOrders={links.onViewBooking} copy={LAB_PAY_COPY} />;
  }
  if (vm.step === 'result') {
    return <ResultLabBookedView viewModel={vm} studentName={studentName} onBack={vm.startOver}
      onViewBooking={links.onViewBooking} onCopy={copyText} onCalendar={saveCalendarFile} />;
  }
  return <LabPackagesView viewModel={vm} onBack={links.onExit} onReports={links.onReports} />;
});

/**
 * The flow with its own view model. `openItemId` opens the slot sheet for that
 * test as soon as the list has loaded (the shop's "Book" on a lab card).
 */
export function LabBookingRoute({ openItemId, studentName, links }: {
  openItemId?: string;
  studentName: string;
  links: LabBookingLinks;
}): React.ReactElement {
  const [vm] = useState(() => new LabBookingViewModel());
  useEffect(() => {
    let live = true;
    void vm.load().then(() => { if (live && openItemId) vm.open(openItemId); });
    return () => { live = false; vm.dispose(); };
  }, [vm, openItemId]);
  return <LabBookingFlow viewModel={vm} studentName={studentName} links={links} />;
}
