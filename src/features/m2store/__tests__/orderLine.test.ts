import { afterEach, describe, expect, it, vi } from 'vitest';

const stored = vi.hoisted(() => ({ value: '' }));
vi.mock('@/data/services/config', () => ({ getSetting: () => stored.value }));

import { orderLinePhone } from '../data/orderLine';

afterEach(() => { stored.value = ''; });

describe('order line (settings registry shop.order_line_phone)', () => {
  it('is unavailable until configured', () => {
    expect(orderLinePhone()).toBeNull();
  });

  it('dials only a plain phone number, never another URL', () => {
    stored.value = '+91 40 2345-6789';
    expect(orderLinePhone()).toBe('+914023456789');
    stored.value = 'javascript:alert(1)';
    expect(orderLinePhone()).toBeNull();
    stored.value = '12';
    expect(orderLinePhone()).toBeNull();
  });
});
