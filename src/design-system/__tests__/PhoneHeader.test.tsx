import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PhoneHeader, usePhoneFrame, PHONE_FRAME_QUERY } from '..';
import { skTokens } from '@/theme/tokens/generated/skTokens';

afterEach(cleanup);

describe('PhoneHeader', () => {
  it('makes the title the page heading', () => {
    render(<PhoneHeader title="Appointments" />);
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeInTheDocument();
  });

  it('draws a named back button with the canvas arrow-left, and calls it', () => {
    const onPress = vi.fn();
    render(<PhoneHeader title="Notifications" back={{ label: 'Back', onPress }} />);
    const back = screen.getByRole('button', { name: 'Back' });
    expect(back.querySelector('[data-icon="arrow-left"]')).not.toBeNull();
    fireEvent.click(back);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no back button on a tab root, and can show the brand mark (decorative) before the title', () => {
    render(<PhoneHeader title="Student Kare" brand />);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    const mark = document.querySelector('[data-icon="brand:studentkare-logo"]');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { name: 'Student Kare' })).toBeInTheDocument();
  });

  it('names every action, shows the SOS label as text, and reports the menu as expanded', () => {
    const sos = vi.fn();
    render(
      <PhoneHeader
        title="Health overview"
        actions={[
          { key: 'menu', icon: 'menu', label: 'Close menu', onPress: () => undefined, expanded: true, controls: 'workspace-sidebar' },
          { key: 'sos', icon: 'shield-2', label: 'SOS', onPress: sos, tone: 'sos', showLabel: true },
        ]}
      />,
    );
    const menu = screen.getByRole('button', { name: 'Close menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveAttribute('aria-controls', 'workspace-sidebar');
    expect(menu).toHaveTextContent('');
    const sosButton = screen.getByRole('button', { name: 'SOS' });
    expect(sosButton).toHaveTextContent('SOS');
    expect(sosButton.querySelector('[data-icon="shield-2"]')).not.toBeNull();
    fireEvent.click(sosButton);
    expect(sos).toHaveBeenCalledTimes(1);
  });
});

describe('PhoneHeader source (rule 11, rule 7)', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/design-system/navigation/PhoneHeader.tsx'), 'utf8');

  it('uses tokens only: no hex colours or raw svg', () => {
    expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    expect(source).not.toMatch(/<svg/);
    expect(source).not.toMatch(/lucide-react/);
  });

  it('keeps every control at the 44 px touch target, and red for SOS only', () => {
    expect(source).toMatch(/width: size\.touchTarget/);
    expect(source).toMatch(/height: size\.touchTarget/);
    expect(source.match(/color\.dangerFill/g)).toHaveLength(1);
    expect(skTokens.size.touchTarget).toBe(44);
  });
});

describe('usePhoneFrame', () => {
  it('reads the phone-frame breakpoint token (430 px) and follows the window', () => {
    expect(skTokens.size.phoneFrameMax).toBe(430);
    expect(PHONE_FRAME_QUERY).toBe('(max-width: 430px)');
    const listeners: Array<() => void> = [];
    const query = { matches: true, addEventListener: (_: string, cb: () => void) => listeners.push(cb), removeEventListener: vi.fn() };
    const original = window.matchMedia;
    window.matchMedia = vi.fn(() => query) as unknown as typeof window.matchMedia;
    try {
      const { result } = renderHook(() => usePhoneFrame());
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 430px)');
      expect(result.current).toBe(true);
      query.matches = false;
      act(() => listeners.forEach((listener) => listener()));
      expect(result.current).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
