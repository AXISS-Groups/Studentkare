import React, { useId, useState } from 'react';
import { useT } from '@/i18n';
import { color as tokenColor } from '@/design-system/theme';
import type { CatalogItem } from '../../data/datasets/marketplaceCatalog';

/** Local fictional packshots or user-uploaded real product images. */
export function ProductArtwork({
  item,
  imageUrl,
  className = ''
}: {
  item: Pick<CatalogItem, 'name' | 'brand' | 'color' | 'shape' | 'artLabel'>;
  imageUrl?: string | null;
  className?: string;
}) {
  // Hooks run on every render, before any early return (rules of hooks).
  const t = useT();
  const id = useId().replace(/:/g, '');
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (imageUrl && failedUrl !== imageUrl) {
    return (
      <div className={`shop-product-art shop-product-uploaded-img ${className}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', overflow: 'hidden' }}>
        <img
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
          // A broken photo falls back to the illustration below, which says it is one.
          onError={() => setFailedUrl(imageUrl)}
        />
      </div>
    );
  }

  const { shape, artLabel, brand } = item;
  const color = tokenColor[item.color];
  return <svg className={`shop-product-art ${className}`} viewBox="0 0 220 230" role="img" aria-label={t('shopweb.art.label', { name: item.name })}>
    <defs>
      <linearGradient id={`${id}-body`}><stop stopColor="var(--sk-color-illustration-ink-light)" /><stop offset=".22" stopColor="var(--sk-color-illustration-highlight)" /><stop offset=".7" stopColor="var(--sk-color-illustration-highlight)" /><stop offset="1" stopColor="var(--sk-color-illustration-ink-light)" /></linearGradient>
      <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--sk-color-illustration-highlight)" /><stop offset="1" stopColor="var(--sk-color-illustration-ink-light)" /></linearGradient>
      <linearGradient id={`${id}-tint`}><stop stopColor={color} /><stop offset=".8" stopColor={color} stopOpacity=".85" /><stop offset="1" stopColor={color} stopOpacity=".7" /></linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="5" dy="7" stdDeviation="6" floodColor="var(--sk-color-illustration-ink)" floodOpacity=".11" /></filter>
    </defs>
    <ellipse cx="110" cy="209" rx="62" ry="8" fill="var(--sk-color-illustration-ink)" opacity=".05" />
    {shape === 'bottle' && <g filter={`url(#${id}-shadow)`}>
      <rect x="72" y="32" width="76" height="27" rx="6" fill={`url(#${id}-lid)`} />
      {Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${77 + i * 5} 35v21`} stroke="var(--sk-color-illustration-indigo-soft)" strokeWidth="1" />)}
      <path d="M78 57H142V65C142 76 157 74 157 92V192Q157 204 145 204H75Q63 204 63 192V92C63 74 78 76 78 65Z" fill={`url(#${id}-body)`} />
      <path d="M63 108H157V178H63Z" fill={`url(#${id}-tint)`} />
      <text x="110" y="97" textAnchor="middle" fontSize="10" fontFamily="Georgia, serif" fill="var(--sk-color-illustration-ink)">{brand}</text>
      <text x="110" y="132" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="Arial, sans-serif" fill="var(--sk-color-illustration-highlight)">{artLabel}</text>
      <text x="110" y="148" textAnchor="middle" fontSize="6" letterSpacing="1.5" fill="var(--sk-color-illustration-highlight)">{t('shopweb.art.tagline')}</text>
      <path d="M96 162h28" stroke="var(--sk-color-illustration-highlight)" opacity=".6" />
      <text x="110" y="191" textAnchor="middle" fontSize="6" fill="var(--sk-color-illustration-ink)">{t('shopweb.art.illustration')}</text>
    </g>}
    {shape === 'tube' && <g filter={`url(#${id}-shadow)`}>
      <path d="M62 29H158L146 184H74Z" fill={`url(#${id}-body)`} />
      <path d="M62 29H158L154 65H66Z" fill={color} opacity=".3" />
      <path d="M70 110H150L146 180H74Z" fill={`url(#${id}-tint)`} />
      <path d="M65 35H155M65 39H155" stroke={color} opacity=".4" />
      <rect x="75" y="183" width="70" height="23" rx="4" fill={`url(#${id}-lid)`} />
      <text x="110" y="86" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill="var(--sk-color-illustration-ink)">{brand}</text>
      <text x="110" y="137" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" fill="var(--sk-color-illustration-highlight)">{artLabel}</text>
      <text x="110" y="154" textAnchor="middle" fontSize="6" letterSpacing="1" fill="var(--sk-color-illustration-highlight)">{t('shopweb.art.tagline')}</text>
      <text x="110" y="173" textAnchor="middle" fontSize="6" fill="var(--sk-color-illustration-highlight)">{t('shopweb.art.illustration')}</text>
    </g>}
    {shape === 'box' && <g filter={`url(#${id}-shadow)`}>
      <path d="M54 48L149 36L168 48V191L72 204L54 192Z" fill={color} />
      <path d="M54 48L149 36V191L54 192Z" fill="var(--sk-color-illustration-highlight)" />
      <path d="M54 48L149 36L168 48L72 60Z" fill="var(--sk-color-illustration-ink-light)" />
      <path d="M54 105L149 93V166L54 178Z" fill={`url(#${id}-tint)`} />
      <text x="100" y="83" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fill="var(--sk-color-illustration-ink)">{brand}</text>
      <text x="100" y="128" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" fill="var(--sk-color-illustration-highlight)">{artLabel}</text>
      <path d="M93 140h14m-7-7v14" stroke="var(--sk-color-illustration-highlight)" strokeWidth="3" opacity=".8" />
      <text x="100" y="158" textAnchor="middle" fontSize="5" letterSpacing="1" fill="var(--sk-color-illustration-highlight)">{t('shopweb.art.tagline')}</text>
      <text x="101" y="185" textAnchor="middle" fontSize="5" fill="var(--sk-color-illustration-ink)">{t('shopweb.art.illustration')}</text>
    </g>}
    {shape === 'jar' && <g filter={`url(#${id}-shadow)`}>
      <rect x="53" y="58" width="114" height="145" rx="15" fill={`url(#${id}-body)`} />
      <rect x="51" y="40" width="118" height="29" rx="7" fill="var(--sk-color-illustration-ink)" />
      <path d="M53 109H167V179H53Z" fill={color} />
      <text x="110" y="94" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill="var(--sk-color-illustration-ink)">{brand}</text>
      <text x="110" y="135" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" fill="var(--sk-color-illustration-highlight)">{artLabel}</text>
      <text x="110" y="153" textAnchor="middle" fontSize="7" letterSpacing="1.5" fill="var(--sk-color-illustration-highlight)">{t('shopweb.art.tagline')}</text>
      <path d="M98 169q12-15 24 0" fill="none" stroke="var(--sk-color-illustration-highlight)" />
      <text x="110" y="192" textAnchor="middle" fontSize="6" fill="var(--sk-color-illustration-ink)">{t('shopweb.art.illustration')}</text>
    </g>}
    {shape === 'device' && <g filter={`url(#${id}-shadow)`}>
      <rect x="49" y="50" width="101" height="151" rx="9" fill="var(--sk-color-illustration-ink-light)" />
      <path d="M49 60Q49 50 59 50H140Q150 50 150 60V83H49Z" fill={color} />
      <text x="99" y="71" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--sk-color-illustration-highlight)">{brand.slice(0, 17)}</text>
      <text x="99" y="184" textAnchor="middle" fontSize="8" fill="var(--sk-color-illustration-ink)">{artLabel}</text>
      <g transform="translate(76 83) rotate(8 40 50)">
        <rect width="85" height="107" rx="17" fill="var(--sk-color-illustration-highlight)" stroke="var(--sk-color-illustration-indigo-soft)" />
        <rect x="10" y="12" width="65" height="53" rx="7" fill="var(--sk-color-illustration-mint-soft)" />
        <text x="42" y="48" textAnchor="middle" fontFamily="monospace" fontSize="23" fill="var(--sk-color-illustration-mint-deep)">— —</text>
        <circle cx="43" cy="84" r="11" fill={color} />
        <path d="M40 84h6" stroke="var(--sk-color-illustration-highlight)" strokeWidth="2" />
      </g>
    </g>}
    {shape === 'lab' && <g filter={`url(#${id}-shadow)`}>
      <rect x="57" y="47" width="111" height="151" rx="11" fill="var(--sk-color-illustration-highlight)" />
      <rect x="86" y="37" width="55" height="20" rx="5" fill={color} />
      <circle cx="112" cy="100" r="25" fill={color} opacity=".15" />
      <path d="M99 100h26m-13-13v26" stroke={color} strokeWidth="7" strokeLinecap="round" />
      <path d="M81 144h61m-61 13h48m-48 13h55" stroke="var(--sk-color-illustration-indigo-soft)" strokeWidth="4" strokeLinecap="round" />
      <g transform="rotate(-12 50 157)"><rect x="35" y="113" width="26" height="79" rx="12" fill="var(--sk-color-illustration-sky-soft)" /><path d="M38 151h20v28a10 10 0 0 1-20 0Z" fill={color} opacity=".7" /><rect x="33" y="108" width="30" height="17" rx="4" fill={color} /></g>
    </g>}
  </svg>;
}
