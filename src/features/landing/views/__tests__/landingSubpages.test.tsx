import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import * as http from '@/data/services/http';
import { LandingLabListView } from '../LandingLabListView';
import { LandingLabListNativeView } from '../LandingLabListNativeView';
import { LandingProgramsView } from '../LandingProgramsView';
import { LandingProgramsNativeView } from '../LandingProgramsNativeView';
import { LandingWellnessView } from '../LandingWellnessView';
import { LandingWellnessNativeView } from '../LandingWellnessNativeView';
import { LandingViewModel } from '../../viewmodel/LandingViewModel';
import type { LandingCatalogItem } from '../../viewmodel/LandingViewModel';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
// The calculators need a ThemeProvider and are not what these tests are about.
vi.mock('@/components/clinical/ComprehensiveHealthCalculators', () => ({ ComprehensiveHealthCalculators: () => null }));
const mocked = vi.mocked(http.apiRequest);

const lab: LandingCatalogItem = {
  id: 'l1', name: 'Thyroid Profile', brand: 'Partner Lab', kind: 'lab', pack: '3 tests', pricePaise: 45000, mrpPaise: 80000,
};

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mocked.mockReset();
});

describe('LandingLabListView', () => {
  it('shows only prices the catalogue published, and books in the shop', async () => {
    mocked.mockImplementation(() => Promise.resolve({ items: [lab], total: 1 }));
    render(<LandingLabListView />);
    await settle();
    expect(mocked.mock.calls.map((call) => call[0])).toContain('/catalog?kind=lab&limit=24');
    expect(screen.getByText('₹450')).toBeTruthy();
    expect(screen.getByText('₹800')).toBeTruthy();
    const book = screen.getByLabelText('Book in the shop: Thyroid Profile');
    expect(book.getAttribute('href')).toBe('/shop?kind=lab');
    // The old page re-typed prices and named a campus as a customer.
    expect(document.body.textContent).not.toMatch(/₹499|VNR VJIET|Block B|% OFF|Booked/);
  });

  it('fails closed: a malformed row shows the error state and no price', async () => {
    mocked.mockImplementation(() => Promise.resolve({ items: [{ ...lab, pricePaise: '450' }], total: 1 }));
    render(<LandingLabListView />);
    await settle();
    expect(screen.getByRole('alert').textContent).toMatch(/Prices could not be loaded/);
    expect(document.body.textContent).not.toMatch(/₹/);
  });

  it('has no sign-up form that pretends to subscribe', async () => {
    mocked.mockImplementation(() => Promise.resolve({ items: [], total: 0 }));
    render(<LandingLabListView />);
    await settle();
    expect(screen.getByText('No lab tests are listed yet.')).toBeTruthy();
    expect(document.querySelector('form')).toBeNull();
    expect(document.body.textContent).toMatch(/not open yet/);
  });
});

describe('LandingProgramsView', () => {
  it('sends people to a consult instead of faking an enrolment', () => {
    render(<LandingProgramsView />);
    const ask = screen.getByLabelText('Talk to a clinician about the Diabetes programme');
    expect(ask.tagName).toBe('A');
    expect(ask.getAttribute('href')).toBe('/consult');
    expect(document.body.textContent).not.toMatch(/Enrolled|DPDP|open now/);
  });
});

describe('LandingWellnessView', () => {
  it('says no timetable is published and shows no invented prices or bookings', () => {
    render(<LandingWellnessView />);
    expect(screen.getAllByText('No timetable published yet').length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/₹|certified coaches|Booked|Block C/);
  });
});

describe('native twins', () => {
  it('lab list draws catalogue rows only when given the catalogue', async () => {
    const vm = new LandingViewModel(() => Promise.resolve([lab]), { kind: 'lab', limit: 24 });
    await vm.load();
    render(<LandingLabListNativeView destinations={{}} viewModel={vm} />);
    expect(screen.getByText('₹450')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/₹499|Book at Student Rate|Test Selected/);
  });

  it('lab list without a catalogue shows no price at all', () => {
    render(<LandingLabListNativeView destinations={{}} />);
    expect(document.body.textContent).not.toMatch(/₹/);
  });

  it('programmes and wellness make no enrolment or coach claims', () => {
    render(<LandingProgramsNativeView destinations={{}} />);
    render(<LandingWellnessNativeView destinations={{}} />);
    expect(document.body.textContent).not.toMatch(/Enrol in a programme|verified coaches|Reserve Spot|updated weekly/);
  });
});
