import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, useLocation } from '@/core/navigation';
// The real shell helpers, and with them the real feature modules' routes.
import { consoleHasOwnChrome, pageTransitionKey } from '@/App';
import { CanonicalPath } from './Router';

/** Stands in for RouterShell: records every path the shell would pick its chrome from. */
function shellProbe(seen: string[]) {
  return function ShellProbe() {
    const location = useLocation();
    seen.push(location.pathname);
    return <output data-testid="shell">{location.pathname}</output>;
  };
}

async function shellPathsFor(url: string): Promise<string[]> {
  const seen: string[] = [];
  const Shell = shellProbe(seen);
  window.history.replaceState({}, '', url);
  render(<BrowserRouter><CanonicalPath><Shell /></CanonicalPath></BrowserRouter>);
  await screen.findByTestId('shell');
  return seen;
}

describe('the app shell never renders a non-canonical path', () => {
  it.each([
    ['/ADMIN/', '/admin'],
    ['/Admin//', '/admin'],
    ['/admin/', '/admin'],
  ])('%s reaches the shell only as %s, so the admin console keeps its own chrome', async (url, canonical) => {
    const seen = await shellPathsFor(url);
    expect(new Set(seen)).toEqual(new Set([canonical]));
    // Decided from the path alone (no staff role), as the console chrome is for /admin.
    expect(seen.map((path) => consoleHasOwnChrome(path, null))).not.toContain(false);
    expect(new Set(seen.map((path) => pageTransitionKey(path)))).toEqual(new Set(['admin']));
  });

  it('would otherwise have drawn the wrong chrome for the raw spelling', () => {
    // What RouterShell decided before CanonicalPath: no console chrome, a fresh page key.
    expect(consoleHasOwnChrome('/ADMIN/', null)).toBe(false);
    expect(pageTransitionKey('/ADMIN/')).not.toBe('admin');
  });

  it('reaches the shell with a newsroom slug as typed', async () => {
    expect(new Set(await shellPathsFor('/Blog/Exam-Stress/'))).toEqual(new Set(['/blog/Exam-Stress']));
  });
});
