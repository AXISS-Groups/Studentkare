import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StatRow } from '../DataTable';
import { PartnerKpis } from '@/features/partner/PartnerPage';

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

/**
 * Live-run audit #10 (axe dlitem): `role="group"` on the <dl> replaced its list
 * semantics, so every <dt>/<dd> sat outside a list. The group, with its name,
 * now wraps the <dl>, which keeps no role.
 */
describe('stat lists keep their description-list semantics', () => {
  it('StatRow: a named group around a plain <dl>', () => {
    render(<StatRow label="Accounts summary" stats={[{ label: 'Students', value: '12' }]} />);
    const group = screen.getByRole('group', { name: 'Accounts summary' });
    const list = group.querySelector('dl');
    expect(list).not.toBeNull();
    expect(list).not.toHaveAttribute('role');
    expect(within(group).getByText('Students').tagName).toBe('DT');
  });

  it('PartnerKpis: the same', () => {
    render(<PartnerKpis label="This month" items={[{ id: 'gross', label: 'Gross', value: null }]} />);
    const group = screen.getByRole('group', { name: 'This month' });
    expect(group.querySelector('dl')).not.toHaveAttribute('role');
  });

  it('no label: just the list, no group', () => {
    const { container } = render(<StatRow stats={[{ label: 'Students', value: '12' }]} />);
    expect(container.firstElementChild?.tagName).toBe('DL');
    expect(screen.queryByRole('group')).toBeNull();
  });
});
