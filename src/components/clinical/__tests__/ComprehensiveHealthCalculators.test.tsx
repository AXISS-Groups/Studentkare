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
    expect(screen.getAllByText(/ASTHENOPIA RISK INDEX/i)[0]).toBeInTheDocument();

    // Switch to Hydration
    fireEvent.click(screen.getByText(/Hydration/i));
    expect(screen.getAllByText(/RECOMMENDED DAILY FLUID/i)[0]).toBeInTheDocument();
  });
});
