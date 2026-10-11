import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BodyMetricsCalculator, bmiBadgeVariant } from '../BodyMetricsCalculator';
import { ThemeProvider } from '../../../theme/tokens/theme';

describe('BodyMetricsCalculator Component', () => {
  it('renders initial BMI and healthy weight window properly', () => {
    const onCalculate = vi.fn();
    render(
      <ThemeProvider>
        <BodyMetricsCalculator
          initialHeightCm={175}
          initialWeightKg={65}
          onMetricsCalculated={onCalculate}
        />
      </ThemeProvider>
    );

    expect(screen.getByText(/BODY MASS INDEX \(BMI\)/i)).toBeInTheDocument();
    expect(screen.getByText(/21.2/i)).toBeInTheDocument();
    expect(screen.getByText('In the usual range')).toBeInTheDocument();
    expect(screen.getByText(/56.7 – 70.1 kg/i)).toBeInTheDocument();
  });

  it('updates BMI reactively when weight input changes', () => {
    render(
      <ThemeProvider>
        <BodyMetricsCalculator
          initialHeightCm={175}
          initialWeightKg={65}
        />
      </ThemeProvider>
    );

    const weightInput = screen.getByLabelText(/Weight in kilograms/i);
    fireEvent.change(weightInput, { target: { value: '80' } });

    // 80 / (1.75^2) = 26.1 -> the top Asian BMI band, described as a range, not a diagnosis
    expect(screen.getByText(/26.1/i)).toBeInTheDocument();
    expect(screen.getByText('Well above the usual range')).toBeInTheDocument();
  });

  it('fails closed and displays warning on invalid physiological values', () => {
    render(
      <ThemeProvider>
        <BodyMetricsCalculator
          initialHeightCm={175}
          initialWeightKg={65}
        />
      </ThemeProvider>
    );

    const weightInput = screen.getByLabelText(/Weight in kilograms/i);
    fireEvent.change(weightInput, { target: { value: '10' } }); // below 20kg threshold

    expect(screen.getByText(/Weight must be between 20 kg and 300 kg/i)).toBeInTheDocument();
  });

  it('never shows a body metric in the emergency (red) tone', () => {
    for (const category of ['underweight', 'healthy', 'overweight', 'obese', undefined]) {
      expect(bmiBadgeVariant(category)).not.toBe('emergency');
    }
    expect(bmiBadgeVariant('obese')).toBe('attention');
  });

  it('describes a BMI band without diagnostic labels', () => {
    render(<ThemeProvider><BodyMetricsCalculator initialHeightCm={175} initialWeightKg={95} /></ThemeProvider>);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/obese|hypertension|cardiometabolic|clinical report|ideal body weight|dosing/i);
    expect(text).toMatch(/not a diagnosis/i);
  });

  it('makes no compliance claim', () => {
    render(<ThemeProvider><BodyMetricsCalculator initialHeightCm={175} initialWeightKg={65} /></ThemeProvider>);
    expect(screen.queryByText(/compliant/i)).toBeNull();
  });
});
