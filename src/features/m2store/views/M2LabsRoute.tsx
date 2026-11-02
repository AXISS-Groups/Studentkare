import React, { useState } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { navigate } from '@/lib/utils/workflowRouting';
import { LabBookingOverlay } from '@/features/labBooking/views/LabBookingOverlay';
import { useLabPackages } from '../data/useLabPackages';
import { M2LabsView } from './M2LabsView';

/**
 * Mobile 2.0 Lab tests on the web: /lab-tests for a signed-in student (phone
 * frame at phone width, the student web shell above it). Booking opens the
 * existing lab booking flow over the board.
 */
interface ProfileLine { hostelBlock?: string }

export function M2LabsRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const labs = useLabPackages();
  const profile = useApiResource<ProfileLine>('/profile');
  const [booking, setBooking] = useState<string | null>(null);
  return (
    <>
      <M2LabsView
        wide={wide}
        phase={labs.phase}
        packages={labs.items}
        retry={labs.reload}
        block={profile.data?.hostelBlock ?? ''}
        links={{
          back: () => navigate('health'),
          reports: () => navigate('records'),
          rx: () => navigate('prescriptions'),
          book: (pkg) => setBooking(pkg.id),
        }}
      />
      {booking ? <LabBookingOverlay itemId={booking} onClose={() => setBooking(null)} /> : null}
    </>
  );
}
