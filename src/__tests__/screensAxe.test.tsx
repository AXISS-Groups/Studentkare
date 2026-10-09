import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations, describeViolations } from '@/test/axe';

vi.mock('@/modules/m16-checkout/platform/CheckoutStoragePort', () => ({
  CheckoutStoragePort: { getCachedCart: async () => [], setCachedCart: async () => undefined, clearCachedCart: async () => undefined },
}));

import { IdentityVerifyPanel } from '@/features/auth/views/IdentityVerifyPanel';
import { IdentityVerifyViewModel } from '@/features/auth/viewmodel/IdentityVerifyViewModel';
import { AppointmentBookingNativeView } from '@/features/appointments/views/AppointmentBookingNativeView';
import { AppointmentBookingViewModel } from '@/features/appointments/viewmodel/AppointmentBookingViewModel';
import { PrescribeView } from '@/screens/clinician/NMCDoctorEPrescriptionScreen';
import { PrescribeViewModel } from '@/features/clinician/viewmodel/PrescribeViewModel';
import { ShopNativeView } from '@/features/marketplace/views/ShopNativeView';
import { ShopViewModel } from '@/features/marketplace/viewmodel/ShopViewModel';
import { HealthVaultNativeView } from '@/features/vault/views/HealthVaultNativeView';
import { HealthVaultViewModel } from '@/features/vault/viewmodel/HealthVaultViewModel';
import { AyushChatNativeView } from '@/features/chat/views/AyushChatNativeView';
import { AyushViewModel } from '@/features/chat/viewmodel/AyushViewModel';
import { TeleconsultNativeView } from '@/features/teleconsult/views/TeleconsultNativeView';

type Requester = typeof import('@/data/http').apiRequest;
const api = (routes: Record<string, unknown>) => (async (path: string) => {
  const key = Object.keys(routes).find((k) => path.startsWith(k));
  if (!key) throw new Error(`unexpected ${path}`);
  return routes[key];
}) as unknown as Requester;

async function expectAccessible(ui: React.ReactElement) {
  const { container } = render(<main>{ui}</main>);
  await screen.findAllByText(/./);
  const violations = await axeViolations(container);
  expect(violations, describeViolations(violations)).toEqual([]);
}

describe('screens built in the remediation pass are accessible', () => {
  it('identity verify', async () => {
    const vm = new IdentityVerifyViewModel(api({ '/identity': { campusStatus: 'PENDING' } }));
    await vm.load();
    await expectAccessible(<IdentityVerifyPanel viewModel={vm} links={{ back: () => undefined, openCampusVerification: () => undefined }} />);
  });

  it('appointment booking', async () => {
    const vm = new AppointmentBookingViewModel(api({
      '/catalog': { items: [{ id: 'c1', name: 'Consult', brand: 'Clinic', pricePaise: 19900 }] },
      '/appointments/availability': { slots: [{ id: 's1', slotStart: '2026-10-12T09:00', slotEnd: '', capacity: 1, booked: 0, available: 1 }] },
    }));
    await vm.load();
    await vm.selectService('c1');
    await expectAccessible(<AppointmentBookingNativeView viewModel={vm} />);
  });

  it('e-prescription writer', async () => {
    const vm = new PrescribeViewModel(api({ '/work/appointments': { items: [{ id: 'a', patientId: 'p', customer: 'Asha', slotStart: '2026-10-08', status: 'CONFIRMED' }] } }));
    await vm.loadPatients();
    await expectAccessible(<PrescribeView vm={vm} />);
  });

  it('shop', async () => {
    const vm = new ShopViewModel(api({ '/catalog': { items: [{ id: 'x', kind: 'product', name: 'ORS', brand: 'B', pack: '1', pricePaise: 2000, mrpPaise: 2000, stock: 4, requiresPrescription: false }] } }));
    await vm.load();
    await expectAccessible(<ShopNativeView viewModel={vm} links={{ openCart: () => undefined }} />);
  });

  it('health records', async () => {
    const vm = new HealthVaultViewModel(api({ '/health/documents': { items: [{ id: 'd', title: 'CBC', category: 'LAB', createdAt: 1 }] }, '/records/shares': { items: [] } }));
    await vm.load();
    await expectAccessible(<HealthVaultNativeView viewModel={vm} />);
  });

  it('Ask Ayush', async () => {
    await expectAccessible(<AyushChatNativeView viewModel={new AyushViewModel(api({}))} />);
  });

  it('video consult', async () => {
    await expectAccessible(<TeleconsultNativeView links={{ bookAppointment: () => undefined }} />);
  });
});
