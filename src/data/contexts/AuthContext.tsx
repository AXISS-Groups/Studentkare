import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Account, SessionResponse } from '../types/workflowTypes';
import { apiRequest, setCsrfToken } from '../services/http';
import { navigate } from '../../lib/workflowRouting';

interface AuthContextValue {
  user: Account | null;
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  error: string;
  acceptSession: (session: SessionResponse) => void;
  refresh: () => void;
  updateUser: (user: Account) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const acceptSession = useCallback((session: SessionResponse) => {
    if (session.user && (!session.user.id || !session.user.fullName || !['STUDENT', 'SUPER_ADMIN', 'CAMPUS_ADMIN', 'VENDOR', 'NMC_DOCTOR'].includes(session.user.role) || !session.csrfToken)) throw new Error('Invalid authenticated session.');
    setCsrfToken(session.csrfToken || '');
    setUser(session.user);
    setError('');
    setStatus(session.user ? 'authenticated' : 'anonymous');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    apiRequest<SessionResponse>('/auth/session', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) acceptSession(result); }).catch(reason => {
      if (!controller.signal.aborted) { setError(reason.message); setStatus('error'); setUser(null); setCsrfToken(''); }
    });
    return () => controller.abort();
  }, [version, acceptSession]);

  useEffect(() => {
    const expire = () => acceptSession({ user: null, csrfToken: '' });
    window.addEventListener('care:session-expired', expire);
    return () => window.removeEventListener('care:session-expired', expire);
  }, [acceptSession]);

  const logout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    navigate('shop');
    acceptSession({ user: null, csrfToken: '' });
  };
  const updateUser = (updated: Account) => setUser(current => current?.id === updated.id ? updated : current);
  return <AuthContext.Provider value={{ user, status, error, acceptSession, refresh: () => setVersion(value => value + 1), updateUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
