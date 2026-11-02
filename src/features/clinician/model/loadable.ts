export interface Loadable<T> {
  /** Null when the screen is not connected to anything real. */
  load(): Promise<T | null>;
}
