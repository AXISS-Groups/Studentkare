import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenLoading } from '../ScreenLoading';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ScreenLoading', () => {
  it('shows nothing for a fast load', () => {
    render(<ScreenLoading />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('announces a slow load instead of a blank page', () => {
    render(<ScreenLoading />);
    act(() => { vi.advanceTimersByTime(250); });
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });
});
