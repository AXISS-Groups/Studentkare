import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { lightTokens, darkTokens, typography, spacing, radius, shadows, ThemeTokens } from './tokens';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  tokens: ThemeTokens;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggleTheme = () => {
    // Light theme only as per design specification
    setMode('light');
  };

  const tokens = lightTokens;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', 'light');
      root.className = 'light';

      // Inject Light Theme CSS variables to document root
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

      localStorage.setItem('sa_care_theme', 'light');
    }
  }, [tokens]);

  return (
    <ThemeContext.Provider
      value={{
        mode: 'light',
        tokens,
        typography,
        spacing,
        radius,
        shadows,
        toggleTheme,
        setTheme: () => setMode('light'),
        isDark: false,
      }}
    >
      {children}
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

