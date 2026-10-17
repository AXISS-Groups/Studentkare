import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DoctorSpecialistReferralScreen } from '../DoctorSpecialistReferralScreen';
import { DoctorScheduleScreen } from '../DoctorScheduleScreen';

/**
 * None of these screens has a backend. Each used to flash a success message
 * ("Referral Dispatched to Patient Vault!", "published to student booking
 * system!") while sending nothing. Lab orders are now connected — see
 * DoctorLabOrderDispatchScreen.test.tsx.
 */
describe('clinician actions with no backend', () => {
  it('a referral cannot be "sent" and the screen says so', () => {
    render(<DoctorSpecialistReferralScreen />);
    expect(screen.getByRole('button', { name: /send referral note/i })).toBeDisabled();
    expect(screen.queryByText(/dispatched/i)).toBeNull();
    expect(screen.getByText(/isn’t connected yet/i)).toBeInTheDocument();
  });

  it('the schedule does not claim to publish, and shows no invented fee', () => {
    render(<DoctorScheduleScreen />);
    expect(screen.getByRole('button', { name: /save availability/i })).toBeDisabled();
    expect(screen.queryByText(/published/i)).toBeNull();
    expect(screen.getByLabelText(/OPD consultation fee/i)).toHaveValue(0);
  });
});
