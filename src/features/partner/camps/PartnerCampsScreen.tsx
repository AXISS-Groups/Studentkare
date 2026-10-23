import React from 'react';
import { CampsHostBoard } from '@/features/camp/host/CampsHostBoard';
import type { CampsHostSource } from '@/features/camp/host/hostApi';
import '@/features/campus/boards/campus-boards.css';

/**
 * Health camps on the partner console (clinics and labs; Tier 3, designed in code
 * from the campus board — design/screens/briefs/PartnerCamps.md). A partner
 * proposes a camp to a partner campus, which approves it before students see it,
 * and then follows its slots: places, booked, waitlist, checked in, cancelled,
 * with CSV export. Never who booked.
 */
export function PartnerCampsScreen({ source }: { source?: CampsHostSource }): React.ReactElement {
  return (
    <main className="sk-ds pc-page">
      <CampsHostBoard mode="partner" source={source} />
    </main>
  );
}
