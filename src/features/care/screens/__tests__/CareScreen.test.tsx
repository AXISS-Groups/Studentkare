import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CareScreen } from '../CareScreen';

const state = vi.hoisted(() => ({ role: null as string | null, phone: false, path: 'shop' }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.role ? { role: state.role } : null }) }));
vi.mock('@/design-system/navigation/usePhoneFrame', () => ({ usePhoneFrame: () => state.phone }));
vi.mock('@/core/navigation', () => ({ useRoutePath: () => state.path }));
vi.mock('@/screens/marketplace/LiveMarketplaceScreen', () => ({ LiveMarketplaceScreen: () => <p>public marketplace</p> }));
vi.mock('@/screens/workspace/WorkspaceScreen', () => ({ WorkspaceScreen: ({ route }: { route: string }) => <p>student shell {route}</p> }));

describe('CareScreen: who gets the student web shell', () => {
  it.each(['shop', 'checkout'])('a signed-in student above phone width gets /%s in the student shell', async (path) => {
    Object.assign(state, { role: 'STUDENT', phone: false, path });
    render(<CareScreen />);
    expect(await screen.findByText(`student shell ${path}`)).toBeInTheDocument();
  });

  it('visitors, other roles, phones and /care keep the public marketplace', () => {
    for (const next of [{ role: null, phone: false, path: 'shop' }, { role: 'VENDOR', phone: false, path: 'shop' }, { role: 'STUDENT', phone: true, path: 'shop' }, { role: 'STUDENT', phone: false, path: 'care' }]) {
      Object.assign(state, next);
      const { unmount } = render(<CareScreen />);
      expect(screen.getByText('public marketplace')).toBeInTheDocument();
      unmount();
    }
  });
});
