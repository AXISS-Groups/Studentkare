import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PricingScreen } from './PricingScreen';
import { openSubscriptionCheckout } from '../../data/datasets/billing';
import { rupeeAmount } from '../../data/datasets/billingPrices';
import { apiRequest } from '../../data/services/http';
import { publicSettingDefaults } from '../../generated/settings';

// The prices are the settings registry's, exactly as the server's plan list sends them.
const PLUS = publicSettingDefaults['billing.student_plus.monthly_inr'];
const QUARTER = publicSettingDefaults['billing.student_plus.quarter_package_inr'];
const PREMIUM = publicSettingDefaults['billing.premium.from_monthly_inr'];

// Mock AuthContext: a signed-in student, so a Student Plus click would start checkout.
vi.mock('../../data/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', fullName: 'Test', email: 't@example.com', phone: '' } }),
}));

// Mock billing API: the server's plan list carries the Student Plus price.
vi.mock('../../data/datasets/billing', async () => {
  const { publicSettingDefaults: prices } = await import('../../generated/settings');
  return {
    getPlans: vi.fn().mockResolvedValue({
      plans: [
        { id: 'STUDENT_PLUS', name: 'Student Plus', price: prices['billing.student_plus.monthly_inr'], priceFrom: false, period: 'per month', audience: '', benefits: [], description: '',
          packages: [{ id: 'QUARTER', months: 3, price: prices['billing.student_plus.quarter_package_inr'] }] },
        { id: 'PREMIUM', name: 'Premium', price: prices['billing.premium.from_monthly_inr'], priceFrom: true, period: 'per month', audience: 'student', benefits: [], description: '', packages: [] },
      ],
      checkoutAvailable: true,
      publicKey: 'mock_key',
    }),
    openSubscriptionCheckout: vi.fn(),
  };
});

// Mock http API
vi.mock('../../data/services/http', () => ({
  apiRequest: vi.fn(),
}));

// Mock workflowRouting
vi.mock('../../lib/utils/workflowRouting', () => ({
  navigate: vi.fn(),
}));

vi.mock('../../lib/analytics/posthog', () => ({ posthogCapture: vi.fn() }));
vi.mock('../../components/health/EmergencyBar', () => ({ EmergencyBar: () => null }));

// jsdom has no <dialog> methods; ShopDialog calls them.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) { this.removeAttribute('open'); };

describe('PricingScreen Component Unit Tests', () => {
  it('instantiates PricingScreen element without errors', () => {
    const element = React.createElement(PricingScreen);
    expect(element).toBeDefined();
    expect(element.type).toBe(PricingScreen);
  });

  it('shows the server price for Student Plus and no invented popularity', async () => {
    render(<PricingScreen />);
    expect(await screen.findByText(`${rupeeAmount(PLUS)} per month`)).toBeTruthy();
    expect(screen.getByText(`3-month package: ${rupeeAmount(QUARTER)}`)).toBeTruthy();
    expect(screen.queryByText(/most popular/i)).toBeNull();
  });

  it('shows Premium as a starting price and does not sell it', async () => {
    render(<PricingScreen />);
    expect(await screen.findByText(`from ${rupeeAmount(PREMIUM)} per month`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /PREMIUM/ }));
    expect(await screen.findByText(/Premium is not sold online yet/)).toBeTruthy();
    expect(vi.mocked(apiRequest)).not.toHaveBeenCalled();
  });

  it('makes no pharmacist-verification claim', async () => {
    render(<PricingScreen />);
    await screen.findByText(`${rupeeAmount(PLUS)} per month`);
    for (const question of screen.getAllByRole('button', { expanded: false })) fireEvent.click(question);
    expect(document.body.textContent ?? '').not.toMatch(/pharmacist/i);
  });

  it('the proposed gift card does not start the viewer’s own checkout', async () => {
    render(<PricingScreen />);
    fireEvent.click(await screen.findByRole('button', { name: /GIFT A FRIEND/ }));
    expect(await screen.findByText(/Gifting is proposed and not available yet/)).toBeTruthy();
    expect(vi.mocked(apiRequest)).not.toHaveBeenCalled();
    expect(vi.mocked(openSubscriptionCheckout)).not.toHaveBeenCalled();
  });
});
