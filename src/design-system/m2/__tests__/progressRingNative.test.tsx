import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Metro resolves ./ProgressRing inside the native twin back to that same twin.
// Reject that dependency here: the native component must work independently.
vi.mock('../ProgressRing', () => { throw new Error('Native ring imported its platform entry point'); });
vi.mock('react-native-svg', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <svg>{children}</svg>,
  Circle: ({ strokeDashoffset }: { strokeDashoffset?: string | number }) => <circle strokeDashoffset={strokeDashoffset} />,
}));

import { clampRing, ProgressRing } from '../ProgressRing.native';

describe('native progress ring', () => {
  it.each([
    [-1, 0], [0, 0], [0.5, 0.5], [1, 1], [2, 1],
    [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0], [Number.NEGATIVE_INFINITY, 0],
  ])('clamps %s to %s without resolving back to the native component', (input, expected) => {
    expect(clampRing(input)).toBe(expected);
  });

  it('renders the count and half-filled arc without importing the platform entry point', () => {
    const { container } = render(<ProgressRing value={0.5} centre="1/2" testID="ring" />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    const arc = container.querySelector('circle[stroke-dashoffset]');
    expect(Number(arc?.getAttribute('stroke-dashoffset'))).toBeCloseTo(87.964594);
    expect(screen.getByTestId('ring')).toBeInTheDocument();
  });
});
