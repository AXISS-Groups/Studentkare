import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider, REVIEW_STATUS, translate } from '@/i18n';
import type { Lang } from '@/i18n';
import { redesignPreviewEn, redesignPreviewHi, redesignPreviewTe } from '@/i18n/areas/redesignPreview';
import { M2MedicineInfoPreview } from '../M2MedicineInfoPreview';
import { M2FindCarePreview } from '../M2FindCarePreview';

afterEach(cleanup);
const languages: readonly Lang[] = ['en', 'te', 'hi'];
const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

describe('redesign preview localization', () => {
  it.each([redesignPreviewTe, redesignPreviewHi])('keeps every source key and interpolation variable in each translation', catalogue => {
    expect(Object.keys(catalogue).sort()).toEqual(Object.keys(redesignPreviewEn).sort());
    for (const key of Object.keys(redesignPreviewEn) as (keyof typeof redesignPreviewEn)[]) {
      expect(catalogue[key].trim().length).toBeGreaterThan(0);
      expect(placeholders(catalogue[key]), key).toEqual(placeholders(redesignPreviewEn[key]));
    }
  });

  it.each(languages)('%s: translates the medicine warning and error-report link without wiring the preview', lang => {
    render(<LanguageProvider initial={lang}><M2MedicineInfoPreview /></LanguageProvider>);
    expect(screen.getByText(translate(lang, 'preview.informationOnlyTalkToADoctorBeforeTaking'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: translate(lang, 'preview.reportAnError') })).toBeInTheDocument();
    expect(screen.getByTestId('preview-m2-medicine-info')).toBeInTheDocument();
  });

  it.each(languages)('%s: preserves the named destination in translated accessible call labels', lang => {
    render(<LanguageProvider initial={lang}><M2FindCarePreview /></LanguageProvider>);
    const name = translate(lang, 'campus.counsellor.call', { name: '[Campus health centre]' });
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });

  it('preserves the English clinical fixture and leaves translation review pending', () => {
    render(<M2MedicineInfoPreview />);
    expect(screen.getByText('[Paracetamol 650 mg tablet]')).toBeInTheDocument();
    expect(REVIEW_STATUS.te).toBe('unreviewed');
    expect(REVIEW_STATUS.hi).toBe('unreviewed');
  });
});
