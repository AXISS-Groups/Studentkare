import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
// The library ships untranspiled native source; the shell is not rendered here.
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
vi.mock('@/design-system/motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/design-system/motion')>()), useReducedMotion: () => true }));

import { STUDENT_NAV, StudentTabBar, studentNavKeyFor } from '../StudentTabBar';
import { PILL_NAV } from '@/design-system/m2';
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

describe('student pill nav destinations (Mobile 2.0)', () => {
  it('has five destinations, each a registered native screen', () => {
    expect(Object.keys(STUDENT_NAV)).toEqual(['home', 'orders', 'ayush', 'health', 'profile']);
    for (const route of Object.values(STUDENT_NAV)) expect(screens.has(route), route).toBe(true);
    for (const store of ['Medicines', 'Labs', 'Consults']) expect(screens.has(store), store).toBe(true);
  });

  it('only uses icons from the icon manifest', () => {
    for (const item of PILL_NAV) expect(iconNames.has(item.icon), item.icon).toBe(true);
  });

  it('shows Home current on the store boards, and nothing on other screens', () => {
    expect(studentNavKeyFor('Home')).toBe('home');
    expect(studentNavKeyFor('Labs')).toBe('home');
    expect(studentNavKeyFor('Vaccines')).toBe('home');
    expect(studentNavKeyFor('Insights')).toBe('health');
    expect(studentNavKeyFor('Trends')).toBe('health');
    expect(studentNavKeyFor('MedicineReminders')).toBe('health');
    expect(studentNavKeyFor('Water')).toBe('health');
    expect(studentNavKeyFor('ReportUpload')).toBe('health');
    expect(studentNavKeyFor('Profile')).toBe('profile');
    expect(studentNavKeyFor('Product')).toBeNull();
    expect(studentNavKeyFor('Checkout')).toBeNull();
  });

  it.each(['en', 'te', 'hi'] as const)('%s: the nav name and every destination have copy', (lang) => {
    expect(translate(lang, 'm2.nav.label')).toMatch(/\S/);
    for (const item of PILL_NAV) expect(translate(lang, item.label), item.label).toMatch(/\S/);
  });
});

describe('StudentTabBar (the pill nav)', () => {
  it('names each destination from the i18n catalogue and marks the current route', () => {
    renderBar('Insights');
    expect(screen.getByRole('navigation', { name: translate('en', 'm2.nav.label') })).toBeInTheDocument();
    for (const item of PILL_NAV) {
      const el = screen.getByRole('link', { name: translate('en', item.label) });
      if (item.key === 'health') expect(el).toHaveAttribute('aria-current', 'page');
      else expect(el).not.toHaveAttribute('aria-current');
    }
  });

  it('navigates to the pressed destination’s route; Home from a store board goes Home', () => {
    const navigate = renderBar('Labs');
    fireEvent.click(screen.getByRole('link', { name: translate('en', 'm2.nav.ayush') }));
    fireEvent.click(screen.getByRole('link', { name: translate('en', 'm2.nav.health') }));
    fireEvent.click(screen.getByRole('link', { name: translate('en', 'm2.nav.home') }));
    expect(navigate.mock.calls).toEqual([['AiChat'], ['Insights'], ['Home']]);
  });

  it('is not drawn over a screen opened from a destination', () => {
    renderBar('Checkout');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('is wired as the layout of the signed-in student stack only', () => {
    expect(app).toMatch(/const isStudent = signedIn && session\.user\?\.role === 'STUDENT'/);
    expect(app).toMatch(/layout=\{isStudent \? \(\{ state, navigation, children \}\) => \(\s*<StudentShell/);
  });
});
