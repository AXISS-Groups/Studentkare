import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsoleTopbar } from '@/design-system/console-shell/ConsoleShell';
import { axeViolations, describeViolations } from '@/test/axe';
import { VENDOR_NAVIGATION } from '@/screens/vendor/vendorNavigation';
import { partnerHasItem } from '@/screens/vendor/partnerAccess';

// The "Team account" badge appears only for a session the server marks as a team
// account, in the console header; and a wellness centre gets a clinic's console tools.

let user: { isTeamAccount?: boolean } | null = null;
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user }) }));

import { TeamBadge } from '../TeamBadge';

const topbar = () => render(<ConsoleTopbar title="Today" badge={<TeamBadge />} />);

describe('Team account badge', () => {
  it('shows in the console header for a team account', async () => {
    user = { isTeamAccount: true };
    const { container } = topbar();
    expect(screen.getByText('Team account')).toBeInTheDocument();
    expect(container.querySelector('header .sk-team-badge [data-icon="users"]')).not.toBeNull();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('is absent for a person’s own login and for an older server', () => {
    user = { isTeamAccount: false };
    topbar();
    expect(screen.queryByText('Team account')).toBeNull();
    user = {};
    topbar();
    expect(screen.queryByText('Team account')).toBeNull();
  });
});

describe('Wellness centre partner', () => {
  const items = VENDOR_NAVIGATION.flatMap(group => group.items);
  const has = (label: string, kind: 'CLINIC' | 'WELLNESS') => partnerHasItem(items.find(item => item.label === label)!, kind);

  it('gets the same console items as a clinic', () => {
    for (const item of items) expect(partnerHasItem(item, 'WELLNESS'), item.label).toBe(partnerHasItem(item, 'CLINIC'));
    expect(has('Orders', 'WELLNESS')).toBe(true);
  });
});
