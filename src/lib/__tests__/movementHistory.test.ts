import { describe, expect, it, vi } from 'vitest';
import { formatDuration } from '../movementHistory';


describe('movement history', () => {
  it('formats duration', () => {
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(65)).toBe('1m 05s');
    expect(formatDuration(754)).toBe('12m 34s');
  });
});

describe('step history stays out of client storage (guardrail 9)', () => {
  it('writes nothing and removes a copy left by an earlier version', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useMovementHistory } = await import('../movementHistory');
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    });
    localStorage.setItem('studentkare-movement-history', '[{"steps":10}]');
    const { result } = renderHook(() => useMovementHistory());
    expect(localStorage.getItem('studentkare-movement-history')).toBeNull();
    act(() => result.current.recordSession(1200, 600));
    expect(result.current.sessions).toHaveLength(1);
    expect(store.size).toBe(0);
    vi.unstubAllGlobals();
  });
});
