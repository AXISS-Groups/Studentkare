import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { MobileStepCounterSensor } from '../MobileStepCounterSensor';
import { ThemeProvider } from '../../theme/tokens/theme';
import { LanguageProvider, translate } from '../../i18n';

function renderCard() {
  return render(<ThemeProvider><MobileStepCounterSensor /></ThemeProvider>);
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

  it('takes its copy from the i18n catalogue', () => {
    render(<LanguageProvider initial="te"><ThemeProvider><MobileStepCounterSensor /></ThemeProvider></LanguageProvider>);
    expect(screen.getByText(translate('te', 'wellness.stepCounter.title'))).toBeTruthy();
    expect(screen.getByText(translate('te', 'wellness.stepCounter.notConnectedTitle'))).toBeTruthy();
    expect(screen.queryByText(translate('en', 'wellness.stepCounter.title'))).toBeNull();
  });
});
