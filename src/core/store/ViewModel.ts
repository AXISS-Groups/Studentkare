/**
 * The contract every feature ViewModel honours.
 *
 * A ViewModel is the `ViewModel` half of MVVM: it owns observable state for a
 * feature, exposes `computed` projections the view binds to, and exposes
 * `action`s the view calls. It is UI-framework agnostic — components bind to it
 * via MobX observers, never by calling setState.
 *
 * This is an interface, not a base class, and deliberately so. MobX's
 * `makeAutoObservable` refuses to run on any object whose prototype chain has a
 * superclass, so a base class cannot make its subclasses observable on their
 * behalf — and a base class that tried it threw on construction for every
 * subclass. Each ViewModel therefore calls `makeAutoObservable(this, {},
 * { autoBind: true })` in its own constructor, where its own fields are
 * visible, and `implements ViewModel` to keep the contract.
 *
 * A ViewModel that needs to extend something real uses MobX's `makeObservable`
 * with explicit annotations instead, which does work through a superclass.
 */
export interface ViewModel {
  /** Cancel in-flight work on unmount. */
  dispose(): void;

  /** Reset to a pristine/initial state. */
  reset(): void;
}
