import React from 'react';

export function CareLoader() {
  return <span className="care-vector-loader" aria-hidden="true">
    <svg viewBox="0 0 80 80" focusable="false">
      <circle className="care-loader-track" cx="40" cy="40" r="33" />
      <circle className="care-loader-orbit" cx="40" cy="40" r="33" />
      <path className="care-loader-cross" d="M35 26h10v9h9v10h-9v9H35v-9h-9V35h9Z" />
    </svg>
    <span className="care-loader-dots"><i /><i /><i /></span>
  </span>;
}
