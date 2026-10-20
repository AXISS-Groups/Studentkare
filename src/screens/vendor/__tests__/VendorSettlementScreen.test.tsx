import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { VendorSettlementScreen } from '../VendorSettlementScreen';

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'acct-1', fullName: 'Campus Pharmacy', role: 'VENDOR', partnerKind: 'PHARMACY' } }) }));

describe('VendorSettlement — not connected', () => {
  it('shows the designed layout with every money figure as "—" and no sample amounts', () => {
    render(<VendorSettlementScreen now={new Date(2026, 8, 15)} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Earnings & settlement' })).toBeInTheDocument();
    expect(screen.getByText('Campus Pharmacy · September 2026')).toBeInTheDocument();
    const tiles = screen.getByRole('group', { name: 'This month' });
    for (const label of ['Gross this month', 'Commission', 'Net payable', 'Held']) {
      expect(within(tiles).getByText(label).nextElementSibling).toHaveTextContent('—');
    }
    expect(within(tiles).getAllByText('Not connected')).toHaveLength(4);
    for (const fake of [/₹48,015/, /₹9,603/, /20%/, /UCO Bank/, /96%/]) expect(screen.queryByText(fake)).toBeNull();
    expect(screen.getByText('Settlement isn’t connected yet.')).toBeInTheDocument();
  });

  it('offers no statement to download', () => {
    render(<VendorSettlementScreen />);
    expect(screen.getByRole('button', { name: /Download statement/ })).toBeDisabled();
  });
});
