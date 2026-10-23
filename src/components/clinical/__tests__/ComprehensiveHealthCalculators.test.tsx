import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComprehensiveHealthCalculators } from '../ComprehensiveHealthCalculators';
import { ThemeProvider } from '../../../theme/tokens/theme';

describe('ComprehensiveHealthCalculators Component Suite', () => {
  it('renders and switches between all tabs properly', () => {
    render(
      <ThemeProvider>
        <ComprehensiveHealthCalculators />
      </ThemeProvider>
    );

    // Initial Body & BMI tab
    expect(screen.getByText(/Body & BMI/i)).toBeInTheDocument();
    expect(screen.getByText(/BODY MASS INDEX \(BMI\)/i)).toBeInTheDocument();

    // Switch to Sleep & Recovery
    fireEvent.click(screen.getByText(/Sleep & Recovery/i));
    expect(screen.getAllByText(/SLEEP EFFICIENCY/i)[0]).toBeInTheDocument();

    // Switch to Cardio & Vitals
    fireEvent.click(screen.getByText(/Cardio & Vitals/i));
    expect(screen.getAllByText(/MEAN ARTERIAL PRESSURE/i)[0]).toBeInTheDocument();

    // Switch to Vision & Screen
    fireEvent.click(screen.getByText(/Vision & Screen/i));
    expect(screen.getAllByText(/EYE STRAIN CHECK/i)[0]).toBeInTheDocument();

    // Switch to Hydration
    fireEvent.click(screen.getByText(/Hydration/i));
    expect(screen.getAllByText(/ESTIMATED DAILY FLUID/i)[0]).toBeInTheDocument();
  });

  it('never labels a single blood-pressure reading as a diagnosis', () => {
    render(<ThemeProvider><ComprehensiveHealthCalculators /></ThemeProvider>);
    fireEvent.click(screen.getByText(/Cardio & Vitals/i));
    fireEvent.change(screen.getByLabelText(/Systolic blood pressure/i), { target: { value: '150' } });
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/Well above the usual range/);
    expect(text).not.toMatch(/hypertension|stage 2/i);
    expect(text).toMatch(/call 112/i);
  });

  it('makes no ICMR attribution it cannot back', () => {
    render(<ThemeProvider><ComprehensiveHealthCalculators /></ThemeProvider>);
    fireEvent.click(screen.getByText(/Hydration/i));
    expect(document.body.textContent).not.toMatch(/ICMR/);
  });
});
