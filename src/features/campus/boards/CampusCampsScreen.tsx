import React from 'react';
import { CampsHostBoard } from '@/features/camp/host/CampsHostBoard';
import type { CampsHostSource } from '@/features/camp/host/hostApi';
import './campus-boards.css';

export { slotTime } from '@/features/camp/host/CampsHostBoard';

/**
 * Health camps on the campus console (design page 4, CampusCamps; Tier 2): the
 * camps this campus runs or is asked to approve, with counts per slot that
 * withhold any group under the campus minimum, CSV export, approve or decline a
 * partner's camp, call a camp off, and create one. The board itself is shared
 * with the partner console (features/camp/host/CampsHostBoard.tsx).
 */
export function CampusCampsScreen({ source }: { source?: CampsHostSource }): React.ReactElement {
  return <CampsHostBoard mode="campus" source={source} />;
}
