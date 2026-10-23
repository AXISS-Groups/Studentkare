import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ACCOUNT_ROLES, Account, SessionResponse } from '../types/workflowTypes';
import { ApiError, apiRequest, setCsrfToken } from '../services/http';
import { navigate } from '../../lib/utils/workflowRouting';
import { stopWebPushOnSignOut } from '../../lib/webPush';
import type { RoutePath } from '../../lib/utils/workflowRouting';

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
  const [user, setUser] = useState<Account | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(0);
  const [version, setVersion] = useState(0);
  const acceptSession = useCallback((session: SessionResponse) => {
    if (session.user && (!session.user.id || !session.user.fullName || !ACCOUNT_ROLES.includes(session.user.role) || !session.csrfToken)) throw new Error('Invalid authenticated session.');
    setCsrfToken(session.csrfToken || '');
    setUser(session.user);
    setError('');
    setErrorStatus(0);
    setStatus(session.user ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    apiRequest<SessionResponse>('/auth/session', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) acceptSession(result); }).catch(reason => {
      if (!controller.signal.aborted) { setError(reason.message); setErrorStatus(reason instanceof ApiError ? reason.status : 0); setStatus('error'); setUser(null); setCsrfToken(''); }
    });
    return () => controller.abort();
  }, [version, acceptSession]);

  useEffect(() => {
    const expire = () => acceptSession({ user: null, csrfToken: '' });
    window.addEventListener('care:session-expired', expire);
    return () => window.removeEventListener('care:session-expired', expire);
  }, [acceptSession]);

  const logout = async (choice?: SignOutChoice) => {
    // This browser's pushes stop with the session (the server revokes them too).
    await stopWebPushOnSignOut();
    await apiRequest('/auth/logout', { method: 'POST', body: choice?.remember ? JSON.stringify(choice) : undefined });
    // The signed-out screen confirms the session ended and keeps emergency
    // help one tap away. Dropping the student on the shop said neither.
    navigate('logged-out');
    acceptSession({ user: null, csrfToken: '' });
  };
  const updateUser = (updated: Account) => setUser(current => current?.id === updated.id ? updated : current);
  return <AuthContext.Provider value={{ user, status, error, errorStatus, acceptSession, refresh: () => setVersion(value => value + 1), updateUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
