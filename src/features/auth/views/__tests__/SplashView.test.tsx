import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SplashView } from '../SplashView';
import { AFTERNOON_ENDS, MORNING_ENDS, greeting, timeOfDay } from '../timeOfDay';

const at = (hour: number) => new Date(2026, 8, 26, hour, 0, 0);

describe('greeting by the clock', () => {
  it('splits the day at the named boundaries', () => {
    expect(timeOfDay(at(0))).toBe('morning');
    expect(timeOfDay(at(MORNING_ENDS - 1))).toBe('morning');
    expect(timeOfDay(at(MORNING_ENDS))).toBe('afternoon');
    expect(timeOfDay(at(AFTERNOON_ENDS - 1))).toBe('afternoon');
    expect(timeOfDay(at(AFTERNOON_ENDS))).toBe('evening');
    expect(timeOfDay(at(23))).toBe('evening');
  });

  it('greets each part of the day', () => {
    expect(greeting('morning')).toBe('Good morning');
    expect(greeting('afternoon')).toBe('Good afternoon');
    expect(greeting('evening')).toBe('Good evening');
  });

  it('every hour of the day yields a greeting', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(greeting(timeOfDay(at(hour)))).toMatch(/^Good /);
    }
  });
});

describe('the splash', () => {
  const render_ = (hour = 9) =>
    render(<SplashView onStart={start} onSignIn={signIn} now={at(hour)} />);
  const start = vi.fn();
  const signIn = vi.fn();

  it('greets by the time of day it is given', () => {
    render_(20);
    expect(screen.getByText('Good evening')).toBeInTheDocument();
  });

  it('starts the intro', () => {
    start.mockReset();
    render_();
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(start).toHaveBeenCalled();
  });

  it('lets a returning student go straight to sign-in', () => {
    signIn.mockReset();
    render_();
    fireEvent.click(screen.getByRole('button', { name: /already have an account/i }));
    expect(signIn).toHaveBeenCalled();
  });

  it('reaches emergency help before any account exists', () => {
    render_();
    expect(screen.getByRole('link', { name: /call 112/i })).toHaveAttribute('href', 'tel:112');
  });
});

describe('what the splash must not claim', () => {
  it('does not say a doctor is online', () => {
    // Nothing can answer that for a signed-out visitor, and a student in
    // trouble would act on it.
    const { container } = render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} now={at(9)} />);
    expect(container.textContent).not.toMatch(/online now|available now|doctor on call/i);
  });

  it('claims no ABHA link and no compliance state', () => {
    // Guardrail 6: a compliance state is computed from evidence or it does
    // not exist. There is no ABHA integration at all.
    const { container } = render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} now={at(9)} />);
    expect(container.textContent).not.toMatch(/ABHA|certified|compliant|accredited/i);
  });
});

describe('accessibility', () => {
  it('names every control and hides every decorative icon', () => {
    const { container } = render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} now={at(9)} />);
    for (const control of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
      expect(control).toHaveAccessibleName();
    }
    // The stage is decoration with no information in it.
    expect(container.querySelector('.sk-splash__stage')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has exactly one first-level heading', () => {
    render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} now={at(9)} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
