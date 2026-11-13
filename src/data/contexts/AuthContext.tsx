import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ACCOUNT_ROLES, Account, SessionResponse } from '../types/workflowTypes';
import { ApiError, apiRequest, holdAuthenticationUntil, setCsrfToken } from '../services/http';
import { navigate } from '../../lib/utils/workflowRouting';
import { stopWebPushOnSignOut } from '../../lib/webPush';
import type { RoutePath } from '../../lib/utils/workflowRouting';
import { invalidateSessionScope, setSessionAccount } from '../../core/session/sessionScope';
import { useT } from '../../i18n';

/** Opt-in at sign-out: the server remembers this device and the page the student was on. */
export interface SignOutChoice {
  remember: boolean;
  lastRoute: RoutePath;
}

interface AuthContextValue {
  user: Account | null;
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  error: string;
  /** HTTP status of the failed session check (429 = rate limited), 0 when none. */
  errorStatus: number;
  acceptSession: (session: SessionResponse) => void;
  refresh: () => void;
  updateUser: (user: Account) => void;
  logout: (choice?: SignOutChoice) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [user, setUser] = useState<Account | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(0);
  const [version, setVersion] = useState(0);
  const generation = useRef(0);
  const acceptedUser = useRef<Account | null>(null);
  const pendingCheck = useRef<AbortController | null>(null);
  const invalidatePendingCheck = useCallback(() => {
    generation.current += 1;
    pendingCheck.current?.abort();
    pendingCheck.current = null;
    return generation.current;
  }, []);
  const clearSession = useCallback(() => {
    invalidateSessionScope();
    setCsrfToken('');
    acceptedUser.current = null;
    setUser(null);
    setError('');
    setErrorStatus(0);
    setStatus('anonymous');
  }, []);
  const applySession = useCallback((session: SessionResponse) => {
    if (session.user && (!session.user.id || !session.user.fullName || !ACCOUNT_ROLES.includes(session.user.role) || !session.csrfToken)) throw new Error('Invalid authenticated session.');
    // Held two-step sessions keep their setup token, but own no private feature state.
    setSessionAccount(session.user?.twoFactorSetupRequired === false ? session.user.id : null);
    setCsrfToken(session.csrfToken || '');
    acceptedUser.current = session.user;
    setUser(session.user);
    setError('');
    setErrorStatus(0);
    setStatus(session.user ? 'authenticated' : 'anonymous');
  }, []);
  const acceptSession = useCallback((session: SessionResponse) => {
    invalidatePendingCheck();
    try {
      applySession(session);
    } catch (reason) {
      clearSession();
      throw reason;
    }
  }, [applySession, clearSession, invalidatePendingCheck]);

  useEffect(() => {
    const controller = new AbortController();
    const checkGeneration = invalidatePendingCheck();
    pendingCheck.current = controller;
    setStatus('loading');
    apiRequest<SessionResponse>('/auth/session', { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted && checkGeneration === generation.current) applySession(result);
    }).catch(reason => {
      if (!controller.signal.aborted && checkGeneration === generation.current) {
        clearSession();
        setError(reason instanceof Error ? reason.message : '');
        setErrorStatus(reason instanceof ApiError ? reason.status : 0);
        setStatus('error');
      }
    });
    return () => controller.abort();
  }, [version, applySession, clearSession, invalidatePendingCheck]);

  useEffect(() => () => {
    invalidatePendingCheck();
    invalidateSessionScope();
    setCsrfToken('');
  }, [invalidatePendingCheck]);

  useEffect(() => {
    const expire = () => acceptSession({ user: null, csrfToken: '' });
    window.addEventListener('care:session-expired', expire);
    return () => window.removeEventListener('care:session-expired', expire);
  }, [acceptSession]);

  const logout = async (choice?: SignOutChoice) => {
    // Start both requests with this session's CSRF token before dropping local access.
    const results = Promise.allSettled([
      stopWebPushOnSignOut(),
      apiRequest('/auth/logout', { method: 'POST', body: choice?.remember ? JSON.stringify(choice) : undefined }),
    ]);
    holdAuthenticationUntil(results);
    const logoutGeneration = invalidatePendingCheck();
    clearSession();
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.removeItem('care_demo_session'); } catch { /* Local access is already cleared. */ }
    }
    const [, remote] = await results;
    if (logoutGeneration !== generation.current) return;
    if (remote.status === 'rejected') {
      setError(t('launch.signout.remoteUnconfirmed'));
      setErrorStatus(remote.reason instanceof ApiError ? remote.reason.status : 0);
      setStatus('error');
      navigate('login');
      return;
    }
    // The signed-out screen confirms the session ended and keeps emergency
    // help one tap away. Dropping the student on the shop said neither.
    navigate('logged-out');
  };
  const updateUser = (updated: Account) => {
    if (acceptedUser.current?.id !== updated.id) return;
    setSessionAccount(updated.twoFactorSetupRequired === false ? updated.id : null);
    acceptedUser.current = updated;
    setUser(updated);
  };
  return <AuthContext.Provider value={{ user, status, error, errorStatus, acceptSession, refresh: () => setVersion(value => value + 1), updateUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
