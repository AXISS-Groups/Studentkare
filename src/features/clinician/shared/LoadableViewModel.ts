import { actionBound, makeObservable, observable, runInAction } from 'mobx';

export type LoadStatus = 'loading' | 'ready' | 'empty' | 'unconnected' | 'error';

export interface Loadable<T> {
  /** Null when the screen is not connected to anything real. */
  load(): Promise<T | null>;
}

/**
 * Loading, ready, empty, not-connected and error for a clinician screen, in
 * one place. Subclasses say what "empty" means and add their own actions.
 */
export abstract class LoadableViewModel<T> {
  status: LoadStatus = 'loading';
  data: T | null = null;
  toast: string | null = null;

  protected constructor(protected readonly loader: Loadable<T>) {
    makeObservable(this, { status: observable, data: observable, toast: observable, load: actionBound, clearToast: actionBound, say: actionBound });
  }

  protected abstract isEmpty(data: T): boolean;

  /** Called after a successful load, inside the same action. */
  protected afterLoad(_data: T): void {}

  async load(): Promise<void> {
    this.status = 'loading';
    try {
      const data = await this.loader.load();
      runInAction(() => {
        this.data = data;
        if (data === null) this.status = 'unconnected';
        else if (this.isEmpty(data)) this.status = 'empty';
        else this.status = 'ready';
        if (data !== null) this.afterLoad(data);
      });
    } catch {
      runInAction(() => {
        this.data = null;
        this.status = 'error';
      });
    }
  }

  say(message: string): void {
    this.toast = message;
  }

  clearToast(): void {
    this.toast = null;
  }
}
