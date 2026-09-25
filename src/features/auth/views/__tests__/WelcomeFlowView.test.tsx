import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WelcomeFlowView } from '../WelcomeFlowView';
import { WELCOME_SLIDES } from '../welcomeSlides';

const navigate = vi.fn();
vi.mock('@/core/navigation', () => ({ useNavigate: () => navigate }));

beforeEach(() => navigate.mockReset());

describe('the pre-account entry', () => {
  it('opens on the splash, not the intro', () => {
    render(<WelcomeFlowView />);
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
    expect(screen.queryByText(WELCOME_SLIDES[0].title)).toBeNull();
  });

  it('Get started leads into the intro', () => {
    // Before this, the carousel had no entry point anywhere in the app.
    render(<WelcomeFlowView />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(WELCOME_SLIDES[0].title);
  });

  it('a returning student skips the intro entirely', () => {
    render(<WelcomeFlowView />);
    fireEvent.click(screen.getByRole('button', { name: /already have an account/i }));
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(screen.queryByText(WELCOME_SLIDES[0].title)).toBeNull();
  });

  it('runs the whole way through to sign-in', () => {
    render(<WelcomeFlowView />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('keeps emergency help reachable on the first screen', () => {
    render(<WelcomeFlowView />);
    expect(screen.getByRole('link', { name: /call 112/i })).toHaveAttribute('href', 'tel:112');
  });
});
