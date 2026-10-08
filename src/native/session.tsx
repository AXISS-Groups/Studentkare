import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, onSessionExpired, setCsrfToken } from '@/data/services/http';
import type { Account, AccountRole, SessionResponse } from '@/data/types/workflowTypes';

/**
 * The native app's session, as the server reports it.
 *
 * Fail closed (AGENTS.md guardrails 1 and 2): only a successful
 * `/auth/session` answer carrying a well-formed user makes the app signed in.
 * A network failure, a timeout, a malformed answer or a 401 all leave it
 * signed out. Nothing is cached on the device, so offline means signed out.
 */

export type NativeSessionStatus = 'checking' | 'signedIn' | 'signedOut';

interface NativeSession {
  status: NativeSessionStatus;
  user: Account | null;
  /** Why the last check could not sign anyone in, in plain words. Never contains tokens or identifiers. */
  problem: string;
  /** Ask the server again — after sign-in, or when the student taps retry. */
  refresh: () => void;
  signOut: () => Promise<void>;
}

const ROLES: readonly AccountRole[] = ['STUDENT', 'SUPER_ADMIN', 'CAMPUS_ADMIN', 'VENDOR', 'NMC_DOCTOR'];

/** True only for an answer that names a complete, known-role user with a CSRF token. */
export function isSignedInSession(session: SessionResponse | null | undefined): session is SessionResponse & { user: Account } {
  const user = session?.user;
  return Boolean(user && user.id && user.fullName && ROLES.includes(user.role) && session?.csrfToken);
}

const SessionContext = createContext<NativeSession | null>(null);

export function NativeSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<NativeSessionStatus>('checking');
  const [user, setUser] = useState<Account | null>(null);
  const [problem, setProblem] = useState('');
  const [version, setVersion] = useState(0);

  const signOutLocally = useCallback((reason: string) => {
    setCsrfToken('');
    setUser(null);
    setProblem(reason);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    let live = true;
    setStatus('checking');
    apiRequest<SessionResponse>('/auth/session')
      .then((session) => {
        if (!live) return;
        if (isSignedInSession(session)) {
          setCsrfToken(session.csrfToken);
          setUser(session.user);
          setProblem('');
          setStatus('signedIn');
        } else {
          signOutLocally('');
        }
      })
      .catch(() => {
        if (live) signOutLocally("We couldn't reach Studentkare, so you're signed out for now. Check your connection and try again.");
      });
    return () => {
      live = false;
    };
  }, [version, signOutLocally]);

  useEffect(() => onSessionExpired(() => signOutLocally('Your session ended. Sign in again to continue.')), [signOutLocally]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      // Signed out on this device even if the server call failed.
      signOutLocally('');
    }
  }, [signOutLocally]);

  return <SessionContext.Provider value={{ status, user, problem, refresh, signOut }}>{children}</SessionContext.Provider>;
}

export function useNativeSession(): NativeSession {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useNativeSession must be used inside NativeSessionProvider');
  return value;
}
