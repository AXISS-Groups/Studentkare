import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LandingNativeView } from '../LandingNativeView';
import { LandingCampusNativeView } from '../LandingCampusNativeView';
import { LandingClinicianNativeView } from '../LandingClinicianNativeView';
import { LandingLabTestsNativeView } from '../LandingLabTestsNativeView';
import { LandingPartnershipsNativeView } from '../LandingPartnershipsNativeView';
import { PartnershipEnquiryViewModel } from '../../viewmodel/PartnershipEnquiryViewModel';
import { LandingViewModel } from '../../viewmodel/LandingViewModel';
import type { LandingCatalogItem, ListLandingCatalog } from '../../viewmodel/LandingViewModel';

const row: LandingCatalogItem = {
  id: 'c1', name: 'Vitamin D3 60K', brand: 'Kare', kind: 'product', pack: 'Strip of 4', pricePaise: 29900, mrpPaise: 39900,
};

async function loaded(list: ListLandingCatalog) {
  const vm = new LandingViewModel(list);
  await vm.load();
  return vm;
}

describe('LandingNativeView', () => {
  it('shows the helplines while prices are still loading', () => {
    const onCall = vi.fn();
    render(<LandingNativeView viewModel={new LandingViewModel(() => new Promise(() => {}))} onCall={onCall} destinations={{}} />);
    fireEvent.click(screen.getByLabelText('Call 112, Emergency'));
    fireEvent.click(screen.getByLabelText('Call 14416, Tele-MANAS, mental health, 24×7'));
    expect(onCall.mock.calls).toEqual([['112'], ['14416']]);
    expect(screen.getByLabelText('Loading published prices')).toBeTruthy();
  });

  it('shows the helplines and a retry when the catalog fails, and no prices', async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error('HTTP 503')).mockResolvedValue([row]);
    const vm = await loaded(list);
    render(<LandingNativeView viewModel={vm} onCall={vi.fn()} destinations={{}} />);
    expect(screen.getByLabelText('Call 112, Emergency')).toBeTruthy();
    expect(screen.getByText('Prices could not be loaded.')).toBeTruthy();
    expect(screen.queryByText(/₹/)).toBeNull();
    fireEvent.click(screen.getByLabelText('Try again'));
    expect(await screen.findByText('₹299')).toBeTruthy();
  });

  it('draws the real published price and MRP', async () => {
    render(<LandingNativeView viewModel={await loaded(async () => [row])} onCall={vi.fn()} destinations={{}} />);
    expect(screen.getByText('Vitamin D3 60K')).toBeTruthy();
    expect(screen.getByText('₹299')).toBeTruthy();
    expect(screen.getByText('₹399')).toBeTruthy();
  });

  it('says so when nothing is published', async () => {
    render(<LandingNativeView viewModel={await loaded(async () => [])} onCall={vi.fn()} destinations={{}} />);
    expect(screen.getByText('Nothing is published in the catalog yet.')).toBeTruthy();
  });

  it('draws only the destinations a platform provides', async () => {
    const vaccines = vi.fn();
    render(<LandingNativeView viewModel={await loaded(async () => [])} onCall={vi.fn()} destinations={{ vaccines }} />);
    fireEvent.click(screen.getByLabelText('Find a vaccine near you'));
    expect(vaccines).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('Create your account')).toBeNull();
    expect(screen.queryByLabelText('Sign in')).toBeNull();
  });
});

const NATIVE_FILES = [
  'landingNativeKit.tsx', 'LandingNativeView.tsx', 'LandingCampusNativeView.tsx', 'LandingClinicianNativeView.tsx',
  'LandingLabTestsNativeView.tsx', 'LandingPartnershipsNativeView.tsx',
].map(name => [name, readFileSync(join(process.cwd(), 'src/features/landing/views', name), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')] as const);

describe('every native landing page', () => {
  it.each(NATIVE_FILES)('%s uses tokens, not raw colours', (_name, code) => {
    expect(code).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it.each(NATIVE_FILES)('%s carries none of the claims 8928175 removed', (_name, code) => {
    expect(code).not.toMatch(/ABHA|NABL|NMC[- ]verified|App Store|Google Play|% OFF|\bleft in stock|certified|compliant|90%|within \d+ (minutes|hours)|24 ?h\b/i);
  });
});

describe('LandingCampusNativeView', () => {
  it('states that cohort reporting does not exist, and quotes no threshold', () => {
    const { container } = render(<LandingCampusNativeView destinations={{}} />);
    expect(screen.getByText('Cohort reporting does not exist yet.')).toBeTruthy();
    expect(container.textContent).not.toMatch(/under \d+ students|k ?[>=]/i);
  });
});

describe('LandingClinicianNativeView', () => {
  it('calls nobody verified and publishes no commission', () => {
    const { container } = render(<LandingClinicianNativeView destinations={{ signIn: vi.fn() }} />);
    expect(screen.getByText('Two things we are not claiming yet.')).toBeTruthy();
    expect(container.textContent).not.toMatch(/Verified clinical|NMC-verified|\d+% of/i);
    expect(screen.getAllByLabelText('Sign in')).toHaveLength(2);
    expect(screen.queryByLabelText(/Apply/)).toBeNull();
  });
});

describe('LandingLabTestsNativeView', () => {
  it('shows real lab rows and the helplines, and names the cold chain it does not track', async () => {
    const lab: LandingCatalogItem = { ...row, id: 'l1', kind: 'lab', name: 'Complete Blood Count' };
    const vm = new LandingViewModel(async () => [lab], { kind: 'lab', limit: 12 });
    await vm.load();
    render(<LandingLabTestsNativeView viewModel={vm} onCall={vi.fn()} destinations={{}} />);
    expect(screen.getByText('Complete Blood Count')).toBeTruthy();
    expect(screen.getByText('What we do not track yet.')).toBeTruthy();
    expect(screen.getByLabelText('Call 112, Emergency')).toBeTruthy();
  });

  it('asks the catalog for lab tests only', async () => {
    const list = vi.fn().mockResolvedValue([]);
    await new LandingViewModel(list, { kind: 'lab', limit: 12 }).load();
    expect(list).toHaveBeenCalledWith({ kind: 'lab', limit: 12 });
  });
});

describe('LandingPartnershipsNativeView', () => {
  it('keeps send disabled until consent is ticked, then sends and confirms without promising a reply time', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const vm = new PartnershipEnquiryViewModel(send);
    const { container } = render(<LandingPartnershipsNativeView viewModel={vm} destinations={{}} />);
    fireEvent.change(screen.getByLabelText('Organisation, required'), { target: { value: 'Nizam Diagnostics' } });
    fireEvent.change(screen.getByLabelText('Email, required'), { target: { value: 'ops@nizam.example' } });
    fireEvent.click(screen.getByLabelText('Pharmacy'));
    fireEvent.click(screen.getByLabelText('Send application'));
    expect(send).not.toHaveBeenCalled();
    const consent = screen.getByRole('checkbox');
    expect(consent.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(consent);
    fireEvent.click(screen.getByLabelText('Send application'));
    expect(await screen.findByText('Your enquiry is with our team.')).toBeTruthy();
    expect(send.mock.calls[0][0].message).toContain('Pharmacy');
    expect(container.textContent).not.toMatch(/within (a|\d+) (day|week|hour)/i);
  });

  it('shows the error and keeps the form when sending fails', async () => {
    const vm = new PartnershipEnquiryViewModel(vi.fn().mockRejectedValue(new Error('This is on our side, not yours.')));
    vm.setOrganization('Nizam');
    vm.setEmail('ops@nizam.example');
    vm.toggleConsent();
    render(<LandingPartnershipsNativeView viewModel={vm} destinations={{}} />);
    fireEvent.click(screen.getByLabelText('Send application'));
    expect(await screen.findByText('This is on our side, not yours.')).toBeTruthy();
    expect(screen.getByLabelText('Organisation, required')).toBeTruthy();
  });
});
