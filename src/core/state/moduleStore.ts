/**
 * Light Module Store Factory (P59)
 * Built on React 18's useSyncExternalStore primitive for observable module state.
 * Handles tear-free concurrent rendering and explicit lifecycle subscriptions.
 */

import { useSyncExternalStore, useCallback } from 'react';

export interface ModuleStore<T> {
  /** Get current state snapshot */
  get: () => T;
  /** Update state (partial object or updater function) */
  set: (updater: Partial<T> | ((prev: T) => T)) => void;
  /** Subscribe to state changes */
  subscribe: (listener: () => void) => () => void;
  /** Reset store to initial state */
  reset: () => void;
}

/**
 * Creates a light, typed observable store for module state.
 * Implements P59 Reactive State specifications.
 */
export function createModuleStore<T>(initialState: T): ModuleStore<T> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    get: () => state,
    set: (updater) => {
      const nextState =
        typeof updater === 'function'
          ? (updater as (prev: T) => T)(state)
          : { ...state, ...updater };

      if (!Object.is(state, nextState)) {
        state = nextState;
        listeners.forEach((listener) => listener());
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset: () => {
      state = initialState;
      listeners.forEach((listener) => listener());
    },
  };
}

/**
 * React hook to subscribe to a module store or a derived slice.
 * Uses React 18's useSyncExternalStore under the hood for safe concurrent rendering.
 */
export function useModuleStore<T, S = T>(
  store: ModuleStore<T>,
  selector?: (state: T) => S
): S {
  const getSnapshot = useCallback(() => {
    const raw = store.get();
    return selector ? selector(raw) : (raw as unknown as S);
  }, [store, selector]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
