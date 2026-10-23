import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SplashView } from '../SplashView';
import { AFTERNOON_ENDS, MORNING_ENDS, MORNING_STARTS, greeting, timeOfDay } from '../timeOfDay';

const at = (hour: number) => new Date(2026, 8, 26, hour, 0, 0);

describe('greeting by the clock', () => {
  it('splits the day at the named boundaries', () => {
    // The Main board: night belongs to the evening care circle until 5 am.
    expect(timeOfDay(at(0))).toBe('evening');
    expect(timeOfDay(at(MORNING_STARTS - 1))).toBe('evening');
    expect(timeOfDay(at(MORNING_STARTS))).toBe('morning');
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
  it('names every control, describes the main picture and hides the decoration', () => {
    const { container } = render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} now={at(9)} />);
    for (const control of [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]) {
      expect(control).toHaveAccessibleName();
    }
    expect(screen.getByRole('img', { name: /doctor waving hello/i })).toBeInTheDocument();
    // The satellites around it carry no information.
    for (const img of container.querySelectorAll('.sk-splash__satellite')) {
      expect(img).toHaveAttribute('aria-hidden', 'true');
    }
    // Icons are drawn with the design-system icon set, never text symbols.
    expect(container.textContent).not.toMatch(/[☀🌤🌙🔒🗂🧪🩺→]/u);
  });

  it('has exactly one first-level heading', () => {
    render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} now={at(9)} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});

describe('the three parts of the day (Main · SplashPulse · SplashVault)', () => {
  const draw = (hour: number) => render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} now={at(hour)} />);

  it('morning is the doctor hello', () => {
    const { container } = draw(8);
    expect(container.querySelector('[data-part]')).toHaveAttribute('data-part', 'morning');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A little care.');
    expect(container.querySelector('[data-icon="sun"]')).not.toBeNull();
  });

  it('afternoon is the heartbeat, with what Student Kare covers', () => {
    const { container } = draw(14);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Care that keeps');
    const chips = screen.getByRole('list', { name: /what student kare covers/i });
    expect(chips).toHaveTextContent('Doctors');
    expect(chips).toHaveTextContent('Lab tests');
    expect(chips).toHaveTextContent('Records');
    for (const name of ['stethoscope', 'flask', 'file']) expect(container.querySelector(`[data-icon="${name}"]`)).not.toBeNull();
    expect(container.querySelector('[data-icon="illustration:illustration-heartbeat-line"]')).not.toBeNull();
  });

  it('evening is the care circle, private by default and nothing about ABHA', () => {
    const { container } = draw(21);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Everything for your');
    expect(screen.getByText('Private by default')).toBeInTheDocument();
    expect(container.querySelector('[data-icon="moon"]')).not.toBeNull();
    expect(container.querySelector('[data-icon="lock"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/ABHA/);
  });

  it('a single-variant board draws without the greeting', () => {
    render(<SplashView onStart={vi.fn()} onSignIn={vi.fn()} variant="afternoon" greeting={false} now={at(9)} />);
    expect(screen.queryByText(/^Good /)).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Care that keeps');
  });
});
