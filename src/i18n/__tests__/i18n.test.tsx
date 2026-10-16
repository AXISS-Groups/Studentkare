import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/storage/CrossPlatformStorage', () => ({ CrossPlatformStorage: { get: async () => '', set: async () => undefined } }));

import { en } from '../en';
import { te } from '../te';
import { hi } from '../hi';
import { LanguageProvider, REVIEW_STATUS, translate } from '..';
import type { MessageKey } from '..';
import { LanguageSetting } from '../LanguageSetting';
import { CrisisLinks } from '@/design-system';
import { destinationsFor } from '@/native/homeDestinations';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('catalogues', () => {
  it.each([['te', te], ['hi', hi]] as const)('%s keeps every placeholder and leaves nothing empty', (_lang, catalog) => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(placeholders(catalog[key]), key).toEqual(placeholders(en[key]));
      expect(catalog[key].trim().length, key).toBeGreaterThan(0);
    }
  });

  it.each([['te', te], ['hi', hi]] as const)('%s keeps helpline numbers and names in English', (_lang, catalog) => {
    expect(catalog['crisis.callTeleManas']).toContain('Tele-MANAS');
    expect(catalog['crisis.callTeleManas']).toContain('14416');
    expect(catalog['crisis.call112']).toContain('112');
  });

  it('has label and hint keys for every native home destination', () => {
    for (const role of ['STUDENT', 'NMC_DOCTOR'] as const) {
      for (const d of destinationsFor(role)) {
        expect(Object.keys(en), d.route).toContain(`dest.${d.route}.label`);
        expect(Object.keys(en), d.route).toContain(`dest.${d.route}.hint`);
      }
    }
  });

  it('fills placeholders', () => {
    expect(translate('hi', 'home.greeting', { name: 'Asha' })).toBe('नमस्ते, Asha');
  });

  it('marks Telugu and Hindi as unreviewed until a native speaker and clinician sign off', () => {
    expect(REVIEW_STATUS).toEqual({ en: 'source', te: 'unreviewed', hi: 'unreviewed' });
  });
});

describe('switching language', () => {
  it('re-renders crisis help in the chosen language and says the translation is unreviewed', () => {
    render(<LanguageProvider><LanguageSetting /><CrisisLinks /></LanguageProvider>);
    expect(screen.getByRole('button', { name: en['crisis.call112Spoken'] })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'తెలుగు' }));
    expect(screen.getByRole('button', { name: te['crisis.call112Spoken'] })).toBeInTheDocument();
    expect(screen.getByText(te['lang.reviewNote'])).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('te');
  });
});
