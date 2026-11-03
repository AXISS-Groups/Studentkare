import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from '@/core/navigation';
import { PageTransition } from '@/components/interface/PageTransition';
import { getModules } from '@/core/routing/registry';
import { pageTransitionKey } from '../App';

/** The student shell: its own state (an open menu, say) is lost only if it remounts. */
function StudentShell({ children }: { children: React.ReactNode }) {
  const [menuOpens, setMenuOpens] = useState(0);
  return (
    <section aria-label="student shell">
      <button onClick={() => setMenuOpens((n) => n + 1)}>Menu opened {menuOpens}</button>
      {children}
    </section>
  );
}

/** Stands in for WorkspaceRouteScreen: one component for every workspace route, the page picked by path. */
function WorkspacePage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <StudentShell>
      <h1>{pathname === '/health' ? 'Health page' : 'Records page'}</h1>
      <button onClick={() => navigate('/records')}>Open records</button>
    </StudentShell>
  );
}

/** RouterShell's structure: the routes inside a PageTransition keyed by pageTransitionKey. */
function AppShell({ role }: { role: string | null }) {
  const { pathname } = useLocation();
  return (
    <PageTransition key={pageTransitionKey(pathname, role)}>
      <Routes>
        <Route path="/health" element={<WorkspacePage />} />
        <Route path="/records" element={<WorkspacePage />} />
      </Routes>
    </PageTransition>
  );
}

async function navigateHealthToRecords(role: string | null) {
  window.history.replaceState({}, '', '/health');
  render(<BrowserRouter><AppShell role={role} /></BrowserRouter>);
  const shellBefore = screen.getByRole('region', { name: 'student shell' });
  expect(screen.getByRole('heading')).toHaveTextContent('Health page');
  await act(async () => { screen.getByRole('button', { name: /Menu opened/ }).click(); });
  await act(async () => { screen.getByRole('button', { name: 'Open records' }).click(); });
  return { shellBefore, shellAfter: screen.getByRole('region', { name: 'student shell' }) };
}

describe('student shell across workspace navigation', () => {
  it('stays mounted from /health to /records while the page content changes', async () => {
    const { shellBefore, shellAfter } = await navigateHealthToRecords('STUDENT');
    expect(screen.getByRole('heading')).toHaveTextContent('Records page');
    expect(shellAfter).toBe(shellBefore);
    expect(screen.getByRole('button', { name: /Menu opened/ })).toHaveTextContent('Menu opened 1');
  });

  it('is rebuilt for a visitor without the student key, as before', async () => {
    const { shellBefore, shellAfter } = await navigateHealthToRecords(null);
    expect(screen.getByRole('heading')).toHaveTextContent('Records page');
    expect(shellAfter).not.toBe(shellBefore);
    expect(screen.getByRole('button', { name: /Menu opened/ })).toHaveTextContent('Menu opened 0');
  });

  it('relies on the real workspace routes rendering one component', () => {
    const health = getModules().find((module) => module.id === 'health');
    const load = (path: string) => health?.routes.find((route) => route.path === path)?.load;
    expect(load('/health')).toBeDefined();
    expect(load('/records')).toBe(load('/health'));
  });
});
