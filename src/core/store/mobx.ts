import { action, makeObservable, observable, runInAction } from 'mobx';

/**
 * Observable "micro-store" pattern for feature-level state.
 *
 * A feature ViewModel keeps its state observable and mutates it only through
 * actions so that MobX can track bindings. Components read the ViewModel and
 * react to changes without a provider chain or manual re-render wiring.
 */

export interface LoadingState {
  idle: boolean;
  loading: boolean;
  error: string | null;
}

export function initialLoading(): LoadingState {
  return { idle: true, loading: false, error: null };
}

/** Wrap an async operation so loading/error flags stay observable. */
export function withLoading(target: LoadingState, task: () => Promise<void>): Promise<void> {
  target.loading = true;
  target.error = null;
  return task()
    .catch((error: unknown) => {
      target.error = error instanceof Error ? error.message : 'Something went wrong.';
      throw error;
    })
    .finally(() => {
      runInAction(() => {
        target.loading = false;
        target.idle = false;
      });
    });
}

/** Convenience for making a plain object observable without a class. */
export const observableState = <T extends object>(state: T): T =>
  observable(state, undefined, { autoBind: true });

/** Convenience action decorator shorthand for class ViewModels. */
export const act = action;
export { makeObservable };
