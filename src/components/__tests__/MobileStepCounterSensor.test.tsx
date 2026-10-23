import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

import { MobileStepCounterSensor } from '../MobileStepCounterSensor';
import { ThemeProvider } from '../../theme/tokens/theme';
import { LanguageProvider, translate } from '../../i18n';
import type { ActivityTrends } from '../../features/steps/data/stepsApi';

const noRead = () => Promise.reject(new Error('offline'));

function week(steps: number | null, source?: string): ActivityTrends {
  const metric = { unit: 'steps', total: steps, dailyAverage: steps, daysWithData: steps === null ? 0 : 1 };
  return {
    period: 'this_week', timezone: 'Asia/Kolkata', from: '2026-10-19', to: '2026-10-21', daysInPeriod: 3,
    metrics: { steps: metric },
    days: steps === null ? [] : [{ date: '2026-10-21', steps, distanceKm: null, floors: null, activeEnergyKcal: null, standingMinutes: null,
      sources: source ? { steps: source as 'HEALTHKIT' } : {} }],
  };
}

function renderCard(read: () => Promise<ActivityTrends> = noRead) {
  return render(<ThemeProvider><MobileStepCounterSensor read={read} /></ThemeProvider>);
}

describe('MobileStepCounterSensor', () => {
  it('says no step source is connected instead of showing a step count', () => {
    renderCard();
    expect(screen.getByText(translate('en', 'wellness.stepCounter.notConnectedTitle'))).toBeTruthy();
    expect(screen.getByText(/Nothing here is estimated/)).toBeTruthy();
    expect(screen.queryByText(/7,?420/)).toBeNull();
    expect(screen.queryByText(/\bkm\b/)).toBeNull();
  });

  it('does not claim a sensor is running or offer to sync invented steps', () => {
    renderCard();
    expect(screen.queryByText(/accelerometer active/i)).toBeNull();
    expect(screen.queryByText(/sync steps/i)).toBeNull();
    expect(screen.queryByText(/pause/i)).toBeNull();
  });

  it('never makes up steps over time', () => {
    vi.useFakeTimers();
    try {
      const { container } = renderCard();
      const before = container.textContent;
      act(() => { vi.advanceTimersByTime(10_000); });
      expect(container.textContent).toBe(before);
      expect(container.textContent ?? '').not.toMatch(/\d/);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['HEALTHKIT', 'steps.source.HEALTHKIT'],
    ['HEALTH_CONNECT', 'steps.source.HEALTH_CONNECT'],
    ['PHONE_MOTION', 'steps.source.PHONE_MOTION'],
    ['MANUAL', 'steps.source.MANUAL'],
  ] as const)('shows the server\'s steps for today with their real source (%s)', async (source, key) => {
    renderCard(() => Promise.resolve(week(6512, source)));
    expect(await screen.findByText(translate('en', 'steps.profile.today', { count: '6,512' }))).toBeTruthy();
    expect(screen.getByText(translate('en', key))).toBeTruthy();
    expect(screen.queryByText(translate('en', 'wellness.stepCounter.notConnectedTitle'))).toBeNull();
  });

  it('says not connected when the server has no steps for today', async () => {
    const read = vi.fn(() => Promise.resolve(week(null)));
    renderCard(read);
    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(screen.getByText(translate('en', 'wellness.stepCounter.notConnectedTitle'))).toBeTruthy();
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('takes its copy from the i18n catalogue', () => {
    render(<LanguageProvider initial="te"><ThemeProvider><MobileStepCounterSensor read={noRead} /></ThemeProvider></LanguageProvider>);
    expect(screen.getByText(translate('te', 'wellness.stepCounter.title'))).toBeTruthy();
    expect(screen.getByText(translate('te', 'wellness.stepCounter.notConnectedTitle'))).toBeTruthy();
    expect(screen.queryByText(translate('en', 'wellness.stepCounter.title'))).toBeNull();
  });
});
