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

describe('CareScreen: who gets the student workspace', () => {
  // Above phone width the workspace draws the student web shell (WP-08); at phone
  // width it draws the phone boards in the student phone frame (WP-04).
  it.each([
    { path: 'shop', phone: false }, { path: 'checkout', phone: false },
    { path: 'shop', phone: true }, { path: 'checkout', phone: true },
  ])('a signed-in student gets /$path in the workspace (phone: $phone)', async ({ path, phone }) => {
    Object.assign(state, { role: 'STUDENT', phone, path });
    render(<CareScreen />);
    expect(await screen.findByText(`student shell ${path}`)).toBeInTheDocument();
  });

  it('visitors, other roles and /care keep the public marketplace', () => {
    for (const next of [{ role: null, phone: false, path: 'shop' }, { role: 'VENDOR', phone: false, path: 'shop' }, { role: 'VENDOR', phone: true, path: 'shop' }, { role: 'STUDENT', phone: false, path: 'care' }, { role: 'STUDENT', phone: true, path: 'care' }]) {
      Object.assign(state, next);
      const { unmount } = render(<CareScreen />);
      expect(screen.getByText('public marketplace')).toBeInTheDocument();
      unmount();
    }
  });
});
