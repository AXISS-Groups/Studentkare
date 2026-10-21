import React from 'react';
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Rule L on Mobile 2.0 Home (founder, 2026-10-21): Home shows "Medicines
 * today" as dose COUNTS only. GET /meds/today also carries each medicine's
 * name and dose; none of it may reach Home's data, its screen, or its links.
 */
const MEDS_TODAY = {
  date: '2026-10-21', timezone: 'Asia/Kolkata',
  plans: [
    { planId: 'med_1', name: 'Sertraline', dosage: '50 mg', dosesPlanned: 2, dosesTaken: 1, dosesSkipped: 0, nextSlot: 2, undo: null },
    { planId: 'med_2', name: 'Ferrous sulphate', dosage: '200 mg', dosesPlanned: 1, dosesTaken: 0, dosesSkipped: 1, nextSlot: null, undo: null },
  ],
};
const ANSWERS: Record<string, unknown> = { '/meds/today': MEDS_TODAY, '/appointments': { items: [] }, '/camps': { items: [] } };

vi.mock('@/hooks/api/useApiResource', () => ({
  useApiResource: (path: string) => ({
    data: Object.entries(ANSWERS).find(([k]) => path.startsWith(k))?.[1] ?? null,
    loading: false, error: null, reload: () => undefined,
  }),
}));

import { LanguageProvider, translate } from '@/i18n';
import { useM2HomeData } from '@/features/m2store/data/useM2Home';
import { M2HomeView } from '@/features/m2store/views/M2HomeView';
import type { M2HomeLinks } from '@/features/m2store/views/M2HomeView';

afterEach(() => cleanup());

const NAMES = /sertraline|ferrous|50 mg|200 mg|med_1|med_2/i;

function links(): M2HomeLinks {
  return {
    sos: vi.fn(), menu: vi.fn(), notifications: vi.fn(), cart: vi.fn(), search: vi.fn(), uploadRx: vi.fn(), place: vi.fn(),
    services: { medicines: vi.fn(), labs: vi.fn(), consults: vi.fn(), vaccines: vi.fn(), insurance: vi.fn(), campus: vi.fn() },
    labs: vi.fn(), generics: vi.fn(), uploadReport: vi.fn(), meds: vi.fn(), buyAgain: vi.fn(), consult: vi.fn(), bookConsult: vi.fn(),
    concern: vi.fn(), product: vi.fn(), emergencyCard: vi.fn(), pass: vi.fn(), hostelVisit: vi.fn(), camp: vi.fn(),
  };
}

describe('Rule L: Home shows medicine counts only', () => {
  it('keeps only counts from /meds/today, and draws no medicine name or dose', () => {
    const { result } = renderHook(() => useM2HomeData());
    expect(result.current.meds.summary).toEqual({ taken: 1, planned: 3, skipped: 1 });
    expect(JSON.stringify(result.current)).not.toMatch(NAMES);

    const home = links();
    const { container } = render(
      <LanguageProvider>
        <M2HomeView name="Asha Rao" campus="VNR VJIET" verified data={result.current} links={home} recent={[]} />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('m2-home-meds')).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(NAMES);
    expect(container.innerHTML).not.toMatch(NAMES);
    // One dose left: the skipped one is neither taken nor left.
    expect(screen.getByTestId('m2-home-meds')).toHaveAccessibleName(expect.stringContaining(translate('en', 'm2.home.medsLeftOne')));
    // The link to the medicines screen carries nothing.
    fireEvent.click(screen.getByTestId('m2-home-meds'));
    expect(vi.mocked(home.meds).mock.calls.flat().every((a) => typeof a !== 'string' && typeof a !== 'number')).toBe(true);
  });
});
