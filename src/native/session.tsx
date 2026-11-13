import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest, holdAuthenticationUntil, onSessionExpired, setCsrfToken } from '@/data/services/http';
import type { Account, AccountRole, SessionResponse } from '@/data/types/workflowTypes';
import { stopPushOnSignOut } from './hardware/push';
import { invalidateSessionScope, setSessionAccount } from '@/core/session/sessionScope';
import { useT } from '@/i18n';

/**
 * The native app's session, as the server reports it.
 *
 * Fail closed (AGENTS.md guardrails 1 and 2): only a successful
 * `/auth/session` answer carrying a well-formed user makes the app signed in.
 * A network failure, a timeout, a malformed answer or a 401 all leave it
 * signed out. Nothing is cached on the device, so offline means signed out.
 *
 * A session the server holds to two-step set-up (`twoFactorSetupRequired`) is
 * not signed in: it gets its own status, and the app shows only the set-up
 * screen, sign-out and help. The flag must be an explicit `false` to count as
 * signed in, so an answer without it is held rather than let through.
 */

export type NativeSessionStatus = 'checking' | 'signedIn' | 'twoFactorSetup' | 'signedOut';

interface NativeSession {
  status: NativeSessionStatus;
  user: Account | null;
  /** Why the last check could not sign anyone in, in plain words. Never contains tokens or identifiers. */
  problem: string;
  /** Ask the server again — after sign-in, or when the student taps retry. */
  refresh: () => void;
  signOut: () => Promise<void>;
}

const ROLES: readonly AccountRole[] = ['STUDENT', 'SUPER_ADMIN', 'CAMPUS_ADMIN', 'COUNSELLOR', 'VENDOR', 'NMC_DOCTOR'];

/** True only for an answer that names a complete, known-role user with a CSRF token. */
export function isSignedInSession(session: SessionResponse | null | undefined): session is SessionResponse & { user: Account } {
  const user = session?.user;
  return Boolean(user && user.id && user.fullName && ROLES.includes(user.role) && session?.csrfToken);
}

const SessionContext = createContext<NativeSession | null>(null);

export function NativeSessionProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [status, setStatus] = useState<NativeSessionStatus>('checking');
  const [user, setUser] = useState<Account | null>(null);
  const [problem, setProblem] = useState('');
  const [version, setVersion] = useState(0);
  const generation = useRef(0);
  const pendingCheck = useRef<AbortController | null>(null);
  const invalidatePendingCheck = useCallback(() => {
    generation.current += 1;
    pendingCheck.current?.abort();
    pendingCheck.current = null;
  }, []);

  const signOutLocally = useCallback((reason: string) => {
    invalidatePendingCheck();
    invalidateSessionScope();
    setCsrfToken('');
    setUser(null);
    setProblem(reason);
    setStatus('signedOut');
  }, [invalidatePendingCheck]);

  useEffect(() => {
    invalidatePendingCheck();
    const checkGeneration = generation.current;
    const controller = new AbortController();
    pendingCheck.current = controller;
    setStatus('checking');
    apiRequest<SessionResponse>('/auth/session', { signal: controller.signal })
      .then((session) => {
        if (controller.signal.aborted || checkGeneration !== generation.current) return;
        if (isSignedInSession(session)) {
          setSessionAccount(session.user.twoFactorSetupRequired === false ? session.user.id : null);
          setCsrfToken(session.csrfToken);
          setUser(session.user);
          setProblem('');
          setStatus(session.user.twoFactorSetupRequired === false ? 'signedIn' : 'twoFactorSetup');
        } else {
          signOutLocally('');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted && checkGeneration === generation.current) signOutLocally("We couldn't reach Studentkare, so you're signed out for now. Check your connection and try again.");
      });
    return () => {
      controller.abort();
    };
  }, [version, signOutLocally, invalidatePendingCheck]);

  useEffect(() => () => {
    invalidatePendingCheck();
    invalidateSessionScope();
    setCsrfToken('');
  }, [invalidatePendingCheck]);

  useEffect(() => onSessionExpired(() => signOutLocally('Your session ended. Sign in again to continue.')), [signOutLocally]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const signOut = useCallback(async () => {
    // Start revocation with the old token; local access ends without waiting on the network.
    const results = Promise.allSettled([
      stopPushOnSignOut(),
      apiRequest('/auth/logout', { method: 'POST' }),
    ]);
    holdAuthenticationUntil(results);
    signOutLocally('');
    const logoutGeneration = generation.current;
    // A late result must never clear a subsequently accepted session.
    const [, remote] = await results;
    if (logoutGeneration === generation.current && remote.status === 'rejected') {
      setProblem(t('launch.signout.remoteUnconfirmed'));
    }
  }, [signOutLocally, t]);

  return <SessionContext.Provider value={{ status, user, problem, refresh, signOut }}>{children}</SessionContext.Provider>;
}

export function useNativeSession(): NativeSession {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useNativeSession must be used inside NativeSessionProvider');
  return value;
}
