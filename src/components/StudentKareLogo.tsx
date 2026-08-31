import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface StudentKareLogoProps {
  size?: number; // Shield height in px (default 32)
  showWordmark?: boolean;
  showStrapline?: boolean;
  straplineText?: string;
  darkVariant?: boolean; // if rendered on dark card/background
}

export const StudentKareShield: React.FC<{ size?: number; id?: string }> = ({ size = 32, id = 'sk' }) => {
  const width = Math.round((size / 139) * 118);
  const height = size;

  return (
    <svg width={width} height={height} viewBox="0 0 118 139" fill="none" style={{ display: 'block', flex: 'none' }}>
      <defs>
        <linearGradient id={`${id}Rim`} x1="0" y1="0" x2="118" y2="139" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b1a6f6" />
          <stop offset="0.5" stopColor="#7b76e0" />
          <stop offset="1" stopColor="#4a46d8" />
        </linearGradient>
        <linearGradient id={`${id}L`} x1="10" y1="12" x2="59" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8f86d8" />
          <stop offset="1" stopColor="#5350cc" />
        </linearGradient>
        <linearGradient id={`${id}R`} x1="59" y1="12" x2="112" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5a56cf" />
          <stop offset="1" stopColor="#403cd5" />
        </linearGradient>
      </defs>
      <path d="M59 2 114 21v56c0 27-21 47-55 60C25 124 4 104 4 77V21z" fill={`url(#${id}Rim)`} />
      <path d="M59 12 105 28v48c0 22-17 39-46 50V12z" fill={`url(#${id}R)`} />
      <path d="M59 12 13 28v48c0 22 17 39 46 50V12z" fill={`url(#${id}L)`} />
      <text x="59" y="90" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="46" letterSpacing="-1.5" fill="#ffffff">
        SK
      </text>
    </svg>
  );
};

export const StudentKareLogo: React.FC<StudentKareLogoProps> = ({
  size = 32,
  showWordmark = true,
  showStrapline = true,
  straplineText = 'HEALTH RECORDS · 18+ INDIA',
  darkVariant = false,
}) => {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size >= 40 ? 14 : 10 }}>
      <StudentKareShield size={size} id={`skLogo_${uniqueId}`} />
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: size >= 40 ? 24 : size >= 32 ? 18 : 15,
              letterSpacing: '-0.6px',
              lineHeight: 1.1,
              color: darkVariant ? '#ffffff' : '#16165c',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            Student <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400 }}>Kare</span>
          </div>
          {showStrapline && (
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: size >= 40 ? 10 : 9,
                letterSpacing: '1px',
                color: darkVariant ? '#b1a6f6' : '#5350cc',
                fontWeight: 600,
              }}
            >
              {straplineText}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
