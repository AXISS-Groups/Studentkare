import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
// The library ships untranspiled native source; the shell is not rendered here.
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
vi.mock('@/design-system/motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/design-system/motion')>()), useReducedMotion: () => true }));

import { STUDENT_TABS, StudentTabBar } from '../StudentTabBar';
import { destinationsFor } from '../homeDestinations';
import { LanguageProvider, translate } from '@/i18n';

afterEach(cleanup);

const app = readFileSync(resolve(process.cwd(), 'src/native/App.tsx'), 'utf8');
const screens = new Set([...app.matchAll(/<Stack\.Screen name="([A-Za-z]+)"/g)].map((m) => m[1]));
const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'design/icons/icon-manifest.json'), 'utf8')) as { icons: { name: string }[] };
const iconNames = new Set(manifest.icons.map((i) => i.name));

function renderBar(currentRoute: string, navigate = vi.fn()) {
  render(
    <LanguageProvider>
      <StudentTabBar currentRoute={currentRoute} navigate={navigate} />
    </LanguageProvider>,
  );
  return navigate;
}

describe('student tab bar destinations', () => {
  it('has five tabs, each a registered native screen', () => {
    expect(STUDENT_TABS).toHaveLength(5);
    for (const tab of STUDENT_TABS) expect(screens.has(tab.route), tab.route).toBe(true);
  });

  it('only uses icons from the icon manifest', () => {
    for (const tab of STUDENT_TABS) expect(iconNames.has(tab.icon), tab.icon).toBe(true);
  });

  it('every tab beyond Home is a student destination on the home list', () => {
    const student = new Set(destinationsFor('STUDENT').map((d) => d.route));
    for (const tab of STUDENT_TABS.filter((t) => t.route !== 'Home')) expect(student.has(tab.route as never), tab.route).toBe(true);
  });

  it.each(['en', 'te', 'hi'] as const)('%s: the list name and every tab label have copy', (lang) => {
    expect(translate(lang, 'tabbar.label')).toMatch(/\S/);
    for (const tab of STUDENT_TABS) expect(translate(lang, tab.label), tab.label).toMatch(/\S/);
  });
});

describe('StudentTabBar', () => {
  it('names each tab from the i18n catalogue and marks the current route selected', () => {
    renderBar('Vault');
    expect(screen.getByRole('tablist', { name: translate('en', 'tabbar.label') })).toBeInTheDocument();
    for (const tab of STUDENT_TABS) {
      const el = screen.getByRole('tab', { name: translate('en', tab.label) });
      expect(el).toHaveAttribute('aria-selected', tab.route === 'Vault' ? 'true' : 'false');
    }
  });

  it('navigates to the pressed tab’s route', () => {
    const navigate = renderBar('Home');
    fireEvent.click(screen.getByRole('tab', { name: translate('en', 'tabbar.ayush') }));
    fireEvent.click(screen.getByRole('tab', { name: translate('en', 'tabbar.appointments') }));
    expect(navigate.mock.calls).toEqual([['AiChat'], ['Appointments']]);
  });

  it('is not drawn over a screen opened from a tab', () => {
    renderBar('Checkout');
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('is wired as the layout of the signed-in student stack only', () => {
    expect(app).toMatch(/const isStudent = signedIn && session\.user\?\.role === 'STUDENT'/);
    expect(app).toMatch(/layout=\{isStudent \? \(\{ state, navigation, children \}\) => \(\s*<StudentShell/);
  });
});
