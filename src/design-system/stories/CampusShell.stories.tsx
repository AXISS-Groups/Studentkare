import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CampusShell } from '..';
import type { CampusNavId } from '..';

const meta = { title: 'Design system/Campus shell' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const noop = () => undefined;
const scopes = [{ id: 'campus', label: 'Whole campus', meta: 'Every student verified at your campus' }];

function Shell({ current = 'overview', topBar = true, signedInAs = 'campus' }: { current?: CampusNavId | null; topBar?: boolean; signedInAs?: 'campus' | 'super' }) {
  const [scope, setScope] = useState('campus');
  const superAdmin = signedInAs === 'super';
  return (
    <CampusShell
      current={current}
      identity={{ fullName: 'Priya Rao', initials: 'PR', roleLabel: superAdmin ? 'Super admin' : 'Campus admin' }}
      roleLine={superAdmin ? 'Super admin · all campuses' : 'Campus admin · VNR VJIET'}
      campusLabel={superAdmin ? 'All campuses' : 'VNR VJIET'}
      scopes={scopes}
      scope={scope}
      onScopeChange={setScope}
      scopeNote="Hostel blocks and day scholars appear here once blocks are set up and connected."
      counts={{ verification: 14, sos: 1 }}
      twoFactorOn
      unreadNotifications={3}
      topBar={topBar}
      onNavigate={noop}
      onSignOut={noop}
    >
      <p>Page content</p>
    </CampusShell>
  );
}

/** Overview selected, live badges, 2FA reported, unread notifications. */
export const Overview: Story = { render: () => <Shell /> };

/** A board drawn without the top bar on the canvas (SLA escalation). */
export const SidebarOnly: Story = { render: () => <Shell current="sla" topBar={false} /> };

/** A page outside the sidebar (notifications): nothing is selected. */
export const NothingSelected: Story = { render: () => <Shell current={null} /> };

/** The super admin opening a campus board. */
export const SuperAdmin: Story = { render: () => <Shell current="reports" signedInAs="super" /> };
