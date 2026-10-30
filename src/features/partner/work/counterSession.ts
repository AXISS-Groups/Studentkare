import { useSyncExternalStore } from 'react';
import type { IdentitySummary } from '@/data/types/workflowTypes';

/**
 * Who this counter has checked, for this browser tab only (WP-15).
 *
 * A verification starts from a 200 from `POST /identity/verify` (a live,
 * single-use pass step) and is completed by the staff member deciding "same
 * person". A "not the same person" decision stops that student for the rest of
 * the session: every downstream step (collect, hand over) stays shut for them,
 * even if a later pass scan succeeds.
 *
 * Held in memory only: nothing is written to storage (guardrail 9: no PHI in
 * client storage), so a reload or another tab starts from nothing, which is the
 * fail-closed direction. It is keyed to the signed-in staff account and
 * cleared when that changes.
 */

export type VisitContext = 'pharmacy' | 'lab' | 'clinic' | 'camp';

export interface CounterVerification {
  memberId: string;
  fullName: string;
  university: string;
  rollNumber: string;
  campusStatus: IdentitySummary['campusStatus'];
  context: VisitContext;
  /** Epoch ms, this device's clock (shown as a time only). */
  verifiedAt: number;
}

interface CounterLogEntry {
  id: string;
  name: string;
  at: number;
  outcome: 'verified' | 'stopped';
}

export interface CounterState {
  staffId: string;
  current: CounterVerification | null;
  stopped: ReadonlySet<string>;
  log: readonly CounterLogEntry[];
}

const LOG_LIMIT = 8;
const EMPTY: CounterState = { staffId: '', current: null, stopped: new Set(), log: [] };

let state: CounterState = EMPTY;
const listeners = new Set<() => void>();

function emit(next: CounterState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The pass's member id for an account id, as the server prints it (`identity_summary`). */
export function memberIdForAccount(accountId: string): string {
  return `SK-${accountId.toUpperCase()}`;
}

/** Binds the session to the signed-in staff account; another account starts empty. */
export function bindCounter(staffId: string): void {
  if (state.staffId !== staffId) emit({ ...EMPTY, staffId });
}

export function isStopped(memberId: string): boolean {
  return state.stopped.has(memberId.toUpperCase());
}

/** The staff member decided "same person" after a live pass. A stopped student never becomes verified. */
export function recordVerified(verification: CounterVerification): boolean {
  const memberId = verification.memberId.toUpperCase();
  if (state.stopped.has(memberId)) return false;
  const entry: CounterLogEntry = { id: `${memberId}:${verification.verifiedAt}`, name: verification.fullName, at: verification.verifiedAt, outcome: 'verified' };
  emit({ ...state, current: { ...verification, memberId }, log: [entry, ...state.log].slice(0, LOG_LIMIT) });
  return true;
}

/** "Not the same person": stops this student for the rest of the session. */
export function recordMismatch(memberId: string, name: string, at: number): void {
  const id = memberId.toUpperCase();
  const stopped = new Set(state.stopped);
  if (id) stopped.add(id);
  const current = state.current && state.current.memberId === id ? null : state.current;
  const entry: CounterLogEntry = { id: `${id || 'unknown'}:${at}`, name, at, outcome: 'stopped' };
  emit({ ...state, current, stopped, log: [entry, ...state.log].slice(0, LOG_LIMIT) });
}

/** Starts the next check: the last verified student no longer stands at the counter. */
export function clearCurrent(): void {
  if (state.current) emit({ ...state, current: null });
}

/** The verified student, when it is this account's student and they were not stopped. */
export function verifiedIn(session: CounterState, accountId: string): CounterVerification | null {
  const current = session.current;
  if (!current || !accountId) return null;
  const memberId = memberIdForAccount(accountId);
  if (current.memberId !== memberId || session.stopped.has(memberId)) return null;
  return current;
}

export function useCounterSession(): CounterState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Test seam: back to nothing. */
export function resetCounterSession(): void {
  emit(EMPTY);
}
