import { describe, expect, it } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MedicalIncidentScreen } from '../MedicalIncidentScreen';
import { axeViolations } from '@/test/axe';

describe('MedicalIncidentScreen', () => {
  it('shows the call links and first steps with when to call 112', async () => {
    const { container } = render(<MedicalIncidentScreen />);
    expect(screen.getByText(/can’t alert anyone or send help/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Allergic reaction' }));
    expect(screen.getByText(/adrenaline auto-injector/)).toBeTruthy();
    expect(screen.getByText(/even if you feel better after the injection/)).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });
});
