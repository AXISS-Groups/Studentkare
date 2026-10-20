import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StaffCampFastScreen } from '../staff/StaffCampFastScreen';

describe('StaffCampFast — the staff app’s camp fast mode', () => {
  it('is honest that nothing is connected: no counts, no sample students, no working scan', () => {
    render(<StaffCampFastScreen onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Camp fast mode' })).toBeInTheDocument();
    expect(screen.getByText('No camp is connected to this device')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Not connected');
    expect(screen.getByRole('button', { name: 'Scan + match next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stop one' })).toBeDisabled();
    expect(screen.getByText('No check-ins on this device.')).toBeInTheDocument();
    for (const fake of [/212/, /Imran S/, /Ayesha/, /C-113/, /Matched/, /Works without signal/]) expect(screen.queryByText(fake)).toBeNull();
  });

  it('goes back to camp intake, and offers Verify student instead', () => {
    const onNavigate = vi.fn();
    render(<StaffCampFastScreen onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to camp intake' }));
    expect(onNavigate).toHaveBeenCalledWith('camp-intake');
    fireEvent.click(screen.getByRole('button', { name: 'Open Verify student' }));
    expect(onNavigate).toHaveBeenCalledWith('scan-verify');
  });
});
