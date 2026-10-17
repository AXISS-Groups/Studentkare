import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { landingEn } from '@/i18n/areas/landing';
import { LandingConsultView } from '../LandingConsultView';
import { LandingConsultNativeView } from '../LandingConsultNativeView';

function codeOf(name: string): string {
  return readFileSync(join(process.cwd(), 'src/features/landing/views', name), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Every English string the consult and partnerships pages can show. */
const COPY = Object.entries(landingEn)
  .filter(([key]) => key.startsWith('landing.consult.') || key.startsWith('landing.partners.'))
  .map(([, text]) => text)
  .join('\n');

describe('consult and partnerships copy', () => {
  it('claims no register check, accreditation or compliance state', () => {
    expect(COPY).not.toMatch(/NMC-registered|NMC-verified|verified against|NABL|HIPAA|certified|compliant|ABHA|ABDM/i);
  });

  it('quotes no service level, invented fee or plan discount', () => {
    // No consult fee or plan discount exists in any data these pages read.
    expect(COPY).not.toMatch(/within \d+ minutes|₹\s?\d|on Premium|full fee is refunded/i);
  });

  it('promises no offline card, app-store download or newsletter', () => {
    expect(COPY).not.toMatch(/offline emergency card|Download on the|Google Play|Kare Letter|Subscribed/i);
  });
});

describe('LandingConsultView', () => {
  it('shows no prices, no store badges and no newsletter form', () => {
    render(<LandingConsultView />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/₹/);
    expect(text).not.toMatch(/App Store|Google Play|Subscribe/);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(text).toMatch(/Fee set by the doctor/);
    expect(text).toMatch(/not in the app stores yet/i);
  });

  it('says honestly that nobody is on shift', () => {
    render(<LandingConsultView />);
    expect(screen.getByText('No clinicians on shift yet.')).toBeInTheDocument();
  });

  it('opens FAQ answers from a real button', () => {
    render(<LandingConsultView />);
    const q = screen.getByRole('button', { name: /What if I need to cancel\?/ });
    expect(q).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(q);
    expect(q).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/shown on the booking screen before you pay/)).toBeInTheDocument();
  });

  it('keeps raw colours only in the decorative illustration', () => {
    const code = codeOf('LandingConsultView.tsx').replace(/<svg width="100%"[\s\S]*?<\/svg>/, '');
    expect(code).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('LandingConsultNativeView', () => {
  it('shows the doctor-set fee note and no rupee amounts', () => {
    render(<LandingConsultNativeView onCall={vi.fn()} destinations={{}} />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/₹/);
    expect(screen.getAllByText('Fee set by the doctor')).toHaveLength(6);
  });

  it('draws no booking button when the platform has nowhere to send it', () => {
    render(<LandingConsultNativeView onCall={vi.fn()} destinations={{}} />);
    expect(screen.queryByLabelText('See who is on shift now')).toBeNull();
  });

  it('uses tokens, not raw colours', () => {
    expect(codeOf('LandingConsultNativeView.tsx')).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});
