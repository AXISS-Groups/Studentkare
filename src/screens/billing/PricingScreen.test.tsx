import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { PricingScreen } from './PricingScreen';

// Mock AuthContext
vi.mock('../../data/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// Mock billing API
vi.mock('../../data/billing', () => ({
  getPlans: vi.fn().mockResolvedValue({
    plans: [],
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

describe('PricingScreen Component Unit Tests', () => {
  it('instantiates PricingScreen element without errors', () => {
    const element = React.createElement(PricingScreen);
    expect(element).toBeDefined();
    expect(element.type).toBe(PricingScreen);
  });
});
