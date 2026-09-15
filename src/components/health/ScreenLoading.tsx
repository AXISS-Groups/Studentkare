import React from 'react';
import { CareLoader } from '../interface/CareLoader';

export function ScreenLoading() {
  return <div className="health-screen-loading" role="status"><CareLoader />Opening your care space…</div>;
}
