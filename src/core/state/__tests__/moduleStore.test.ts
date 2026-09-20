import { describe, it, expect, vi } from 'vitest';
import { createModuleStore } from '../moduleStore';

describe('createModuleStore (P59)', () => {
  it('initializes state correctly', () => {
    const store = createModuleStore({ status: 'idle', count: 0 });
    expect(store.get()).toEqual({ status: 'idle', count: 0 });
  });

  it('updates state via object merge', () => {
    const store = createModuleStore({ status: 'idle', count: 0 });
    store.set({ status: 'loading' });
    expect(store.get()).toEqual({ status: 'loading', count: 0 });
  });

  it('updates state via function updater', () => {
    const store = createModuleStore({ status: 'ready', count: 5 });
    store.set((prev) => ({ ...prev, count: prev.count + 1 }));
    expect(store.get()).toEqual({ status: 'ready', count: 6 });
  });

  it('notifies subscribers on state change', () => {
    const store = createModuleStore({ value: 1 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set({ value: 2 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set({ value: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('resets state to initial value', () => {
    const store = createModuleStore({ value: 1 });
    store.set({ value: 100 });
    expect(store.get().value).toBe(100);

    store.reset();
    expect(store.get().value).toBe(1);
  });
});
