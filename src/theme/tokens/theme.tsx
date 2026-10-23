import React, { createContext, useContext, ReactNode } from 'react';
import { lightTokens, darkTokens, typography, spacing, radius, shadows, ThemeTokens } from './tokens';
import { InterfaceProvider } from '../providers/InterfaceProvider';
import type { SkColorScheme } from './generated/skTokens';

export type ThemeMode = SkColorScheme;
/** What the person chose. 'system' follows the device's light/dark setting. */
export type ThemePreference = ThemeMode | 'system';

/**
 * Default for someone who hasn't chosen. Light until the screens still on raw
 * hex (config/hex-colour-legacy.json) are migrated; then this becomes 'system'.
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';
const STORAGE_KEY = 'sa_care_theme';

function systemPrefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function readPreference(): ThemePreference {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    }
  } catch { /* storage unavailable: use the default */ }
  return DEFAULT_THEME_PREFERENCE;
}

/**
 * Sets `data-theme` from this browser's cached choice before React draws
 * anything, so a dark choice never flashes light while the app (and, when
 * signed in, the account's choice) loads. Called once from main.tsx.
 */
export function applyCachedTheme(): void {
  if (typeof document === 'undefined') return;
  const preference = readPreference();
  const mode: ThemeMode = preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.className = mode;
}

interface ThemeContextType {
  mode: ThemeMode;
  tokens: ThemeTokens;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  /** The person's choice, including 'system'. `mode` is what it resolves to. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preference, setPreference] = React.useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = React.useState<boolean>(systemPrefersDark);

  // Follow the device setting live while the preference is 'system'.
  React.useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [preference]);

  const mode: ThemeMode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  const tokens = mode === 'dark' ? darkTokens : lightTokens;
  const isDark = mode === 'dark';

  const toggleTheme = () => {
    setPreference(isDark ? 'light' : 'dark');
  };

  const setTheme = (next: ThemeMode) => {
    setPreference(next);
  };

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', mode);
      root.className = mode;

      // Inject Theme CSS variables to document root
      root.style.setProperty('--canvas', tokens.canvas);
      root.style.setProperty('--surface', tokens.surface);
      root.style.setProperty('--surface-2', tokens.surface2);
      root.style.setProperty('--surface-3', tokens.surface3);
      root.style.setProperty('--rule', tokens.rule);
      root.style.setProperty('--rule-soft', tokens.ruleSoft);
      root.style.setProperty('--veil', tokens.veil);
      root.style.setProperty('--ink', tokens.ink);
      root.style.setProperty('--ink-2', tokens.ink2);
      root.style.setProperty('--text', tokens.text);
      root.style.setProperty('--text-2', tokens.text2);
      root.style.setProperty('--text-3', tokens.text3);
      root.style.setProperty('--action', tokens.action);
      root.style.setProperty('--action-hover', tokens.actionHover);
      root.style.setProperty('--data', tokens.data);
      root.style.setProperty('--positive', tokens.positive);
      root.style.setProperty('--attention', tokens.attention);
      root.style.setProperty('--emergency', tokens.emergency);
      root.style.setProperty('--reward', tokens.reward);
      root.style.setProperty('--glow', tokens.glow);

      document.body.style.backgroundColor = tokens.canvas;
      document.body.style.color = tokens.text;

      try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* localStorage fallback */ }
    }
  }, [mode, tokens, preference]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        tokens,
        typography,
        spacing,
        radius,
        shadows,
        toggleTheme,
        setTheme,
        preference,
        setPreference,
        isDark,
      }}
    >
      <InterfaceProvider>{children}</InterfaceProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
