import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n';
import { InsightsViewModel } from '../viewmodel/InsightsViewModel';
import { M2InsightsView } from '../views/M2InsightsView';
import { M2InsightsRoute } from '../views/M2InsightsRoute';

vi.mock('@/data/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { fullName: 'Test User' } }),
}));

vi.mock('@/design-system/navigation/BoardHeader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system/navigation/BoardHeader')>();
  return {
    ...actual,
    usePhoneHeaderSlot: () => null,
  };
});

describe('M2Insights wide mode', () => {
  it('renders M2InsightsView with wide=true', () => {
    const vm = new InsightsViewModel();
    render(
      <LanguageProvider>
        <M2InsightsView
          vm={vm}
          name="Test User"
          wide={true}
          links={{
            sos: vi.fn(),
            trends: vi.fn(),
            records: vi.fn(),
            reportUpload: vi.fn(),
            medicines: vi.fn(),
            water: vi.fn(),
          }}
        />
      </LanguageProvider>
    );
    expect(screen.getByTestId('m2-insights')).toBeInTheDocument();
  });

  it('renders M2InsightsRoute and adapts to desktop viewport', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('1024px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <LanguageProvider>
        <M2InsightsRoute />
      </LanguageProvider>
    );
    expect(screen.getByTestId('m2-insights')).toBeInTheDocument();
  });
});
