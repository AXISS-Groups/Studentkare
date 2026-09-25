import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WelcomeCarouselView } from '../WelcomeCarouselView';
import { WELCOME_SLIDES } from '../welcomeSlides';

const navigate = vi.fn();
vi.mock('@/core/navigation', () => ({ useNavigate: () => navigate }));

beforeEach(() => navigate.mockReset());

const heading = () => screen.getByRole('heading', { level: 1 });
const forward = () => screen.getByRole('button', { name: /next|continue/i });
const back = () => screen.getByRole('button', { name: /previous/i });

describe('moving through the intro', () => {
  it('opens on the first slide with no way back', () => {
    render(<WelcomeCarouselView />);
    expect(heading()).toHaveTextContent(WELCOME_SLIDES[0].title);
    expect(screen.queryByRole('button', { name: /previous/i })).toBeNull();
  });

  it('advances one slide at a time', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(forward());
    expect(heading()).toHaveTextContent(WELCOME_SLIDES[1].title);
    fireEvent.click(forward());
    expect(heading()).toHaveTextContent(WELCOME_SLIDES[2].title);
  });

  it('goes back', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(forward());
    fireEvent.click(back());
    expect(heading()).toHaveTextContent(WELCOME_SLIDES[0].title);
  });

  it('calls the last control Continue and leaves for sign-in', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(forward());
    fireEvent.click(forward());
    expect(forward()).toHaveTextContent(/continue/i);
    fireEvent.click(forward());
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('lets a student skip out from the first slide', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('keeps skip available on the last slide too', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(forward());
    fireEvent.click(forward());
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});

describe('each slide shows its own panel', () => {
  it('leads with campus care, then the vault, then Ayush', () => {
    render(<WelcomeCarouselView />);
    expect(screen.getByText('Crisis support')).toBeInTheDocument();

    fireEvent.click(forward());
    expect(screen.getByText('Complete Blood Count')).toBeInTheDocument();
    expect(screen.queryByText('Crisis support')).toBeNull();

    fireEvent.click(forward());
    expect(screen.getByText(/Ayush AI/i)).toBeInTheDocument();
    expect(screen.queryByText('Complete Blood Count')).toBeNull();
  });
});

describe('accessibility', () => {
  it('announces the position, because the dots are decorative', () => {
    const { container } = render(<WelcomeCarouselView />);
    expect(screen.getByText('Step 1 of 3')).toHaveAttribute('aria-live', 'polite');
    expect(container.querySelector('.sk-welcome__dots')).toHaveAttribute('aria-hidden', 'true');
  });

  it('updates the announced position as the slides change', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(forward());
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('moves focus to the new heading so the change is not silent', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(forward());
    expect(document.activeElement).toBe(heading());
  });

  it('does not steal focus on first paint', () => {
    render(<WelcomeCarouselView />);
    expect(document.activeElement).not.toBe(heading());
  });

  it('gives the icon-only back control an accessible name', () => {
    render(<WelcomeCarouselView />);
    fireEvent.click(forward());
    expect(back()).toBeInTheDocument();
  });

  it('names the region, and every control reachable by name', () => {
    render(<WelcomeCarouselView />);
    expect(screen.getByRole('region', { name: /what studentkare does/i })).toBeInTheDocument();
    for (const control of screen.getAllByRole('button')) {
      expect(control).toHaveAccessibleName();
    }
  });

  it('hides the decorative icons from assistive technology', () => {
    const { container } = render(<WelcomeCarouselView />);
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('marks every control as a button, so Enter and Space both fire it', () => {
    render(<WelcomeCarouselView />);
    for (const control of screen.getAllByRole('button')) {
      expect(control).toHaveAttribute('type', 'button');
    }
  });
});
