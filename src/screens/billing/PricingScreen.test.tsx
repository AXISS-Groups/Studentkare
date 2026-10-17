import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PricingScreen } from './PricingScreen';
import { openSubscriptionCheckout } from '../../data/billing';
import { apiRequest } from '../../data/http';

// Mock AuthContext: a signed-in student, so a Student Plus click would start checkout.
vi.mock('../../data/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', fullName: 'Test', email: 't@example.com', phone: '' } }),
}));

// Mock billing API: the server's plan list carries the Student Plus price.
vi.mock('../../data/billing', () => ({
  getPlans: vi.fn().mockResolvedValue({
    plans: [{ id: 'STUDENT_PLUS', name: 'Student Plus', price: 99, period: 'per month', audience: '', benefits: [], description: '' }],
    checkoutAvailable: true,
    publicKey: 'mock_key',
  }),
  openSubscriptionCheckout: vi.fn(),
}));

// Mock http API
vi.mock('../../data/http', () => ({
  apiRequest: vi.fn(),
}));

// Mock workflowRouting
vi.mock('../../lib/workflowRouting', () => ({
  navigate: vi.fn(),
}));

vi.mock('../../lib/posthog', () => ({ posthogCapture: vi.fn() }));
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
    expect(await screen.findByText(/₹99 per month/)).toBeTruthy();
    expect(screen.queryByText(/most popular/i)).toBeNull();
  });

  it('makes no pharmacist-verification claim', async () => {
    render(<PricingScreen />);
    await screen.findByText(/₹99 per month/);
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
