import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const apiRequest = vi.fn();
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: (...args: unknown[]) => apiRequest(...args) }));

import { ACCESS_FIELDS, CampusAccessRequestsScreen } from '../CampusAccessRequestsScreen';

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
afterEach(() => { apiRequest.mockReset(); setOnline(true); });

describe('CampusAccessRequestsScreen (no consent-request backend)', () => {
  it('shows the list as not connected, with no sample request', async () => {
    const { container } = render(<CampusAccessRequestsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Access requests' })).toBeInTheDocument();
    expect(screen.getByText('Access requests aren’t connected yet')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Rohan|Diya|24B81A|Priya Rao|Approved · 14 days/);
    expect(apiRequest).not.toHaveBeenCalled();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('the new-request drawer offers only the coarse field allow-list and fails closed', async () => {
    render(<CampusAccessRequestsScreen />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'New request' })); });
    const drawer = screen.getByRole('dialog', { name: 'New access request' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    const boxes = within(drawer).getAllByRole('checkbox');
    expect(boxes).toHaveLength(ACCESS_FIELDS.length);
    expect(within(drawer).getByRole('checkbox', { name: /Vaccination status/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(drawer).getByRole('checkbox', { name: /Allergies/ }));
    expect(within(drawer).getByRole('checkbox', { name: /Allergies/ })).toHaveAttribute('aria-checked', 'true');
    // No free-text field and no invented expiry choice.
    expect(within(drawer).queryByRole('textbox')).toBeNull();
    expect(drawer.textContent).not.toMatch(/\d+ days|\d+ hours/);
    const send = within(drawer).getByRole('button', { name: /Send request to student/ });
    expect(send).toBeDisabled();
    fireEvent.submit(send.closest('form') as HTMLFormElement);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('disables a new request while offline and says the page is read-only', () => {
    setOnline(false);
    render(<CampusAccessRequestsScreen />);
    expect(screen.getByRole('button', { name: 'New request' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
  });
});
