import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TeleconsultNativeView } from '../TeleconsultNativeView';

describe('TeleconsultNativeView', () => {
  it('says video consults are unavailable and offers booking instead, with no call controls', () => {
    const bookAppointment = vi.fn();
    render(<TeleconsultNativeView links={{ bookAppointment }} />);
    expect(screen.getByText('Not available yet')).toBeInTheDocument();
    expect(screen.queryByText(/Start Video Call|LIVE|Camera/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Book an appointment' }));
    expect(bookAppointment).toHaveBeenCalled();
  });
});
