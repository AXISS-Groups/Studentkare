import { useEffect, useRef, useState } from 'react';

/**
 * The check-in pass is signed by the server for one 30-second step. Past
 * `expiresAt` the counter refuses it, so the screen must not keep showing it:
 * a stale QR is hidden, not left up to fail at the counter.
 */
export function passSecondsLeft(expiresAt: number | undefined, nowMs: number): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil(expiresAt - nowMs / 1000));
}

export function passIsLive(expiresAt: number | undefined, nowMs: number): boolean {
  return Boolean(expiresAt) && nowMs < (expiresAt ?? 0) * 1000;
}

/** Ticks once a second and asks for the next code when this one expires. */
export function useLivePass(expiresAt: number | undefined, refresh: () => void): { live: boolean; secondsLeft: number | null } {
  const [now, setNow] = useState(() => Date.now());
  const asked = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!expiresAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  useEffect(() => {
    if (expiresAt && !passIsLive(expiresAt, now) && asked.current !== expiresAt) {
      asked.current = expiresAt;
      refresh();
    }
  }, [expiresAt, now, refresh]);
  return { live: passIsLive(expiresAt, now), secondsLeft: passSecondsLeft(expiresAt, now) };
}
