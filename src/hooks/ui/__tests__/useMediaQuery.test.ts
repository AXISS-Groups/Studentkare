import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  it('returns matches state from matchMedia and updates on change', () => {
    let listener: (() => void) | null = null;
    let currentMatches = false;

    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      get matches() {
        return currentMatches;
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'change') listener = cb;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    act(() => {
      currentMatches = true;
      listener?.();
    });

    expect(result.current).toBe(true);
  });
});
