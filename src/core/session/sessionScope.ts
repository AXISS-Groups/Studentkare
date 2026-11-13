/** Account identity and invalidation for in-memory feature state; no session token is retained here. */
export interface SessionScope {
  readonly accountId: string | null;
  readonly revision: number;
}

let current: SessionScope = { accountId: null, revision: 0 };
const listeners = new Set<() => void>();

export function captureSessionScope(): SessionScope {
  return current;
}

/** An async result may affect state only while its authenticated owner still holds the same scope. */
export function isCurrentSessionScope(scope: SessionScope): boolean {
  return scope.accountId !== null && scope === current;
}

export function subscribeSessionScope(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setSessionAccount(accountId: string | null): void {
  if (current.accountId === accountId) return;
  current = { accountId, revision: current.revision + 1 };
  listeners.forEach((listener) => listener());
}

/** Also invalidate outstanding work when an already-anonymous session is explicitly ended. */
export function invalidateSessionScope(): void {
  current = { accountId: null, revision: current.revision + 1 };
  listeners.forEach((listener) => listener());
}
