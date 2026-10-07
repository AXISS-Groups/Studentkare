import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BodyMetricsCalculator } from '../BodyMetricsCalculator';
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
    expect(screen.getByText(/Optimal healthy range \(ICMR Asia-Pacific\)/i)).toBeInTheDocument();
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

    // 80 / (1.75^2) = 26.1 -> Obese per ICMR
    expect(screen.getByText(/26.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Elevated cardiometabolic risk \(Obese\)/i)).toBeInTheDocument();
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
});
