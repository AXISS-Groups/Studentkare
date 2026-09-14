import React from 'react';
import '../../theme/ambient.css';

/** Decorative CSS/SVG only: no canvas loop, network assets, or layout measurements. */
export function AmbientBackground() {
  return <div className="care-ambient" aria-hidden="true">
    <div className="care-ambient-wash care-ambient-wash-lilac" />
    <div className="care-ambient-wash care-ambient-wash-mint" />
    <div className="care-ambient-wash care-ambient-wash-peach" />
    <svg className="care-ambient-vectors" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
      <g className="care-ambient-orbit" fill="none" stroke="currentColor" strokeWidth="1">
        <ellipse cx="1210" cy="240" rx="275" ry="180" transform="rotate(-28 1210 240)" />
        <ellipse cx="1210" cy="240" rx="310" ry="215" transform="rotate(-28 1210 240)" />
        <ellipse cx="1210" cy="240" rx="345" ry="250" transform="rotate(-28 1210 240)" />
        <circle cx="984" cy="155" r="5" fill="currentColor" stroke="none" />
        <circle cx="1377" cy="408" r="8" fill="currentColor" stroke="none" />
      </g>
      <g className="care-ambient-wave" fill="none" stroke="currentColor" strokeWidth="1.1">
        <path d="M-100 850C170 590 350 1050 640 780S1060 730 1550 910" />
        <path d="M-100 872C170 612 350 1072 640 802S1060 752 1550 932" />
        <path d="M-100 894C170 634 350 1094 640 824S1060 774 1550 954" />
        <path d="M-100 916C170 656 350 1116 640 846S1060 796 1550 976" />
      </g>
      <g className="care-ambient-points" fill="currentColor">
        <circle cx="335" cy="220" r="3" /><circle cx="835" cy="610" r="3" /><circle cx="1120" cy="735" r="4" />
        <path d="M385 570h14m-7-7v14M1260 595h14m-7-7v14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </g>
    </svg>
  </div>;
}
