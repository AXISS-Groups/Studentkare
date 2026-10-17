import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { skTokens } from '../generated/skTokens';
import { cssVarName } from '@/design-system/theme';
import { ThemeProvider, useTheme } from '../theme';
import { AppearanceSetting } from '@/components/interface/AppearanceSetting';

const css = readFileSync(resolve(process.cwd(), 'src/theme/tokens/generated/sk-tokens.css'), 'utf8');
const block = (selector: string) => css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));

describe('design-system colours are CSS variables defined in both themes', () => {
  it.each(Object.keys(skTokens.color.light))('%s', (key) => {
    const name = cssVarName(key);
    expect(block(':root {'), `${name} in light`).toContain(`${name}:`);
    expect(block(':root[data-theme="dark"]'), `${name} in dark`).toContain(`${name}:`);
  });
});

function mockSystemDark(dark: boolean) {
  const listeners: (() => void)[] = [];
  const query = { matches: dark, addEventListener: (_: string, l: () => void) => listeners.push(l), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', vi.fn(() => query));
  return { flip(next: boolean) { query.matches = next; listeners.forEach((l) => l()); } };
}

function Probe() {
  const { mode, preference } = useTheme();
  return <p>{`${preference}:${mode}`}</p>;
}

const store = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear() });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear() });
  store.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider preference', () => {
  it('defaults to light and sets data-theme', () => {
    mockSystemDark(true);
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByText('light:light')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('follows the device live when set to system', () => {
    const system = mockSystemDark(false);
    render(<ThemeProvider><AppearanceSetting /><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByRole('radio', { name: 'Match my device' }));
    expect(screen.getByText('system:light')).toBeInTheDocument();
    act(() => system.flip(true));
    expect(screen.getByText('system:dark')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(store.get('sa_care_theme')).toBe('system');
  });

  it('keeps an explicit choice regardless of the device', () => {
    mockSystemDark(true);
    render(<ThemeProvider><AppearanceSetting /><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByText('dark:dark')).toBeInTheDocument();
  });
});
