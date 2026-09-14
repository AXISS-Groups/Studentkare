import { makeAutoObservable } from 'mobx';

/**
 * Base class for feature ViewModels.
 *
 * A ViewModel is the `ViewModel` half of MVVM: it owns observable state for a
 * feature, exposes `computed` projections the view binds to, and exposes
 * `action`s the view calls. It is UI-framework agnostic — components bind to it
 * via MobX observers, never by calling setState.
 *
 * Subclasses declare observable fields and mark actions/computeds with MobX
 * decorators (or call makeAutoObservable in their constructor).
 */
export abstract class ViewModel {
  /** Cancel in-flight work on unmount. Override in subclasses as needed. */
  abstract dispose(): void;

  /** Reset to a pristine/initial state. */
  abstract reset(): void;
}

/**
 * A ViewModel implemented with makeAutoObservable so fields are inferred from
 * their shape. Use when you want minimal boilerplate.
 */
export abstract class AutoObservableViewModel extends ViewModel {
  protected constructor() {
    super();
    makeAutoObservable(this);
  }
}
