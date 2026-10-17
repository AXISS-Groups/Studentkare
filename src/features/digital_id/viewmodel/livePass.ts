import { useEffect, useRef, useState } from 'react';
import type { MemberIdentity, PassWindowEntry } from '@/data/types/workflowTypes';

/**
 * The check-in pass is signed by the server for one 30-second step, and the
 * counter refuses it outside that step. The server also sends the next ten
 * minutes of codes (passWindow) so a weak signal at the counter doesn't break
 * the pass. They are held in memory only — never written to storage
 * (AGENTS.md guardrail 9) — so closing the app while offline loses them.
 * Past the last one the pass shows nothing: a stale code is hidden, not left
 * up to fail at the counter.
 */
export interface LivePassEntry {
  token: string;
  passCode: string;
  expiresAt: number;
  qrMatrix?: string[];
  /** Only for the code the server sent as current; window entries are drawn from qrMatrix. */
  qrSvg?: string;
}

/** Top the window up when fewer than this many steps (5 minutes) remain. */
export const REFRESH_BELOW_STEPS = 10;
const RETRY_MS = 30_000;

export function liveEntry(identity: MemberIdentity | null | undefined, nowMs: number): LivePassEntry | null {
  if (!identity?.issued) return null;
  const now = nowMs / 1000;
  const current = identity.expiresAt && identity.code;
  if (current && now >= (identity.expiresAt ?? 0) - 30 && now < (identity.expiresAt ?? 0)) {
    return { token: identity.code ?? '', passCode: identity.passCode ?? '', expiresAt: identity.expiresAt ?? 0, qrMatrix: identity.qrMatrix, qrSvg: identity.qrSvg };
  }
  const entry = identity.passWindow?.find((candidate: PassWindowEntry) => candidate.startsAt <= now && now < candidate.expiresAt);
  return entry ? { token: entry.token, passCode: entry.passCode, expiresAt: entry.expiresAt, qrMatrix: entry.qrMatrix } : null;
}

/** Steps still usable from what the app holds in memory. */
export function stepsLeft(identity: MemberIdentity | null | undefined, nowMs: number): number {
  const now = nowMs / 1000;
  const window = identity?.passWindow ?? [];
  if (window.length) return window.filter((entry) => entry.expiresAt > now).length;
  return identity?.expiresAt && identity.expiresAt > now ? 1 : 0;
}

export function passSecondsLeft(entry: LivePassEntry | null, nowMs: number): number | null {
  return entry ? Math.max(0, Math.ceil(entry.expiresAt - nowMs / 1000)) : null;
}

/** Ticks once a second, shows the code for now, and tops up the window in good time. */
export function useLivePass(identity: MemberIdentity | null | undefined, refresh: () => void): { entry: LivePassEntry | null; secondsLeft: number | null } {
  const [now, setNow] = useState(() => Date.now());
  const lastAsked = useRef(0);
  const issued = Boolean(identity?.issued);
  useEffect(() => {
    if (!issued) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [issued]);
  useEffect(() => {
    if (issued && stepsLeft(identity, now) < REFRESH_BELOW_STEPS && now - lastAsked.current >= RETRY_MS) {
      lastAsked.current = now;
      refresh();
    }
  }, [identity, issued, now, refresh]);
  const entry = liveEntry(identity, now);
  return { entry, secondsLeft: passSecondsLeft(entry, now) };
}
