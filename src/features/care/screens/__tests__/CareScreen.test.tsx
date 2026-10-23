import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CareScreen } from '../CareScreen';

const state = vi.hoisted(() => ({ role: null as string | null, phone: false, path: 'shop' }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.role ? { role: state.role } : null }) }));
vi.mock('@/design-system/navigation/usePhoneFrame', () => ({ usePhoneFrame: () => state.phone }));
vi.mock('@/core/navigation', () => ({ useRoutePath: () => state.path }));
vi.mock('@/screens/marketplace/LiveMarketplaceScreen', () => ({ LiveMarketplaceScreen: () => <p>public marketplace</p> }));
vi.mock('@/features/studentweb/views/shop/PublicShopPage', () => ({ PublicShopPage: ({ route, signedIn }: { route: string; signedIn: boolean }) => <p>public m2 shop {route} {signedIn ? 'signed in' : 'signed out'}</p> }));
vi.mock('@/screens/workspace/WorkspaceScreen', () => ({ WorkspaceScreen: ({ route }: { route: string }) => <p>student shell {route}</p> }));

describe('CareScreen: who gets the student workspace', () => {
  // Above phone width the workspace draws the student web shell (WP-08); at phone
  // width it draws the phone boards in the student phone frame (WP-04).
  it.each([
    { path: 'shop', phone: false }, { path: 'checkout', phone: false },
    { path: 'shop', phone: true }, { path: 'checkout', phone: true },
    // Mobile 2.0 Doctor consults (M2Consults): the phone board, and above phone width the
    // student shell (its own "Doctors" link must not open another site's header).
    { path: 'care', phone: true }, { path: 'care', phone: false },
  ])('a signed-in student gets /$path in the workspace (phone: $phone)', async ({ path, phone }) => {
    Object.assign(state, { role: 'STUDENT', phone, path });
    render(<CareScreen />);
    expect(await screen.findByText(`student shell ${path}`)).toBeInTheDocument();
  });

  it('visitors and other roles get the Mobile 2.0 web shop in the public frame, at any width', async () => {
    for (const next of [
      { role: null, phone: false, path: 'shop', text: 'public m2 shop shop signed out' },
      { role: null, phone: true, path: 'shop', text: 'public m2 shop shop signed out' },
      { role: 'VENDOR', phone: false, path: 'shop', text: 'public m2 shop shop signed in' },
      { role: 'VENDOR', phone: true, path: 'checkout', text: 'public m2 shop checkout signed in' },
    ]) {
      Object.assign(state, next);
      const { unmount } = render(<CareScreen />);
      expect(await screen.findByText(next.text)).toBeInTheDocument();
      unmount();
    }
  });

  it('/care keeps the public marketplace for visitors and other roles', () => {
    for (const next of [{ role: null, phone: false, path: 'care' }, { role: null, phone: true, path: 'care' }, { role: 'VENDOR', phone: false, path: 'care' }]) {
      Object.assign(state, next);
      const { unmount } = render(<CareScreen />);
      expect(screen.getByText('public marketplace')).toBeInTheDocument();
      unmount();
    }
  });
});
