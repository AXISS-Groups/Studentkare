import React from 'react';
import { useT } from '@/i18n';

export interface StudentKareLogoProps {
  size?: number; // Shield height in px (default 32)
  showWordmark?: boolean;
  showStrapline?: boolean;
  straplineText?: string;
  darkVariant?: boolean; // if rendered on dark card/background
  onClick?: () => void;
}

/** The SK mark's proportions (design/brand/sk-mark.png is 512 × 605). */
const MARK_RATIO = 512 / 605;
/** design/brand/sk-logo-horizontal-reverse.png is 1200 × 300 (mark + white wordmark). */
const REVERSE_RATIO = 1200 / 300;

/**
 * The SK mark. `alt` names it when it stands alone; pass "" when a visible
 * wordmark already says "Student Kare" so the name is not read twice.
 */
export const StudentKareShield: React.FC<{ size?: number; id?: string; alt?: string }> = ({ size = 32, alt = 'Studentkare' }) => (
  <img
    src="/brand/sk-mark.png"
    alt={alt}
    aria-hidden={alt === '' ? true : undefined}
    width={Math.round(size * MARK_RATIO)}
    height={size}
    style={{ display: 'block', flex: 'none' }}
  />
);

export const StudentKareLogo: React.FC<StudentKareLogoProps> = ({
  size = 32,
  showWordmark = true,
  showStrapline = true,
  straplineText,
  darkVariant = false,
  onClick,
}) => {
  const t = useT();
  const strapline = straplineText ?? t('shopweb.logo.strapline');

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size >= 40 ? 14 : 10,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: onClick ? 'none' : 'auto',
      }}
    >
      {darkVariant && showWordmark ? (
        // On dark backgrounds the brand's own reverse lockup replaces mark + typed wordmark.
        <img
          src="/brand/sk-logo-horizontal-reverse.png"
          alt="Student Kare"
          width={Math.round(size * 1.2 * REVERSE_RATIO)}
          height={Math.round(size * 1.2)}
          style={{ display: 'block', flex: 'none' }}
        />
      ) : (
        <StudentKareShield size={size} alt={showWordmark ? '' : 'Studentkare'} />
      )}
      {showWordmark && !darkVariant && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: size >= 40 ? 24 : size >= 32 ? 18 : 15,
              letterSpacing: '-0.6px',
              lineHeight: 1.1,
              color: darkVariant ? 'var(--sk-color-on-action)' : 'var(--ink, var(--sk-color-brand-navy))',
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
                color: darkVariant ? 'var(--sk-color-action-soft)' : 'var(--data, var(--sk-color-action))',
                fontWeight: 600,
              }}
            >
              {strapline}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
