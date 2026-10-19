import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { useTheme } from '@/theme/tokens/theme';
import { AccountAppearanceViewModel } from '../viewmodel/AccountAppearanceViewModel';

const AccountAppearanceContext = createContext<AccountAppearanceViewModel | null>(null);

/**
 * Keeps the theme (ThemeProvider, applied from this browser's cache first) and
 * the account's appearance in step. Sits inside AuthProvider. Any control
 * that changes the theme — the settings card, the admin top-bar toggle — is
 * saved to the account, because this watches the preference itself.
 */
export function AccountAppearanceProvider({ children }: { children: React.ReactNode }) {
  const { preference, setPreference } = useTheme();
  const { status } = useAuth();
  const latest = useRef(preference);
  latest.current = preference;
  const [viewModel] = useState(() => new AccountAppearanceViewModel(setPreference, () => latest.current));

  useEffect(() => {
    if (status === 'authenticated') void viewModel.setSignedIn(true);
    else if (status === 'anonymous' || status === 'error') void viewModel.setSignedIn(false);
    // Reset, not dispose: StrictMode re-runs this effect and a new session must read afresh.
    return () => viewModel.reset();
  }, [status, viewModel]);

  useEffect(() => {
    void viewModel.preferenceChanged(preference);
  }, [preference, viewModel]);

  return <AccountAppearanceContext.Provider value={viewModel}>{children}</AccountAppearanceContext.Provider>;
}

/** Null outside AccountAppearanceProvider (then the choice is this browser's only). */
export function useAccountAppearance(): AccountAppearanceViewModel | null {
  return useContext(AccountAppearanceContext);
}
