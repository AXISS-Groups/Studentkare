import type { LabBooking, LabPackage } from '../../data/LabBookingRepository';

/** Shared test data for the lab booking tests. Sample values only. */
export const PACKAGE: LabPackage = {
  id: 'pkg', name: 'Vitamin D + B12', pack: '2 tests', description: '', pricePaise: 64900, mrpPaise: 99900,
  includes: ['Vitamin D (25-OH)', 'Vitamin B12'], fastingHours: 10, reportHours: 24, preparation: '',
  lab: { id: 'lab-1', name: 'Demo Diagnostics', accreditation: '', homeCollection: true },
};

export const SLOTS = [
  { id: 's-am', slotStart: '2099-01-05T07:00:00+05:30', slotEnd: '2099-01-05T08:00:00+05:30', available: 2 },
  { id: 's-am2', slotStart: '2099-01-05T08:00:00+05:30', slotEnd: '2099-01-05T09:00:00+05:30', available: 1 },
];

export function booking(status: string, slotStart = SLOTS[0].slotStart): LabBooking {
  return {
    order: { id: 'order-abcdef12', status: 'BOOKED', slotStart, fastingRequired: true, testPanel: ['Vitamin D + B12'],
      collectionAddress: { kind: 'HOSTEL', hostelBlock: 'Block B', room: '214' }, collectorName: '', selfBooked: true,
      paymentStatus: status as LabBooking['order']['paymentStatus'], amountPaise: 64900 },
    booking: { labName: 'Demo Diagnostics', accreditation: '', packageName: 'Vitamin D + B12', includes: PACKAGE.includes,
      fastingHours: 10, reportHours: 24, slotEnd: '2099-01-05T08:00:00+05:30', amountPaise: 64900,
      paymentStatus: status as LabBooking['booking']['paymentStatus'], paymentDueAt: null },
  };
}
