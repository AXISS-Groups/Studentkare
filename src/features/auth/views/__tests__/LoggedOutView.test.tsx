import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoggedOutView } from '../LoggedOutView';

const navigate = vi.fn();
vi.mock('@/core/navigation', () => ({ useNavigate: () => navigate }));

beforeEach(() => navigate.mockReset());

describe('after signing out', () => {
  it('confirms the session ended', () => {
    render(<LoggedOutView />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/signed out/i);
    expect(screen.getByRole('status')).toBeInTheDocument();
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
});

describe('what it must not claim', () => {
  it('does not promise that anything was wiped from the device', () => {
    // Signing out clears the session and nothing else. The design's line about
    // an offline emergency card being removed would be a security assurance
    // this app does not keep.
    const { container } = render(<LoggedOutView />);
    expect(container.textContent).not.toMatch(/removed from this phone|wiped|erased|deleted from/i);
  });

  it('asks for no rating it has nowhere to send', () => {
    render(<LoggedOutView />);
    expect(screen.queryByText(/how likely are you to recommend/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /^(10|[0-9])$/ })).toBeNull();
  });

  it('claims no ABHA link, because there is no ABHA integration', () => {
    const { container } = render(<LoggedOutView />);
    expect(container.textContent).not.toMatch(/ABHA/i);
  });

  it('carries no advertising, and says so', () => {
    // Rule L, stated plainly rather than assumed.
    render(<LoggedOutView />);
    expect(screen.getByText(/no ads, no sponsored offers/i)).toBeInTheDocument();
  });
});

describe('accessibility', () => {
  it('names every control and hides every decorative icon', () => {
    const { container } = render(<LoggedOutView />);
    for (const control of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
      expect(control).toHaveAccessibleName();
    }
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('labels the region by its heading', () => {
    render(<LoggedOutView />);
    expect(screen.getByRole('region', { name: /signed out/i })).toBeInTheDocument();
  });
});
