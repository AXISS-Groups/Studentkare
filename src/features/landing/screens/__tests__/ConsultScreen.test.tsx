import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const auth: { user: { role: string } | null } = { user: null };
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/screens/workspace/WorkspaceScreen', () => ({ WorkspaceScreen: ({ route }: { route: string }) => <p>workspace:{route}</p> }));
vi.mock('../../views/LandingConsultView', () => ({ LandingConsultView: () => <p>public consult page</p> }));

import { ConsultScreen } from '../ConsultScreen';

describe('/consult (live-run audit #14)', () => {
  it('a signed-in student books in the workspace, not on the public page', async () => {
    auth.user = { role: 'STUDENT' };
    render(<ConsultScreen />);
    expect(await screen.findByText('workspace:appointments')).toBeInTheDocument();
    expect(screen.queryByText('public consult page')).toBeNull();
  });

  it('everyone else gets the public page', () => {
    auth.user = null;
    render(<ConsultScreen />);
    expect(screen.getByText('public consult page')).toBeInTheDocument();
  });
});
