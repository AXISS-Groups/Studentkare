import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoggedOutView } from '../LoggedOutView';

const navigate = vi.fn();
vi.mock('@/core/navigation', () => ({ useNavigate: () => navigate }));

/** Draw the phone board (≤430 px) or the web board. */
function at(width: 'phone' | 'web') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width === 'phone' && query.includes('max-width'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => navigate.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe.each(['phone', 'web'] as const)('after signing out (%s board)', (width) => {
  beforeEach(() => at(width));

  it('confirms the session ended, and only that', () => {
    const { container } = render(<LoggedOutView />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/logged out/i);
    expect(screen.getByRole('status')).toHaveTextContent(/nothing in your records was changed/i);
    expect(container.querySelector('[data-icon="check-circle"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="check"]')).not.toBeNull();
  });

  it('offers the way back', () => {
    render(<LoggedOutView />);
    fireEvent.click(screen.getByRole('button', { name: /log in again/i }));
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('keeps emergency help one tap away, with no session', () => {
    // A student in trouble is not going to sign in first.
    render(<LoggedOutView />);
    expect(screen.getByRole('link', { name: /call 112/i })).toHaveAttribute('href', 'tel:112');
  });

  it('shows the feedback scale switched off, because there is nowhere to send it', () => {
    const { container } = render(<LoggedOutView />);
    expect(screen.getByRole('heading', { name: /we value your feedback/i })).toBeInTheDocument();
    for (const tile of ['chat-alt--p4', 'heart--p1', 'chart-alt--p4']) {
      expect(container.querySelector(`[data-icon="3d:${tile}"]`)).not.toBeNull();
    }
    const scores = screen.getAllByRole('button', { name: /^(10|[0-9])$/ });
    expect(scores).toHaveLength(11);
    for (const score of scores) expect(score).toBeDisabled();
    expect(screen.getByText(/isn.t connected yet/i)).toBeInTheDocument();
  });

  it('moves the When you’re back cards only when asked', () => {
    render(<LoggedOutView />);
    expect(screen.getByRole('heading', { name: 'Your records go where you go' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show slide 2/i }));
    expect(screen.queryByRole('heading', { name: 'Your records go where you go' })).toBeNull();
  });

  it('sends each card to a real public page', () => {
    render(<LoggedOutView />);
    fireEvent.click(screen.getByRole('button', { name: 'How it works' }));
    expect(navigate).toHaveBeenCalledWith('/landing');
  });

  it('names every control', () => {
    render(<LoggedOutView />);
    for (const control of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
      expect(control).toHaveAccessibleName();
    }
  });
});

describe('what it must not claim', () => {
  beforeEach(() => at('web'));

  it('does not promise that anything was wiped from the device', () => {
    // Signing out clears the session and nothing else. The design's line about
    // an offline emergency card being removed would be a security assurance
    // this app does not keep.
    const { container } = render(<LoggedOutView />);
    expect(container.textContent).not.toMatch(/removed from this phone|wiped|erased|deleted from|works offline/i);
  });

  it('claims no ABHA link, no wait time and no invented price', () => {
    for (const width of ['phone', 'web'] as const) {
      at(width);
      const { container, unmount } = render(<LoggedOutView />);
      for (const n of [1, 2, 3, 4]) {
        const dot = screen.queryByRole('button', { name: new RegExp(`show slide ${n} `, 'i') });
        if (dot) fireEvent.click(dot);
        expect(container.textContent).not.toMatch(/ABHA|20 minutes|₹199|24 hours|two taps|up to 5/i);
      }
      unmount();
    }
  });

  it('draws the web board with the shared-computer note and the legal links', () => {
    const { container } = render(<LoggedOutView />);
    expect(screen.getByText(/shared or lab computer/i)).toBeInTheDocument();
    expect(container.querySelector('[data-icon="monitor"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Privacy' }));
    expect(navigate).toHaveBeenCalledWith('/privacy');
  });
});
