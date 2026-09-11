import React from 'react';
import { StudentKareLogo } from './StudentKareLogo';

interface PageLoaderOverlayProps {
  isLoading: boolean;
  label?: string;
}

/** Loading reflects the caller's state; decorative motion never controls timing. */
export const PageLoaderOverlay: React.FC<PageLoaderOverlayProps> = ({ isLoading, label = 'Opening your care space…' }) => {
  if (!isLoading) return null;
  return <div className="care-loading-overlay" data-ui="loading" role="status" aria-live="polite">
    <div className="care-loading-card">
      <StudentKareLogo size={35} showStrapline={false} />
      <span className="care-loading-ring" aria-hidden="true" />
      <p>{label}</p>
    </div>
  </div>;
};
