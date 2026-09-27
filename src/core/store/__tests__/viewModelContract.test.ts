import { describe, expect, it, vi } from 'vitest';
import { isObservable } from 'mobx';

/**
 * Every ViewModel must be constructible and observable.
 *
 * This is the test that did not exist. `AutoObservableViewModel` called
 * `makeAutoObservable(this)` from a class that extended `ViewModel`, and MobX
 * rejects that outright — "can only be used for classes that don't have a
 * superclass". So every one of these threw the moment it was constructed, and
 * nothing caught it because none of them had a test that built one.
 */

// Several fetch on construction. Keep the network out of it.
vi.mock('@/data/http', () => ({ apiRequest: vi.fn().mockRejectedValue(new Error('offline')) }));

import { AppointmentBookingViewModel } from '@/features/appointments/viewmodel/AppointmentBookingViewModel';
import { CartCheckoutViewModel } from '@/features/checkout/viewmodel/CartCheckoutViewModel';
import { DigitalIdViewModel } from '@/features/digital_id/viewmodel/DigitalIdViewModel';
import { EmergencySosViewModel } from '@/features/emergency/viewmodel/EmergencySosViewModel';
import { HealthVaultViewModel } from '@/features/vault/viewmodel/HealthVaultViewModel';
import { IncidentTriageViewModel } from '@/features/incidents/viewmodel/IncidentTriageViewModel';
import { LifeShareViewModel } from '@/features/lifeshare/viewmodel/LifeShareViewModel';
import { MarketplaceViewModel } from '@/features/marketplace/viewmodel/MarketplaceViewModel';
import { MedicalScannerViewModel } from '@/features/scanners/viewmodel/MedicalScannerViewModel';
import { NotificationViewModel } from '@/features/notifications/viewmodel/NotificationViewModel';
import { TeleconsultViewModel } from '@/features/teleconsult/viewmodel/TeleconsultViewModel';
import { RewardsViewModel } from '@/modules/m20-rewards/viewmodel/RewardsViewModel';

const VIEW_MODELS = [
  ['AppointmentBooking', () => new AppointmentBookingViewModel()],
  ['CartCheckout', () => new CartCheckoutViewModel()],
  ['DigitalId', () => new DigitalIdViewModel()],
  ['EmergencySos', () => new EmergencySosViewModel()],
  ['HealthVault', () => new HealthVaultViewModel()],
  ['IncidentTriage', () => new IncidentTriageViewModel()],
  ['LifeShare', () => new LifeShareViewModel()],
  ['Marketplace', () => new MarketplaceViewModel()],
  ['MedicalScanner', () => new MedicalScannerViewModel()],
  ['Notification', () => new NotificationViewModel()],
  ['Teleconsult', () => new TeleconsultViewModel()],
  ['Rewards', () => new RewardsViewModel()],
] as const;

describe.each(VIEW_MODELS)('%s ViewModel', (_name, build) => {
  it('can be constructed', () => {
    expect(build).not.toThrow();
  });

  it('is observable, so a view bound to it actually re-renders', () => {
    // Constructing without throwing is not enough: if the instance is not
    // observable, every screen bound to it silently stops updating.
    expect(isObservable(build())).toBe(true);
  });

  it('honours the ViewModel contract', () => {
    const viewModel = build();
    expect(typeof viewModel.reset).toBe('function');
    expect(typeof viewModel.dispose).toBe('function');
  });

  it('resets and disposes without throwing', () => {
    const viewModel = build();
    expect(() => viewModel.reset()).not.toThrow();
    expect(() => viewModel.dispose()).not.toThrow();
  });
});
